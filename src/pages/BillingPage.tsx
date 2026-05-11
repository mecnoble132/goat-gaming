import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { CustomerStrip } from '@/components/billing/CustomerStrip';
import { GameTabs } from '@/components/billing/GameTabs';
import { BillSummary } from '@/components/billing/BillSummary';
import { Customer, BillItem, Product } from '@/types';
import { 
  Bell, 
  HelpCircle, 
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PRICING_CONFIG, GamePricingConfig, normalizePricingConfig } from '@/lib/pricing';

const initialCustomers: Customer[] = [
  { id: 'CUS-1042', name: 'Arjun', phone: '9876543210', whatsapp_number: '9876543210', loyalty_points: 145, created_at: new Date().toISOString() },
  { id: 'CUS-1043', name: 'Priya', phone: '9888877777', whatsapp_number: '9888877777', loyalty_points: 40, created_at: new Date().toISOString() },
  { id: 'CUS-1044', name: 'Karan', phone: '9811112222', whatsapp_number: '9811112222', loyalty_points: 0, created_at: new Date().toISOString() },
];

const initialProducts: Product[] = [
  { id: 'P-1', name: 'Red Bull', category: 'Drinks', mrp: 60, stock_quantity: 12, low_stock_threshold: 4 },
  { id: 'P-2', name: 'Coke', category: 'Drinks', mrp: 40, stock_quantity: 20, low_stock_threshold: 5 },
  { id: 'P-3', name: 'Water Bottle', category: 'Drinks', mrp: 20, stock_quantity: 35, low_stock_threshold: 8 },
  { id: 'P-4', name: 'Doritos', category: 'Snacks', mrp: 40, stock_quantity: 6, low_stock_threshold: 4 },
  { id: 'P-5', name: 'Lays', category: 'Snacks', mrp: 30, stock_quantity: 0, low_stock_threshold: 4 },
  { id: 'P-6', name: 'Cold Coffee', category: 'Drinks', mrp: 80, stock_quantity: 7, low_stock_threshold: 4 },
  { id: 'P-7', name: 'Monster', category: 'Drinks', mrp: 110, stock_quantity: 5, low_stock_threshold: 3 },
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
  onNavigate?: (next: 'billing' | 'bookings' | 'settings') => void;
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
    const loadPricing = async () => {
      const { data } = await supabase.from('pricing_settings').select('config').eq('id', 1).maybeSingle();
      if (data?.config) {
        setPricingConfig(normalizePricingConfig(data.config));
      }
    };
    loadPricing();
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
        const newQty = Math.max(0, i.quantity + delta);
        if (newQty === 0) return i;
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
    setProducts((prev) =>
      prev.map((product) => {
        const used = productQuantityById[product.id] ?? 0;
        return used > 0 ? { ...product, stock_quantity: Math.max(0, product.stock_quantity - used) } : product;
      })
    );

    if (isUnlinked || !selectedCustomer) {
      toast.success(`Bill saved · ₹${Math.round(grandTotal)} · Unlinked`);
      setBillItems([]);
      setSelectedCustomer(null);
      return;
    }

    const updatedPoints = Math.max(0, selectedCustomer.loyalty_points - pointsRedeemed + pointsEarned);
    const updatedCustomer = { ...selectedCustomer, loyalty_points: updatedPoints };
    setCustomers((prev) => prev.map((c) => (c.id === selectedCustomer.id ? updatedCustomer : c)));
    setSelectedCustomer(updatedCustomer);
    toast.success(`Bill saved · ₹${Math.round(grandTotal)} · ${pointsEarned} pts credited to ${selectedCustomer.name || selectedCustomer.phone}`);

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
        onNavigate={(label) =>
          label === 'Bookings' ? onNavigate?.('bookings') : label === 'Settings' ? onNavigate?.('settings') : undefined
        }
        onLogout={onLogout}
      />
      <main className="flex-1 pb-24 md:ml-64 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-40 hidden h-14 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 md:flex">
          <h2 className="text-lg font-bold tracking-tight">Billing</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input 
                placeholder="Search customer, item..." 
                className="h-9 w-64 pl-9 rounded-full bg-muted/30 border-border/50 focus-visible:ring-primary/50 transition-all hover:bg-muted/50"
              />
            </div>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell size={20} className="text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <HelpCircle size={20} className="text-muted-foreground" />
            </Button>
            <Avatar className="h-9 w-9 cursor-pointer border-2 border-border transition-colors hover:border-primary">
              <AvatarImage src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&h=400&fit=crop" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </div>
        </header>

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
