import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageHeader } from '@/components/layout/PageHeader';
import { CustomerStrip } from '@/components/billing/CustomerStrip';
import { GameTabs } from '@/components/billing/GameTabs';
import { BillSummary } from '@/components/billing/BillSummary';
import { Customer, BillItem, Product } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PRICING_CONFIG, GamePricingConfig, normalizePricingConfig } from '@/lib/pricing';

const initialCustomers: Customer[] = [
  { id: 'CUS-1042', name: 'Arjun', phone: '9876543210', whatsapp_number: '9876543210', loyalty_points: 145, created_at: new Date().toISOString() },
  { id: 'CUS-1043', name: 'Priya', phone: '9888877777', whatsapp_number: '9888877777', loyalty_points: 40, created_at: new Date().toISOString() },
  { id: 'CUS-1044', name: 'Karan', phone: '9811112222', whatsapp_number: '9811112222', loyalty_points: 0, created_at: new Date().toISOString() },
];

const initialProducts: Product[] = [
  { id: 'PRD-001', name: 'Red Bull', category: 'Drinks', mrp: 60, stock_quantity: 15, low_stock_threshold: 5 },
  { id: 'PRD-002', name: 'Coca Cola', category: 'Drinks', mrp: 40, stock_quantity: 24, low_stock_threshold: 6 },
  { id: 'PRD-003', name: 'Monster Energy', category: 'Drinks', mrp: 110, stock_quantity: 10, low_stock_threshold: 4 },
  { id: 'PRD-004', name: 'Lays Classic', category: 'Snacks', mrp: 30, stock_quantity: 20, low_stock_threshold: 5 },
  { id: 'PRD-005', name: 'Doritos Cheese', category: 'Snacks', mrp: 45, stock_quantity: 12, low_stock_threshold: 5 },
  { id: 'PRD-006', name: 'Kurkure Masala', category: 'Snacks', mrp: 20, stock_quantity: 30, low_stock_threshold: 10 },
  { id: 'PRD-007', name: 'Cold Coffee', category: 'Drinks', mrp: 80, stock_quantity: 8, low_stock_threshold: 3 },
  { id: 'PRD-008', name: 'Water Bottle', category: 'Drinks', mrp: 20, stock_quantity: 50, low_stock_threshold: 10 },
];

const loyaltySettings = {
  earn_rate_points: 5,
  earn_rate_minutes: 30,
  redeem_rate_points: 70,
  redeem_rate_minutes: 60,
};

