import { useMemo, useState } from 'react';
import { 
  Gamepad2, 
  Target, 
  Search,
  Coffee,
  CheckCircle2,
  Plus,
  PackageSearch,
  Gamepad,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { BillItem, Product } from '@/types';
import { Input } from '@/components/ui/input';
import { DEFAULT_PRICING_CONFIG, GamePricingConfig, normalizePricingConfig } from '@/lib/pricing';

interface GameTabsProps {
  onAddItem: (item: Omit<BillItem, 'id' | 'bill_id'>) => void;
  products: Product[];
  productQuantityById: Record<string, number>;
  pricingConfig?: GamePricingConfig;
}

const ps5Durations = [
  { label: '15 Minutes', minutes: 15 },
  { label: '30 Minutes', minutes: 30 },
  { label: '1 Hour', minutes: 60 },
  { label: '2 Hours', minutes: 120 },
  { label: '3 Hours', minutes: 180 },
  { label: '4 Hours', minutes: 240 },
];

const snookerPoolDurations = [
  { label: '15 Minutes', minutes: 15 },
  { label: '30 Minutes', minutes: 30 },
  { label: '1 Hour', minutes: 60 },
  { label: '1.5 Hours', minutes: 90 },
  { label: '2 Hours', minutes: 120 },
  { label: '2.5 Hours', minutes: 150 },
  { label: '3 Hours', minutes: 180 },
];

export function GameTabs({ onAddItem, products, productQuantityById, pricingConfig = DEFAULT_PRICING_CONFIG }: GameTabsProps) {
  const [ps5Controllers, setPs5Controllers] = useState<string>('');
  const [ps5Duration, setPs5Duration] = useState<string>('');
  const [snookerDuration, setSnookerDuration] = useState<string>('');
  const [poolDuration, setPoolDuration] = useState<string>('');
  const [selectedVrCricket, setSelectedVrCricket] = useState<string>('');
  const [snacksSearch, setSnacksSearch] = useState('');
  const effectivePricing = normalizePricingConfig(pricingConfig);
  const ps5Pricing = effectivePricing.ps5;
  const snookerPricing = effectivePricing.snooker;
  const poolPricing = effectivePricing.pool;
  const vrCricketOptions = effectivePricing.vr_cricket;
  const vrAdventureOptions = effectivePricing.vr_adventure;

  const getPoints = (minutes: number) => (minutes / 30) * 5;

  const ps5Price = ps5Controllers && ps5Duration ? ps5Pricing[`${ps5Controllers}-${ps5Duration}`] ?? 0 : 0;

  const addSnack = (product: Product) => {
    const inBillQty = productQuantityById[product.id] ?? 0;
    const available = product.stock_quantity - inBillQty;
    if (available <= 0) return;
    onAddItem({
      item_type: 'product',
      item_name: product.name,
      quantity: 1,
      unit_price: product.mrp,
      total_price: product.mrp,
      metadata: {
        product_id: product.id,
        category: product.category,
        low_stock: product.stock_quantity <= product.low_stock_threshold,
      },
    });
  };

  const handleAddPs5 = () => {
    if (!ps5Controllers || !ps5Duration) return;
    const minutes = Number(ps5Duration);
    const price = ps5Pricing[`${ps5Controllers}-${ps5Duration}`] ?? 0;
    onAddItem({
      item_type: 'session',
      item_name: 'PS5 Session',
      quantity: 1,
      unit_price: price,
      total_price: price,
      metadata: { controllers: Number(ps5Controllers), duration_minutes: minutes, game_type: 'ps5' },
    });
    setPs5Controllers('');
    setPs5Duration('');
  };

  const filteredProducts = useMemo(() => {
    const q = snacksSearch.toLowerCase();
    return products
      .filter((product) => !q || product.name.toLowerCase().includes(q) || product.category.toLowerCase().includes(q))
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }, [products, snacksSearch]);

  return (
    <Tabs defaultValue="ps5" className="w-full">
      <TabsList className="bg-muted/20 backdrop-blur-md w-full justify-start overflow-x-auto flex-nowrap gap-2 sm:gap-3 p-1.5 sm:p-2 border border-border/50 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabsTrigger value="ps5" className="shrink-0 min-w-[108px] sm:min-w-[120px] h-10 sm:h-11 rounded-md px-4 sm:px-5 font-semibold tracking-wide text-xs sm:text-sm whitespace-nowrap transition-all duration-200 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_12px_rgba(var(--primary),0.25)]">
          <Gamepad2 size={18} className="mr-2" /> PS5
        </TabsTrigger>
        <TabsTrigger value="snooker" className="shrink-0 min-w-[108px] sm:min-w-[120px] h-10 sm:h-11 rounded-md px-4 sm:px-5 font-semibold tracking-wide text-xs sm:text-sm whitespace-nowrap transition-all duration-200 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_12px_rgba(var(--primary),0.25)]">
          <Target size={18} className="mr-2" /> Snooker
        </TabsTrigger>
        <TabsTrigger value="pool" className="shrink-0 min-w-[108px] sm:min-w-[120px] h-10 sm:h-11 rounded-md px-4 sm:px-5 font-semibold tracking-wide text-xs sm:text-sm whitespace-nowrap transition-all duration-200 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_12px_rgba(var(--primary),0.25)]">
          <Target size={18} className="mr-2" /> Pool
        </TabsTrigger>
        <TabsTrigger value="vr" className="shrink-0 min-w-[108px] sm:min-w-[120px] h-10 sm:h-11 rounded-md px-4 sm:px-5 font-semibold tracking-wide text-xs sm:text-sm whitespace-nowrap transition-all duration-200 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_12px_rgba(var(--primary),0.25)]">
          <Gamepad size={18} className="mr-2" /> VR
        </TabsTrigger>
        <TabsTrigger value="snacks" className="shrink-0 min-w-[108px] sm:min-w-[120px] h-10 sm:h-11 rounded-md px-4 sm:px-5 font-semibold tracking-wide text-xs sm:text-sm whitespace-nowrap transition-all duration-200 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_12px_rgba(var(--primary),0.25)]">
          <Coffee size={18} className="mr-2" /> Snacks
        </TabsTrigger>
      </TabsList>

      <div className="mt-4">
        <TabsContent value="ps5" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.10)] rounded-lg overflow-visible">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30 shadow-[0_0_12px_rgba(var(--primary),0.12)]">
                  <Gamepad2 className="text-primary" size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground">PS5 Battlefield</h3>
                  <p className="text-xs font-medium text-muted-foreground tracking-wide mt-1">Select your gear & mission time</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-wide text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" /> Controllers
                  </label>
                  <Select value={ps5Controllers} onValueChange={setPs5Controllers}>
                    <SelectTrigger className="h-11 text-sm font-medium rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50 transition-all hover:bg-muted/50">
                      <SelectValue placeholder="How many?" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border bg-popover text-popover-foreground">
                      <SelectItem value="1">1 Controller</SelectItem>
                      <SelectItem value="2">2 Controllers</SelectItem>
                      <SelectItem value="3">3 Controllers</SelectItem>
                      <SelectItem value="4">4 Controllers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-wide text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" /> Session Duration
                  </label>
                  <Select value={ps5Duration} onValueChange={setPs5Duration}>
                    <SelectTrigger className="h-11 text-sm font-medium rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50 transition-all hover:bg-muted/50">
                      <SelectValue placeholder="For how long?" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border bg-popover text-popover-foreground">
                      {ps5Durations.map((slot) => (
                        <SelectItem key={slot.minutes} value={String(slot.minutes)}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-muted/20 border border-border/50 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-md">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold tracking-tight text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.18)]">
                      ₹{ps5Controllers && ps5Duration ? ps5Price : '0'}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground tracking-wide">Estimated Total</span>
                  </div>
                  {ps5Duration && (
                    <p className="text-xs font-semibold text-primary tracking-wide flex items-center gap-1">
                      <CheckCircle2 size={14} /> +{getPoints(Number(ps5Duration))} pts
                    </p>
                  )}
                </div>
                <Button
                  size="lg" 
                  disabled={!ps5Controllers || !ps5Duration}
                  className="w-full sm:w-auto h-10 px-4 text-sm font-semibold tracking-wide rounded-md bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_14px_rgba(var(--primary),0.22)] transition-all active:scale-[0.99]"
                  onClick={handleAddPs5}
                >
                  Add PS5 Session <Plus size={16} className="ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snooker" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border border-border bg-card shadow-sm rounded-lg overflow-visible">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                  <Target className="text-primary" size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground">Snooker</h3>
                  <p className="text-xs font-medium text-muted-foreground tracking-wide">Pick a slot and add the session</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-wide text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Precision Duration
                  </label>
                  <Select value={snookerDuration} onValueChange={setSnookerDuration}>
                    <SelectTrigger className="h-10 text-sm font-medium rounded-md bg-background border-border focus-visible:ring-ring/50">
                      <SelectValue placeholder="How many hours?" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border bg-popover text-popover-foreground">
                      {snookerPoolDurations.map((slot) => (
                        <SelectItem key={slot.minutes} value={String(slot.minutes)}>
                          {slot.label} (₹{snookerPricing[String(slot.minutes)] ?? 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="bg-muted/30 border border-border rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold tracking-tight text-primary">
                      ₹{snookerDuration ? (snookerPricing[String(snookerDuration)] ?? 0) : 0}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground tracking-wide">Estimated Total</span>
                  </div>
                  {snookerDuration && (
                    <p className="text-xs font-semibold text-primary tracking-wide flex items-center gap-1">
                      <CheckCircle2 size={12} /> +{getPoints(Number(snookerDuration))} pts
                    </p>
                  )}
                </div>
                <Button size="lg" disabled={!snookerDuration} className="w-full sm:w-auto h-10 px-4 text-sm font-semibold tracking-wide rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.99]"
                  onClick={() => onAddItem({
                    item_type: 'session',
                    item_name: 'Snooker Session',
                    quantity: 1,
                    unit_price: snookerPricing[String(snookerDuration)] ?? 0,
                    total_price: snookerPricing[String(snookerDuration)] ?? 0,
                    metadata: { duration_minutes: Number(snookerDuration), game_type: 'snooker' }
                  })}
                >
                  Add Snooker <Plus size={16} className="ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pool" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border border-border bg-card shadow-sm rounded-lg overflow-visible">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                  <Target className="text-primary" size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground">Pool</h3>
                  <p className="text-xs font-medium text-muted-foreground tracking-wide">Fast-paced cue action</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-wide text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Session Duration
                  </label>
                  <Select value={poolDuration} onValueChange={setPoolDuration}>
                    <SelectTrigger className="h-10 text-sm font-medium rounded-md bg-background border-border focus-visible:ring-ring/50">
                      <SelectValue placeholder="How many hours?" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border bg-popover text-popover-foreground">
                      {snookerPoolDurations.map((slot) => (
                        <SelectItem key={slot.minutes} value={String(slot.minutes)}>
                          {slot.label} (₹{poolPricing[String(slot.minutes)] ?? 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="bg-muted/30 border border-border rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold tracking-tight text-primary">
                      ₹{poolDuration ? (poolPricing[String(poolDuration)] ?? 0) : 0}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground tracking-wide">Estimated Total</span>
                  </div>
                  {poolDuration && (
                    <p className="text-xs font-semibold text-primary tracking-wide flex items-center gap-1">
                      <CheckCircle2 size={12} /> +{getPoints(Number(poolDuration))} pts
                    </p>
                  )}
                </div>
                <Button size="lg" disabled={!poolDuration} className="w-full sm:w-auto h-10 px-4 text-sm font-semibold tracking-wide rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.99]"
                  onClick={() => onAddItem({
                    item_type: 'session',
                    item_name: 'Pool Session',
                    quantity: 1,
                    unit_price: poolPricing[String(poolDuration)] ?? 0,
                    total_price: poolPricing[String(poolDuration)] ?? 0,
                    metadata: { duration_minutes: Number(poolDuration), game_type: 'pool' }
                  })}
                >
                  Add Pool <Plus size={16} className="ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vr" className="animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none bg-card/50">
              <CardContent className="p-6">
                <h4 className="font-bold mb-4 flex items-center gap-2"><Target size={16} /> VR Cricket</h4>
                <div className="grid grid-cols-1 gap-2">
                  {vrCricketOptions.map((v) => (
                    <button
                      key={v.label}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        selectedVrCricket === v.label ? 'border-primary bg-accent' : 'hover:bg-accent'
                      }`}
                      onClick={() => setSelectedVrCricket(v.label)}
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold">{v.label}</p>
                        <p className="text-[10px] text-muted-foreground">{v.minutes} min</p>
                      </div>
                      <span className="font-mono text-sm font-bold">₹{v.price}</span>
                    </button>
                  ))}
                </div>
                <Button
                  className="mt-4 w-full"
                  disabled={!selectedVrCricket}
                  onClick={() => {
                    const picked = vrCricketOptions.find((item) => item.label === selectedVrCricket);
                    if (!picked) return;
                    onAddItem({
                      item_type: 'session',
                      item_name: `VR Cricket: ${picked.label}`,
                      quantity: 1,
                      unit_price: picked.price,
                      total_price: picked.price,
                      metadata: { game_type: 'vr_cricket', duration_minutes: picked.minutes },
                    });
                    setSelectedVrCricket('');
                  }}
                >
                  Add VR Cricket
                </Button>
                <p className="text-xs text-muted-foreground mt-3">No loyalty points for VR sessions.</p>
              </CardContent>
            </Card>
            <Card className="border-none bg-card/50">
              <CardContent className="p-6">
                <h4 className="font-bold mb-4 flex items-center gap-2"><Gamepad size={16} /> VR Adventure</h4>
                <p className="text-xs text-muted-foreground -mt-2 mb-4">Each session is 15 minutes.</p>
                <div className="grid grid-cols-1 gap-2">
                  {vrAdventureOptions.map(v => (
                    <button key={v.label} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-all"
                      onClick={() => onAddItem({ item_type: 'session', item_name: `VR Adventure: ${v.label}`, quantity: 1, unit_price: v.price, total_price: v.price, metadata: { game_type: 'vr_adventure', duration_minutes: v.minutes ?? 15 } })}
                    >
                      <span className="text-sm font-bold">{v.label}</span>
                      <span className="font-mono text-sm font-bold">₹{v.price}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">No loyalty points for VR sessions.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="snacks" className="animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              value={snacksSearch}
              onChange={(e) => setSnacksSearch(e.target.value)}
              className="pl-9"
              placeholder="Search snacks and drinks"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const inBillQty = productQuantityById[product.id] ?? 0;
              const available = product.stock_quantity - inBillQty;
              const isOut = available <= 0;
              const isLow = product.stock_quantity <= product.low_stock_threshold;
              return (
                <button
                  key={product.id}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border bg-card/50 transition-all text-center gap-1 group ${
                    isOut ? 'opacity-40 cursor-not-allowed' : 'hover:border-primary/50 active:scale-95'
                  }`}
                  disabled={isOut}
                  onClick={() => addSnack(product)}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{product.category}</span>
                  <span className="text-sm font-bold">{product.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">₹{product.mrp}</span>
                  {isOut ? (
                    <Badge variant="outline">Out of stock</Badge>
                  ) : isLow ? (
                    <Badge variant="outline" className="text-amber-600 border-amber-500/50">Low</Badge>
                  ) : null}
                </button>
              );
            })}
            <button className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed bg-card/30 text-center gap-1 text-muted-foreground">
              <PackageSearch size={18} />
              <span className="text-sm font-semibold">Search more</span>
            </button>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}
