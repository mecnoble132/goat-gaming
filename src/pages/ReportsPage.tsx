import { useEffect, useState, useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay, parseISO, eachDayOfInterval } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp, CreditCard, Users, ShoppingBag, Calendar, Banknote, Smartphone, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Bill = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  payment_method: string;
  subtotal: number;
  discount: number;
  grand_total: number;
  points_earned: number;
  points_redeemed: number;
  items: Array<{ item_name: string; item_type: string; quantity: number; total_price: number }>;
  created_at: string;
};

const PRESET_RANGES = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

const PAYMENT_COLORS: Record<string, string> = {
  cash: '#22c55e',
  upi: '#3b82f6',
  card: '#a855f7',
};

const CHART_LINE_COLOR = 'oklch(0.75 0.2 150)';

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 flex items-start gap-4 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
      <div className={`rounded-lg p-2.5 ${color}`}>
        <Icon size={20} className="opacity-90" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="text-2xl font-black tracking-tight mt-0.5">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function ReportsPage({
  onNavigate,
  onLogout,
}: {
  onNavigate?: (next: 'billing' | 'bookings' | 'settings' | 'inventory' | 'customers' | 'reports') => void;
  onLogout?: () => void;
}) {
  useEffect(() => { document.title = 'Reports · Goat Gaming'; }, []);

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState(7);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('bills').select('*').order('created_at', { ascending: false });
      if (error) toast.error('Failed to load bills: ' + error.message);
      else setBills((data as Bill[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const { fromDate, toDate } = useMemo(() => {
    if (useCustom && customFrom && customTo) {
      return { fromDate: startOfDay(parseISO(customFrom)), toDate: endOfDay(parseISO(customTo)) };
    }
    const to = endOfDay(new Date());
    const from = preset === 0 ? startOfDay(new Date()) : startOfDay(subDays(new Date(), preset));
    return { fromDate: from, toDate: to };
  }, [preset, customFrom, customTo, useCustom]);

  const filtered = useMemo(() =>
    bills.filter(b => {
      const d = parseISO(b.created_at);
      return d >= fromDate && d <= toDate;
    }),
  [bills, fromDate, toDate]);

  const stats = useMemo(() => {
    const revenue = filtered.reduce((s, b) => s + b.grand_total, 0);
    const discounts = filtered.reduce((s, b) => s + b.discount, 0);
    const uniqueCustomers = new Set(filtered.filter(b => b.customer_id).map(b => b.customer_id)).size;
    const walkIns = filtered.filter(b => !b.customer_id).length;
    const cashBills = filtered.filter(b => b.payment_method === 'cash').length;
    const upiBills = filtered.filter(b => b.payment_method === 'upi').length;
    const cardBills = filtered.filter(b => b.payment_method === 'card').length;
    const avgBill = filtered.length ? Math.round(revenue / filtered.length) : 0;
    return { revenue, discounts, uniqueCustomers, walkIns, cashBills, upiBills, cardBills, avgBill, total: filtered.length };
  }, [filtered]);

  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: fromDate, end: toDate });
    return days.map(day => {
      const dayBills = filtered.filter(b => format(parseISO(b.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
      return {
        date: format(day, 'dd MMM'),
        revenue: dayBills.reduce((s, b) => s + b.grand_total, 0),
        bills: dayBills.length,
      };
    });
  }, [filtered, fromDate, toDate]);

  const paymentData = useMemo(() => [
    { name: 'Cash', value: stats.cashBills, color: PAYMENT_COLORS.cash },
    { name: 'UPI', value: stats.upiBills, color: PAYMENT_COLORS.upi },
    { name: 'Card', value: stats.cardBills, color: PAYMENT_COLORS.card },
  ].filter(d => d.value > 0), [stats]);

  const topItems = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    filtered.forEach(b => {
      (b.items || []).forEach(item => {
        if (!map[item.item_name]) map[item.item_name] = { name: item.item_name, qty: 0, revenue: 0 };
        map[item.item_name].qty += item.quantity;
        map[item.item_name].revenue += item.total_price;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [filtered]);

  const exportExcel = () => {
    const rows = filtered.map(b => ({
      'Bill ID': b.id,
      'Date': format(parseISO(b.created_at), 'dd/MM/yyyy HH:mm'),
      'Customer': b.customer_name || 'Cash Customer',
      'Phone': b.customer_phone || '',
      'Payment': b.payment_method.toUpperCase(),
      'Subtotal (₹)': b.subtotal,
      'Discount (₹)': b.discount,
      'Grand Total (₹)': b.grand_total,
      'GG Points Earned': b.points_earned,
      'GG Points Redeemed': b.points_redeemed,
      'Items': (b.items || []).map(i => `${i.item_name} x${i.quantity}`).join(', '),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bills');

    // Auto column widths
    const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length, 15) }));
    ws['!cols'] = colWidths;

    const fileName = `GoatGaming_Bills_${format(fromDate, 'ddMMMyyyy')}_to_${format(toDate, 'ddMMMyyyy')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Excel exported successfully!');
  };

  const navTo = (label: string) => {
    if (label === 'Billing') onNavigate?.('billing');
    else if (label === 'Bookings') onNavigate?.('bookings');
    else if (label === 'Settings') onNavigate?.('settings');
    else if (label === 'Inventory') onNavigate?.('inventory');
    else if (label === 'Customers') onNavigate?.('customers');
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="Reports" onNavigate={navTo} onLogout={onLogout} />

      <main className="flex-1 pb-24 md:ml-64 md:pb-0 overflow-x-hidden">
        <PageHeader
          title="Reports"
          actions={
            <Button size="sm" className="gap-2" onClick={exportExcel} disabled={filtered.length === 0}>
              <Download size={16} /> Export Excel
            </Button>
          }
        />

        <div className="mx-auto w-full max-w-[1600px] p-3 sm:p-4 space-y-5">

          {/* Date Filters */}
          <div className="rounded-xl border border-border/50 bg-card/40 p-3 sm:p-4 backdrop-blur-sm flex flex-wrap items-center gap-2">
            <Calendar size={16} className="text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold text-muted-foreground shrink-0">Range:</span>
            {PRESET_RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => { setPreset(r.days); setUseCustom(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !useCustom && preset === r.days
                    ? 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(var(--primary),0.3)]'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >{r.label}</button>
            ))}
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <input
                type="date"
                value={customFrom}
                onChange={e => { setCustomFrom(e.target.value); setUseCustom(true); }}
                className="h-8 rounded-lg border border-border/50 bg-background px-2 text-xs transition-all focus:border-primary/40 focus:ring-[3px] focus:ring-primary/10 outline-none"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <input
                type="date"
                value={customTo}
                onChange={e => { setCustomTo(e.target.value); setUseCustom(true); }}
                className="h-8 rounded-lg border border-border/50 bg-background px-2 text-xs transition-all focus:border-primary/40 focus:ring-[3px] focus:ring-primary/10 outline-none"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={TrendingUp} label="Total Revenue" value={`₹${stats.revenue.toLocaleString()}`} sub={`${stats.total} bills`} color="bg-primary/15 text-primary" />
            <StatCard icon={CreditCard} label="Avg. Bill Value" value={`₹${stats.avgBill.toLocaleString()}`} color="bg-blue-500/15 text-blue-400" />
            <StatCard icon={Users} label="Total Customers" value={String(stats.uniqueCustomers + stats.walkIns)} sub="Total people served" color="bg-purple-500/15 text-purple-400" />
            <StatCard icon={ShoppingBag} label="Items Sold" value={String(filtered.reduce((s, b) => s + (b.items || []).reduce((a, i) => a + i.quantity, 0), 0))} sub="across all bills" color="bg-amber-500/15 text-amber-400" />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue Chart */}
            <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Daily Revenue</div>
              {loading ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
              ) : dailyData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data in this range</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']}
                    />
                    <Line type="monotone" dataKey="revenue" stroke={CHART_LINE_COLOR} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: CHART_LINE_COLOR }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Payment Mix */}
            <div className="rounded-xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Payment Mix</div>
              {paymentData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={paymentData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {paymentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(v: number, name: string) => [v + ' bills', name]}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {/* Payment breakdown */}
              <div className="mt-2 space-y-1.5">
                {[
                  { label: 'Cash', count: stats.cashBills, icon: Banknote, color: 'text-green-400' },
                  { label: 'UPI', count: stats.upiBills, icon: Smartphone, color: 'text-blue-400' },
                  { label: 'Card', count: stats.cardBills, icon: CreditCard, color: 'text-purple-400' },
                ].map(p => (
                  <div key={p.label} className="flex items-center justify-between text-xs">
                    <span className={`flex items-center gap-1.5 font-semibold ${p.color}`}><p.icon size={12} />{p.label}</span>
                    <span className="font-mono text-muted-foreground">{p.count} bills</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bills per Day Bar + Top Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Daily Bill Count</div>
              {dailyData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(v: number) => [v, 'Bills']}
                    />
                    <Bar dataKey="bills" fill="oklch(0.75 0.2 150)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Items */}
            <div className="rounded-xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Top Items by Revenue</div>
              {topItems.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data</div>
              ) : (
                <div className="space-y-2">
                  {topItems.map((item, i) => {
                    const maxRev = topItems[0].revenue;
                    const pct = maxRev > 0 ? Math.round((item.revenue / maxRev) * 100) : 0;
                    return (
                      <div key={item.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold truncate max-w-[60%]">{i + 1}. {item.name}</span>
                          <span className="font-mono text-primary">₹{item.revenue.toLocaleString()} <span className="text-muted-foreground">({item.qty}x)</span></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/50">
                          <div className="h-1.5 rounded-full bg-primary/70 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bills Table */}
          <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-border/50">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-muted-foreground" />
                <span className="text-sm font-bold">Bill History</span>
                <span className="text-xs text-muted-foreground font-mono">({filtered.length} records)</span>
              </div>
              <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={exportExcel} disabled={filtered.length === 0}>
                <Download size={14} /> Export
              </Button>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading bills...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No bills in this date range.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      {['Bill ID', 'Date & Time', 'Customer', 'Payment', 'Subtotal', 'Discount', 'Total', 'GG Pts'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((bill, i) => (
                      <tr key={bill.id} className={`border-b border-border/30 transition-colors hover:bg-muted/20 ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{bill.id}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">{format(parseISO(bill.created_at), 'dd MMM yyyy, hh:mm a')}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-xs truncate max-w-[140px]">{bill.customer_name}</div>
                          {bill.customer_phone && <div className="text-[10px] text-muted-foreground font-mono">{bill.customer_phone}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            bill.payment_method === 'cash' ? 'bg-green-500/15 text-green-400' :
                            bill.payment_method === 'upi' ? 'bg-blue-500/15 text-blue-400' :
                            'bg-purple-500/15 text-purple-400'
                          }`}>{bill.payment_method}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">₹{bill.subtotal.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-xs text-red-400">{bill.discount > 0 ? `-₹${bill.discount}` : '—'}</td>
                        <td className="px-4 py-3 font-mono text-sm font-bold text-primary">₹{bill.grand_total.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs">
                          {bill.points_earned > 0 && <span className="text-green-400 font-mono">+{bill.points_earned}</span>}
                          {bill.points_redeemed > 0 && <span className="text-red-400 font-mono ml-1">-{bill.points_redeemed}</span>}
                          {!bill.points_earned && !bill.points_redeemed && <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
