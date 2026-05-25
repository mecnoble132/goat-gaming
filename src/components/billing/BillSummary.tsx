import { Customer, BillItem } from '@/types';
import { 
  Receipt, 
  Trash2, 
  Plus, 
  Minus, 
  Star, 
  Wallet,
  Smartphone,
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface BillSummaryProps {
  items: BillItem[];
  customer: Customer | null;
  loyaltySettings: {
    earn_rate_points: number;
    earn_rate_minutes: number;
    redeem_rate_points: number;
    redeem_rate_minutes: number;
  };
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onFinalize: (payload: {
    paymentMethod: 'cash' | 'upi' | 'card';
    subtotal: number;
    discount: number;
    grandTotal: number;
    pointsEarned: number;
    pointsRedeemed: number;
    isUnlinked: boolean;
  }) => void;
}

export function BillSummary({ 
  items, 
  customer, 
  loyaltySettings,
  onRemoveItem, 
  onUpdateQuantity,
  onFinalize 
}: BillSummaryProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [redeemSessionId, setRedeemSessionId] = useState('');
  const [redeemHours, setRedeemHours] = useState('1');

  const subtotal = items.reduce((acc, item) => acc + item.total_price, 0);
  const nonVrMinutes = items
    .filter((item) => item.item_type === 'session' && !String(item.metadata?.game_type ?? '').startsWith('vr'))
    .reduce((acc, item) => acc + Number(item.metadata?.duration_minutes ?? 0), 0);
  const earnablePoints = Math.floor(nonVrMinutes / loyaltySettings.earn_rate_minutes) * loyaltySettings.earn_rate_points;

  const redeemableSessions = items.filter(
    (item) => item.item_type === 'session' && ['ps5', 'snooker', 'pool'].includes(String(item.metadata?.game_type))
  );
  const selectedRedeemSession = redeemableSessions.find((item) => item.id === redeemSessionId) || null;
  const selectedSessionHours = selectedRedeemSession ? Number(selectedRedeemSession.metadata?.duration_minutes ?? 0) / 60 : 0;
  const maxHoursByPoints = customer
    ? Math.floor(customer.loyalty_points / loyaltySettings.redeem_rate_points) * (loyaltySettings.redeem_rate_minutes / 60)
    : 0;
  const maxRedeemablePoints = customer
    ? Math.floor(customer.loyalty_points / loyaltySettings.redeem_rate_points) * loyaltySettings.redeem_rate_points
    : 0;
  const canRedeem = !!customer && customer.loyalty_points >= loyaltySettings.redeem_rate_points;
  const maxRedeemHours = Math.max(0, Math.min(selectedSessionHours, maxHoursByPoints));
  const redeemHoursNumber = redeemPoints ? Math.min(Number(redeemHours), maxRedeemHours || 0) : 0;
  const perHourPrice = selectedRedeemSession && selectedSessionHours > 0 ? selectedRedeemSession.total_price / selectedSessionHours : 0;
  const discount = Math.round(redeemHoursNumber * perHourPrice);
  const pointsRedeemed = Math.round((redeemHoursNumber * 60 / loyaltySettings.redeem_rate_minutes) * loyaltySettings.redeem_rate_points);
  const grandTotal = Math.round(Math.max(0, subtotal - discount));

  const handleFinalize = () => {
    if (items.length === 0) return;

    onFinalize({
      paymentMethod,
      subtotal,
      discount,
      grandTotal,
      pointsEarned: customer ? Math.round(earnablePoints) : 0,
      pointsRedeemed: redeemPoints ? pointsRedeemed : 0,
      isUnlinked: !customer,
    });
  };

  return (
    <Card className="flex h-full flex-col overflow-visible border border-border/50 bg-background/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.10)] rounded-lg">
      <div className="border-b border-border/50 bg-muted/20 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shadow-[0_0_10px_rgba(var(--primary),0.1)]">
            <Receipt size={18} className="text-primary" />
          </div>
          <h3 className="text-base font-bold tracking-tight">Bill Summary</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto p-4 custom-scrollbar min-h-[300px]">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground opacity-50">
            <Receipt size={48} strokeWidth={1} className="mb-2" />
            <p className="text-sm">No items added yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map(item => (
              <div key={item.id} className="group relative flex justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{item.item_name}</span>
                    {item.item_type === 'product' && item.metadata?.low_stock ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/50">Low</Badge>
                    ) : null}
                    <button 
                      onClick={() => onRemoveItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:scale-110"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {item.item_type === 'session' ? (
                    <span className="text-xs text-muted-foreground font-mono">
                      {item.metadata?.controllers ? `${item.metadata.controllers} controllers · ` : ''}
                      {item.metadata?.duration_minutes ? `${item.metadata.duration_minutes} min` : 'Session'}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <button 
                        className="h-6 w-6 rounded bg-muted flex items-center justify-center hover:bg-muted-foreground/20"
                        onClick={() => onUpdateQuantity(item.id, -1)}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-mono w-4 text-center">{item.quantity}</span>
                      <button 
                        className="h-6 w-6 rounded bg-muted flex items-center justify-center hover:bg-muted-foreground/20"
                        onClick={() => onUpdateQuantity(item.id, 1)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  )}
                </div>
                <span className="font-mono text-sm font-bold">₹{item.total_price}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto border-t bg-muted/20 p-4 space-y-4">
        {/* GG Points Section */}
        {customer && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/50 bg-background/40 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">GG Points earned (this bill)</span>
                <span className="font-mono font-bold text-secondary">+{Math.round(earnablePoints)} GG pts</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">GG Points available</span>
                <span className="font-mono font-bold">{customer.loyalty_points} GG pts</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">GG Points redeemable (free hours)</span>
                <span className="font-mono font-bold">{maxRedeemablePoints} GG pts</span>
              </div>
            </div>
            <div
              className={cn(
                "flex items-center justify-between rounded-xl border p-3 transition-colors",
                redeemPoints ? "bg-secondary/10 border-secondary" : "bg-background border-border",
                !canRedeem && "opacity-60"
              )}
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Use GG points for free hours</p>
                <p className="text-xs font-mono font-bold">
                  Redeemable: {Math.floor(maxHoursByPoints)} hour(s)
                </p>
              </div>
              <Toggle
                pressed={redeemPoints}
                onPressedChange={(next) => {
                  if (!canRedeem) return;
                  setRedeemPoints(next);
                  if (next && redeemableSessions.length > 0) {
                    const firstSession = redeemableSessions[0];
                    setRedeemSessionId(firstSession.id);
                    const sessionHours = Number(firstSession.metadata?.duration_minutes ?? 0) / 60;
                    const curMax = Math.max(0, Math.min(sessionHours, maxHoursByPoints));
                    setRedeemHours(curMax >= 1 ? '1' : String(curMax));
                  } else {
                    setRedeemSessionId('');
                    setRedeemHours('1');
                  }
                }}
                className="rounded-full bg-muted data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground"
              >
                <CheckCircle2 size={16} />
              </Toggle>
            </div>

            {redeemPoints && canRedeem && (
              <div className="grid gap-2">
                {redeemableSessions.length > 0 ? (
                  <>
                    <Select value={redeemSessionId} onValueChange={(val) => {
                      setRedeemSessionId(val);
                      const session = redeemableSessions.find(item => item.id === val);
                      if (session) {
                        const sessionHours = Number(session.metadata?.duration_minutes ?? 0) / 60;
                        const curMax = Math.max(0, Math.min(sessionHours, maxHoursByPoints));
                        if (Number(redeemHours) > curMax) {
                          setRedeemHours(curMax >= 1 ? '1' : String(curMax));
                        }
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select session for redemption" />
                      </SelectTrigger>
                      <SelectContent>
                        {redeemableSessions.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {session.item_name} · {session.metadata?.duration_minutes} min
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={redeemHours} onValueChange={setRedeemHours}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select free hours" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const options = [];
                          for (let h = 0.25; h <= maxRedeemHours + 0.001; h += 0.25) {
                            const mins = Math.round(h * 60);
                            options.push(
                              <SelectItem key={String(h)} value={String(h)}>
                                {mins < 60 ? `${mins} mins` : `${h} hour(s) (${mins}m)`}
                              </SelectItem>
                            );
                          }
                          return options;
                        })()}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">GG points can only be redeemed on PS5, Snooker, or Pool sessions.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Totals */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">₹{subtotal}</span>
          </div>
          {redeemPoints && (
            <div className="flex justify-between text-xs text-secondary">
              <span>GG Discount</span>
              <span className="font-mono">-₹{discount}</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between items-center bg-muted/20 p-3 rounded-lg border border-border/50">
            <span className="text-sm font-bold tracking-tight text-muted-foreground uppercase">Total</span>
            <span className="text-2xl font-bold text-primary font-mono tracking-tight drop-shadow-[0_0_12px_rgba(var(--primary),0.35)]">₹{grandTotal}</span>
          </div>
        </div>

        {/* Payment & Action */}
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-3 gap-3">
            <Button 
              variant={paymentMethod === 'cash' ? 'default' : 'outline'} 
              className={cn("h-12 flex-col gap-1 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm", paymentMethod === 'cash' && "shadow-[0_0_12px_rgba(var(--primary),0.25)]")}
              onClick={() => setPaymentMethod('cash')}
            >
              <Wallet size={18} /> CASH
            </Button>
            <Button 
              variant={paymentMethod === 'upi' ? 'default' : 'outline'} 
              className={cn("h-12 flex-col gap-1 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm", paymentMethod === 'upi' && "shadow-[0_0_12px_rgba(var(--primary),0.25)]")}
              onClick={() => setPaymentMethod('upi')}
            >
              <Smartphone size={18} /> UPI
            </Button>
            <Button 
              variant={paymentMethod === 'card' ? 'default' : 'outline'} 
              className={cn("h-12 flex-col gap-1 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm", paymentMethod === 'card' && "shadow-[0_0_12px_rgba(var(--primary),0.25)]")}
              onClick={() => setPaymentMethod('card')}
            >
              <CreditCard size={18} /> CARD
            </Button>
          </div>
          <Button 
            className="w-full h-11 rounded-md text-sm font-semibold tracking-wide shadow-[0_0_14px_rgba(var(--primary),0.22)] hover:shadow-[0_0_18px_rgba(var(--primary),0.28)] active:scale-[0.99] transition-all bg-primary text-primary-foreground"
            disabled={items.length === 0}
            onClick={handleFinalize}
          >
            Finalize Bill · ₹{grandTotal}
          </Button>
          {customer ? (
            <p className="text-xs text-muted-foreground text-center font-medium">
              Bill will be sent to <span className="text-primary">{customer.name || customer.phone}'s WhatsApp</span>
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