export default function BillingPage({
  onNavigate,
  onLogout,
}: {
  onNavigate?: (next: 'billing' | 'bookings' | 'settings' | 'inventory') => void;
  onLogout?: () => void;
}) {
  useEffect(() => {
    document.title = 'Billing · Goat Gaming';
  }, []);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [pricingConfig, setPricingConfig] = useState<GamePricingConfig>(DEFAULT_PRICING_CONFIG);

  useEffect(() => {
    const loadData = async () => {
      // Load Pricing
      const { data: pricingData } = await supabase.from('pricing_settings').select('config').eq('id', 1).maybeSingle();
      if (pricingData?.config) {
        setPricingConfig(normalizePricingConfig(pricingData.config));
      }

      // Load Products
      const { data: productData } = await supabase.from('products').select('*').order('name');
      if (productData && productData.length > 0) {
        setProducts(productData);
      }
    };
    loadData();
  }, []);

  const addItem = (item: Omit<BillItem, 'id' | 'bill_id'>) => {
    const newItem: BillItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      bill_id: 'current',
    };
    
    if (item.item_type === 'product') {
      setBillItems((prev) => {
        const existing = prev.find((i) => i.item_type === 'product' && i.item_name === item.item_name);
        if (existing) {
          return prev.map((i) => i.id === existing.id 
            ? { ...i, quantity: i.quantity + item.quantity, total_price: (i.quantity + item.quantity) * i.unit_price, metadata: { ...i.metadata, ...item.metadata } }
            : i
          );
        }
        return [...prev, newItem];
      });
    } else {
      setBillItems(prev => [...prev, newItem]);
    }
  };

  const removeItem = (id: string) => {
    setBillItems(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setBillItems(prev => prev.map(i => {
      if (i.id === id && i.item_type === 'product') {
        const product = products.find(p => p.id === i.metadata?.product_id);
        const newQty = Math.max(0, i.quantity + delta);
        if (newQty === 0) return i;
        
        // Check stock if increasing
        if (delta > 0 && product && newQty > product.stock_quantity) {
          toast.error(`Only ${product.stock_quantity} units available in stock`);
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
      created_at: new Date().toISOString(),
    };
    setCustomers((prev) => [created, ...prev]);
    setSelectedCustomer(created);
    toast.success(`Customer created · ${created.id}`);
  };

  const handleFinalize = ({
    paymentMethod,
    subtotal,
    discount,
    grandTotal,
    pointsEarned,
    pointsRedeemed,
    isUnlinked,
  }: {
    paymentMethod: 'cash' | 'upi' | 'card';
    subtotal: number;
    discount: number;
    grandTotal: number;
    pointsEarned: number;
    pointsRedeemed: number;
    isUnlinked: boolean;
  }) => {
    const updateStock = async () => {
      // Group products from billItems by product_id to be safe
      const productCounts: Record<string, number> = {};
      billItems.forEach(item => {
        if (item.item_type === 'product' && item.metadata?.product_id) {
          productCounts[item.metadata.product_id] = (productCounts[item.metadata.product_id] || 0) + item.quantity;
        }
      });

      // Update each product in Supabase
      for (const [productId, usedQty] of Object.entries(productCounts)) {
        // Fetch fresh stock count from DB
        const { data: currentProduct } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', productId)
          .single();

        if (currentProduct) {
          const newStock = Math.max(0, currentProduct.stock_quantity - usedQty);
          await supabase
            .from('products')
            .update({ stock_quantity: newStock })
            .eq('id', productId);
        }
      }

      // Refresh local products list
      const { data } = await supabase.from('products').select('*').order('name');
      if (data) setProducts(data);
    };

    await updateStock();

    if (!selectedCustomer) {
      toast.error('Please select or create a customer first');
      return;
    }

    const updatedPoints = Math.max(0, selectedCustomer.loyalty_points - pointsRedeemed + pointsEarned);
    const updatedCustomer = { ...selectedCustomer, loyalty_points: updatedPoints };
    setCustomers((prev) => prev.map((c) => (c.id === selectedCustomer.id ? updatedCustomer : c)));
    setSelectedCustomer(updatedCustomer);
    
    const displayName = selectedCustomer.name || selectedCustomer.phone;
    toast.success(`Bill saved · ₹${Math.round(grandTotal)} · ${displayName}`);
    
    if (selectedCustomer?.whatsapp_number) {
      toast.info(`WhatsApp queued to ${selectedCustomer.whatsapp_number}`);
    }

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
        }}
        onLogout={onLogout}
      />
      <main className="flex-1 pb-24 md:ml-64 md:pb-0">
        {/* Header */}
        <PageHeader title="Billing" />

        {/* Customer Search Strip */}
        <CustomerStrip 
          selectedCustomer={selectedCustomer} 
          allCustomers={customers}
          onClearCustomer={() => setSelectedCustomer(null)}
          onSelectCustomer={setSelectedCustomer}
          onCreateCustomer={createCustomer}
        />

        {/* Main Billing Content */}
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-3 sm:p-4 lg:flex-row items-start">
          {/* Left: Add Items */}
          <div className="flex-1 lg:w-2/3 flex flex-col gap-4 w-full min-w-0">
            <GameTabs onAddItem={addItem} products={products} productQuantityById={productQuantityById} pricingConfig={pricingConfig} />
          </div>

          {/* Right: Bill Summary */}
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
