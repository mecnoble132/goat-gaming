import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageHeader } from '@/components/layout/PageHeader';
import { CustomerStrip } from '@/components/billing/CustomerStrip';
import { GameTabs } from '@/components/billing/GameTabs';
import { BillSummary } from '@/components/billing/BillSummary';
import { Customer, BillItem, Product } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PRICING_CONFIG, GamePricingConfig, normalizePricingConfig } from '@/lib/pricing';
import { DEFAULT_LOYALTY_SETTINGS } from '@/lib/loyalty';
import { LoyaltySettings } from '@/types';

export default function BillingPage({
  onNavigate,
  onLogout,
}: {
  onNavigate?: (next: 'billing' | 'bookings' | 'settings' | 'inventory' | 'customers' | 'reports') => void;
  onLogout?: () => void;
}) {
  useEffect(() => { document.title = 'Billing · Goat Gaming'; }, []);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [pricingConfig, setPricingConfig] = useState<GamePricingConfig>(DEFAULT_PRICING_CONFIG);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>(DEFAULT_LOYALTY_SETTINGS);

  useEffect(() => {
    const loadData = async () => {
      const { data: pricingData } = await supabase.from('pricing_settings').select('config').eq('id', 1).maybeSingle();
      if (pricingData?.config) setPricingConfig(normalizePricingConfig(pricingData.config));

      const { data: productData } = await supabase.from('products').select('*').order('name');
      if (productData && productData.length > 0) setProducts(productData);

      const { data: customerData } = await supabase.from('customers').select('*').order('name');
      if (customerData) setCustomers(customerData);

      const { data: loyaltyData } = await supabase.from('loyalty_settings').select('*').eq('id', 1).maybeSingle();
      if (loyaltyData) setLoyaltySettings(loyaltyData as LoyaltySettings);
    };
    loadData();
  }, []);

  // Handle prefill from Bookings
  useEffect(() => {
    if (customers.length > 0) {
      const raw = window.localStorage.getItem('gg_billing_prefill_v1');
      if (raw) {
        try {
          const prefill = JSON.parse(raw);
          const customer = customers.find(c => c.id === prefill.customer_id);
          if (customer) {
            setSelectedCustomer(customer);
            
            let price = 0;
            const type = prefill.game_type;
            const mins = prefill.duration_minutes;
            const ctrl = prefill.controllers || 2;
            
            if (type === 'ps5') {
              price = pricingConfig.ps5[`${ctrl}-${mins}`] || 0;
            } else if (type === 'snooker' || type === 'pool') {
              price = pricingConfig[type]?.[String(mins)] || 0;
            } else if (type === 'vr') {
              const packages = [...pricingConfig.vr_cricket, ...pricingConfig.vr_adventure];
              const match = packages.find(p => p.minutes === mins);
              price = match ? match.price : 0;
            } else if (pricingConfig[type]) {
              price = pricingConfig[type][String(mins)] || 0;
            }

            if (price > 0 || type) {
              const newItem: BillItem = {
                id: Math.random().toString(36).substr(2, 9),
                bill_id: 'current',
                item_name: `${type.toUpperCase()} - ${prefill.station_name} (${mins}m)`,
                item_type: 'session',
                quantity: 1,
                unit_price: price,
                total_price: price,
                metadata: { 
                  game_type: type, 
                  duration_minutes: mins, 
                  controllers: ctrl,
                  station_name: prefill.station_name
                }
              };
              setBillItems([newItem]);
              toast.success(`Prefilled booking for ${customer.name}`);
            }
          }
          window.localStorage.removeItem('gg_billing_prefill_v1');
        } catch (e) {
          console.error('Prefill error:', e);
        }
      }
    }
  }, [customers, pricingConfig]);

  const addItem = (item: Omit<BillItem, 'id' | 'bill_id'>) => {
    const newItem: BillItem = { ...item, id: Math.random().toString(36).substr(2, 9), bill_id: 'current' };
    if (item.item_type === 'product') {
      setBillItems((prev) => {
        const existing = prev.find((i) => i.item_type === 'product' && i.item_name === item.item_name);
        if (existing) {
          return prev.map((i) => i.id === existing.id
            ? { ...i, quantity: i.quantity + item.quantity, total_price: (i.quantity + item.quantity) * i.unit_price, metadata: { ...i.metadata, ...item.metadata } }
            : i);
        }
        return [...prev, newItem];
      });
    } else {
      setBillItems(prev => [...prev, newItem]);
    }
  };

  const removeItem = (id: string) => setBillItems(prev => prev.filter(i => i.id !== id));

  const updateQuantity = (id: string, delta: number) => {
    setBillItems(prev => prev.map(i => {
      if (i.id === id && i.item_type === 'product') {
        const product = products.find(p => p.id === i.metadata?.product_id);
        const newQty = Math.max(0, i.quantity + delta);
        if (newQty === 0) return i;
        if (delta > 0 && product && newQty > product.stock_quantity) {
          toast.error(`Only ${product.stock_quantity} units available`);
          return i;
        }
        return { ...i, quantity: newQty, total_price: newQty * i.unit_price };
      }
      return i;
    }));
  };

  const productQuantityById = billItems.reduce<Record<string, number>>((acc, item) => {
    if (item.item_type === 'product' && item.metadata?.product_id) {
      acc[item.metadata.product_id] = (acc[item.metadata.product_id] ?? 0) + item.quantity;
    }
    return acc;
  }, {});

  const createCustomer = (payload: { name?: string; phone: string; whatsapp_number?: string }) => {
    const customerId = `CUS-${1000 + customers.length + 1}`;
    const created: Customer = {
      id: customerId,
      name: payload.name || payload.phone,
      phone: payload.phone,
      whatsapp_number: payload.whatsapp_number || payload.phone,
      loyalty_points: 0,
      visits: 0,
      created_at: new Date().toISOString(),
    };
    const saveToDb = async () => {
      const { data: existing } = await supabase.from('customers').select('*').eq('phone', payload.phone).maybeSingle();
      if (existing) {
        setCustomers((prev) => prev.map(c => c.id === existing.id ? (existing as Customer) : c));
        setSelectedCustomer(existing as Customer);
        toast.success(`Welcome back, ${existing.name || existing.phone}!`);
        return;
      }
      const { error } = await supabase.from('customers').insert(created);
      if (error) { toast.error(`Failed to save new customer: ${error.message}`); return; }
      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomer(created);
      toast.success(`Customer created · ${created.id}`);
    };
    saveToDb();
  };

  const saveBillRecord = async (opts: {
    paymentMethod: string; subtotal: number; discount: number; grandTotal: number;
    pointsEarned: number; pointsRedeemed: number;
    customerId?: string; customerName?: string; customerPhone?: string;
    items: BillItem[];
  }) => {
    const billId = `BILL-${Date.now()}`;
    const { error } = await supabase.from('bills').insert({
      id: billId,
      customer_id: opts.customerId || null,
      customer_name: opts.customerName || 'Cash Customer',
      customer_phone: opts.customerPhone || null,
      payment_method: opts.paymentMethod,
      subtotal: Math.round(opts.subtotal),
      discount: Math.round(opts.discount),
      grand_total: Math.round(opts.grandTotal),
      points_earned: opts.pointsEarned,
      points_redeemed: opts.pointsRedeemed,
      items: opts.items,
      created_at: new Date().toISOString(),
    });
    if (error) console.error('Bill record save failed:', error.message);
  };

  const handleFinalize = async ({
    paymentMethod, subtotal, discount, grandTotal, pointsEarned, pointsRedeemed, isUnlinked,
  }: {
    paymentMethod: 'cash' | 'upi' | 'card';
    subtotal: number; discount: number; grandTotal: number;
    pointsEarned: number; pointsRedeemed: number; isUnlinked: boolean;
  }) => {
    // --- Update Stock ---
    const productCounts: Record<string, number> = {};
    billItems.forEach(item => {
      if (item.item_type === 'product' && item.metadata?.product_id) {
        productCounts[item.metadata.product_id] = (productCounts[item.metadata.product_id] || 0) + item.quantity;
      }
    });
    for (const [productId, usedQty] of Object.entries(productCounts)) {
      const { data: cur, error: fe } = await supabase.from('products').select('stock_quantity').eq('id', productId).single();
      if (fe) { toast.error(`Stock fetch failed for ${productId}`); continue; }
      if (cur) {
        const { error: ue } = await supabase.from('products').update({ stock_quantity: Math.max(0, cur.stock_quantity - usedQty) }).eq('id', productId);
        if (ue) toast.error(`Stock update failed: ${ue.message}`);
      }
    }
    const { data: freshProducts } = await supabase.from('products').select('*').order('name');
    if (freshProducts) setProducts(freshProducts);

    // --- Unlinked bill ---
    if (!selectedCustomer) {
      if (isUnlinked) {
        await saveBillRecord({ paymentMethod, subtotal, discount, grandTotal, pointsEarned: 0, pointsRedeemed: 0, items: billItems });
        toast.success(`Bill finalized · ₹${Math.round(grandTotal)} · Cash Customer`);
        setBillItems([]);
        return;
      }
      toast.error('Please select or create a customer first');
      return;
    }

    // --- Update customer ---
    const updatedPoints = Math.max(0, selectedCustomer.loyalty_points - pointsRedeemed + pointsEarned);
    const updatedVisits = (selectedCustomer.visits || 0) + 1;

    const { error: customerError } = await supabase
      .from('customers')
      .update({ loyalty_points: updatedPoints, visits: updatedVisits })
      .eq('id', selectedCustomer.id);
    if (customerError) { toast.error('Failed to update customer stats'); return; }

    // --- Save bill record ---
    await saveBillRecord({
      paymentMethod, subtotal, discount, grandTotal, pointsEarned, pointsRedeemed,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      items: billItems,
    });

    const updatedCustomer = { ...selectedCustomer, loyalty_points: updatedPoints, visits: updatedVisits };
    setCustomers((prev) => prev.map((c) => (c.id === selectedCustomer.id ? updatedCustomer : c)));
    setSelectedCustomer(updatedCustomer);

    toast.success(`Bill saved · ₹${Math.round(grandTotal)} · ${selectedCustomer.name || selectedCustomer.phone}`);
    if (selectedCustomer?.whatsapp_number) toast.info(`WhatsApp queued to ${selectedCustomer.whatsapp_number}`);

    setBillItems([]);
    setSelectedCustomer(null);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        active="Billing"
        onNavigate={(label) => {
          if (label === 'Bookings') onNavigate?.('bookings');
          else if (label === 'Settings') onNavigate?.('settings');
          else if (label === 'Inventory') onNavigate?.('inventory');
          else if (label === 'Customers') onNavigate?.('customers');
          else if (label === 'Reports') onNavigate?.('reports');
        }}
        onLogout={onLogout}
      />
      <main className="flex-1 pb-24 md:ml-64 md:pb-0 overflow-x-hidden">
        <PageHeader title="Billing" />
        <CustomerStrip
          selectedCustomer={selectedCustomer}
          allCustomers={customers}
          onClearCustomer={() => setSelectedCustomer(null)}
          onSelectCustomer={setSelectedCustomer}
          onCreateCustomer={createCustomer}
        />
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-3 sm:p-4 lg:flex-row items-start">
          <div className="flex-1 lg:w-2/3 flex flex-col gap-4 w-full min-w-0">
            <GameTabs onAddItem={addItem} products={products} productQuantityById={productQuantityById} pricingConfig={pricingConfig} />
          </div>
          <div className="w-full lg:w-1/3 lg:min-w-[380px] lg:sticky lg:top-20">
            <BillSummary
              items={billItems}
              customer={selectedCustomer}
              loyaltySettings={loyaltySettings}
              onRemoveItem={removeItem}
              onUpdateQuantity={updateQuantity}
              onFinalize={handleFinalize}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
