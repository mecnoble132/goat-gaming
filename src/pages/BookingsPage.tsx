import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, addMinutes, format, isSameDay, parseISO } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  BookingOrBlock,
  DEFAULT_SETTINGS,
  DEFAULT_STATIONS,
  Station,
  StationType,
  combineDateTime,
  deriveStatus,
  endDateTime,
  isPastDate,
  overlaps,
  ymd,
} from '@/lib/bookings';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

type Customer = {
  id: string;
  name: string;
  phone: string;
  whatsapp_number: string;
  loyalty_points: number;
  visits: number;
  created_at: string;
};

const TYPE_COLORS: Record<StationType, string> = {
  ps5: 'bg-blue-500/20 border-blue-500/40 text-blue-200',
  snooker: 'bg-teal-500/20 border-teal-500/40 text-teal-200',
  pool: 'bg-purple-500/20 border-purple-500/40 text-purple-200',
  vr: 'bg-amber-500/20 border-amber-500/40 text-amber-200',
};

function groupStations(stations: Station[]) {
  const order: StationType[] = ['ps5', 'snooker', 'pool', 'vr'];
  return [...stations].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || a.name.localeCompare(b.name));
}

function minutesBetweenOpenClose(open: string, close: string) {
  const base = '2000-01-01';
  const start = parseISO(`${base}T${open}:00`);
  const end = parseISO(`${base}T${close}:00`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function buildSlots(open: string, close: string, slotMinutes: number) {
  const total = minutesBetweenOpenClose(open, close);
  const count = Math.ceil(total / slotMinutes);
  const base = '2000-01-01';
  const start = parseISO(`${base}T${open}:00`);
  return Array.from({ length: count + 1 }, (_, idx) => format(addMinutes(start, idx * slotMinutes), 'HH:mm'));
}

function CustomerPicker({
  customers,
  value,
  onChange,
  onCreate,
  disabled,
}: {
  customers: Customer[];
  value: Customer | null;
  onChange: (c: Customer) => void;
  onCreate: (payload: { name?: string; phone: string; whatsapp_number?: string }) => void;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [sameWa, setSameWa] = useState(true);
  const [newWa, setNewWa] = useState('');

  const results = useMemo(() => {
    const s = q.trim();
    if (!s) return [];
    const lower = s.toLowerCase();
    return customers.filter((c) => c.name?.toLowerCase().includes(lower) || c.phone.includes(s));
  }, [customers, q]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    window.addEventListener(
      'pointerdown',
      (e) => {
        const root = rootRef.current;
        if (!root) return;
        if (root.contains(e.target as Node)) return;
        setOpen(false);
        setShowCreate(false);
      },
      { signal: controller.signal }
    );
    return () => controller.abort();
  }, [open]);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/40 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{value.name || value.phone}</div>
          <div className="text-xs text-muted-foreground font-mono">{value.phone}</div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="shrink-0"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <Input
        disabled={disabled}
        placeholder="Search customer by name or phone"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="h-10 transition-all duration-300 focus:bg-background focus:border-primary/40 focus:ring-[4px] focus:ring-primary/10 focus:shadow-[0_0_20px_rgba(var(--primary),0.1)] outline-none"
      />

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-md border border-border bg-popover shadow-xl">
          <div className="max-h-[280px] overflow-y-auto p-2">
            {showCreate ? (
              <div className="space-y-2 p-2">
                <div className="text-xs font-semibold text-muted-foreground">Create new customer</div>
                <Input placeholder="Name (optional)" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9" />
                <Input placeholder="Phone (required)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="h-9" />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={sameWa} onChange={(e) => setSameWa(e.target.checked)} />
                  WhatsApp same as phone
                </label>
                {!sameWa ? (
                  <Input placeholder="WhatsApp number" value={newWa} onChange={(e) => setNewWa(e.target.value)} className="h-9" />
                ) : null}
                <Button
                  type="button"
                  className="w-full"
                  disabled={!newPhone.trim()}
                  onClick={() => {
                    const phone = newPhone.trim();
                    const wa = sameWa ? phone : newWa.trim();
                    onCreate({ name: newName.trim() || undefined, phone, whatsapp_number: wa || undefined });
                    setNewName('');
                    setNewPhone('');
                    setNewWa('');
                    setSameWa(true);
                    setShowCreate(false);
                    setOpen(false);
                    setQ('');
                  }}
                >
                  Save and attach
                </Button>
              </div>
            ) : results.length > 0 ? (
              results.map((c) => (
                <button
                  key={c.id}
                  className="flex w-full items-center justify-between rounded-md p-2 text-left hover:bg-accent"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                    setQ('');
                  }}
                  type="button"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{c.name || c.phone}</div>
                    <div className="text-xs text-muted-foreground font-mono">{c.phone}</div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {c.loyalty_points} GG pts
                  </Badge>
                </button>
              ))
            ) : q.trim() ? (
              <div className="p-3 text-sm text-muted-foreground">No customer found for “{q}”.</div>
            ) : (
              <div className="p-3 text-sm text-muted-foreground">Type a name or phone number.</div>
            )}
          </div>
          <div className="border-t bg-muted/30 p-2">
            <Button type="button" variant="ghost" className="w-full justify-start gap-2" onClick={() => setShowCreate(true)}>
              <Plus size={16} />
              Create new customer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingsPage({
  onNavigate,
  onLogout,
}: {
  onNavigate?: (next: 'billing' | 'bookings' | 'settings' | 'inventory' | 'customers' | 'reports') => void;
  onLogout?: () => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [items, setItems] = useState<BookingOrBlock[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => ymd(new Date()));
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'new' | 'edit' | 'detail'>('new');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    kind: 'booking' | 'block';
    customer: Customer | null;
    game_type: StationType;
    station_id: string;
    date: string;
    start_time: string;
    duration_minutes: number;
    controllers?: number;
    vr_mode?: 'cricket' | 'adventure';
    vr_label?: string;
    notes?: string;
    reason?: string;
  }>(() => ({
    kind: 'booking',
    customer: null,
    game_type: 'ps5',
    station_id: groupStations(DEFAULT_STATIONS)[0]?.id ?? 'ps5-1',
    date: ymd(new Date()),
    start_time: settings.opening_time,
    duration_minutes: 60,
    controllers: 2,
  }));

  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const [now, setNow] = useState(() => new Date());
  const todayYmd = ymd(now);
  const isPastDay = isPastDate(selectedDate, now);
  const isPastStart = (dateYmd: string, timeHHmm: string) => combineDateTime(dateYmd, timeHHmm).getTime() < Date.now();
  const isPast = isPastDay;

  useEffect(() => {
    document.title = 'Bookings · Goat Gaming';
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadingData(true);

      const { data: stationRows, error: stationReadError } = await supabase.from('stations').select('id,name,type').order('name');
      if (stationReadError) {
        toast.error(stationReadError.message);
        setLoadingData(false);
        return;
      }
      const existingStationIds = new Set((stationRows ?? []).map((s: any) => s.id));
      const missingStations = DEFAULT_STATIONS.filter((s) => !existingStationIds.has(s.id));
      if (missingStations.length > 0) {
        await supabase.from('stations').upsert(missingStations, { onConflict: 'id' });
      }

      const { data: settingsRows } = await supabase.from('booking_settings').select('opening_time,closing_time,slot_minutes').limit(1);
      if (!settingsRows || settingsRows.length === 0) {
        await supabase.from('booking_settings').insert({ id: 1, ...DEFAULT_SETTINGS });
      }

      // Load only a ±30-day rolling window — prevents unbounded growth as history accumulates.
      // The app re-fetches if the user navigates outside this window.
      const windowFrom = format(addDays(new Date(), -30), 'yyyy-MM-dd');
      const windowTo   = format(addDays(new Date(),  30), 'yyyy-MM-dd');

      const [{ data: customersRows }, { data: stationsData }, { data: settingsData }, { data: bookingsData }] = await Promise.all([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('stations').select('id,name,type').order('name'),
        supabase.from('booking_settings').select('opening_time,closing_time,slot_minutes').limit(1).maybeSingle(),
        supabase
          .from('bookings')
          .select('*')
          .gte('date', windowFrom)
          .lte('date', windowTo)
          .order('date')
          .order('start_time'),
      ]);

      setCustomers((customersRows ?? []) as Customer[]);
      setStations((stationsData ?? []) as Station[]);
      if (settingsData) {
        setSettings({
          opening_time: settingsData.opening_time,
          closing_time: settingsData.closing_time,
          slot_minutes: settingsData.slot_minutes,
        });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
      const itemsWithKind = (bookingsData ?? []).map((item: any) => ({
        ...item,
        kind: item.kind || 'booking',
      })) as BookingOrBlock[];
      setItems(itemsWithKind);
      setLoadingData(false);
    };

    load();
  }, []);

  const stationsOrdered = useMemo(() => groupStations(stations), [stations]);
  const slots = useMemo(() => buildSlots(settings.opening_time, settings.closing_time, settings.slot_minutes), [settings]);

  const dayItems = useMemo(() => items.filter((b) => b.date === selectedDate), [items, selectedDate]);

  const dayBookings = useMemo(
    () =>
      dayItems
        .filter((b) => b.kind === 'booking')
        .map((b) => ({ ...b, status: deriveStatus(b, now) }))
        .sort((a, b) => combineDateTime(a.date, a.start_time).getTime() - combineDateTime(b.date, b.start_time).getTime()),
    [dayItems, now]
  );

  const overview = useMemo(() => {
    const total = dayBookings.length;
    const inProgress = dayBookings.filter((b) => b.status === 'in_progress').length;
    const upcoming = dayBookings.filter((b) => b.status === 'upcoming').length;
    const cancelled = dayBookings.filter((b) => b.status === 'cancelled').length;
    return { total, inProgress, upcoming, cancelled };
  }, [dayBookings]);

  const activeItem = useMemo(() => (activeId ? items.find((i) => i.id === activeId) : null), [items, activeId]);

  const openNew = (prefill?: Partial<typeof draft>) => {
    const nextDate = (prefill?.date ?? selectedDate) as string;
    const nextStart = (prefill?.start_time ?? draft.start_time) as string;
    setPanelMode('new');
    setActiveId(null);
    setDraft((d) => ({
      ...d,
      ...prefill,
      date: nextDate,
      start_time: nextStart,
    }));
    setPanelOpen(true);
  };

  const openDetail = (id: string) => {
    setActiveId(id);
    setPanelMode('detail');
    setPanelOpen(true);
  };

  const openEdit = () => {
    if (!activeItem || activeItem.kind !== 'booking') return;
    const c = customers.find((x) => x.id === activeItem.customer_id) ?? null;
    setDraft({
      kind: 'booking',
      customer: c,
      game_type: activeItem.game_type,
      station_id: activeItem.station_id,
      date: activeItem.date,
      start_time: activeItem.start_time,
      duration_minutes: activeItem.duration_minutes,
      controllers: activeItem.controllers,
      vr_mode: activeItem.vr_mode,
      vr_label: activeItem.vr_label,
      notes: activeItem.notes,
    });
    setPanelMode('edit');
  };

  const saveDraft = async () => {
    if (isPastDay) return;
    if (draft.date === ymd(new Date()) && isPastStart(draft.date, draft.start_time)) return;
    if (draft.kind === 'booking' && !draft.customer) return;
    const station = stationsOrdered.find((s) => s.id === draft.station_id);
    if (!station) return;

    const base = {
      date: draft.date,
      start_time: draft.start_time,
      duration_minutes: draft.duration_minutes,
      station_id: draft.station_id,
    };

    const conflicting = items.find((it) => {
      if (it.id === activeId) return false;
      if (it.date !== draft.date) return false;
      if (it.station_id !== draft.station_id) return false;
      return overlaps(base, it);
    });
    if (conflicting) {
      const conflictEnd = endDateTime(conflicting);
      toast.error(
        `${station.name} is already booked from ${conflicting.start_time} to ${format(conflictEnd, 'hh:mm a')}. Choose a different station or time.`
      );
      return;
    }

    setSaving(true);
    try {
      if (draft.kind === 'block') {
        const next: BookingOrBlock = {
          kind: 'block',
          id: activeId ?? crypto.randomUUID(),
          station_id: draft.station_id,
          station_name: station.name,
          date: draft.date,
          start_time: draft.start_time,
          duration_minutes: draft.duration_minutes,
          reason: draft.reason,
          created_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('bookings').upsert(next, { onConflict: 'id' });
        if (error) {
          toast.error(error.message);
          return;
        }
        setItems((prev) => {
          const rest = prev.filter((x) => x.id !== next.id);
          return [...rest, next].sort(
            (a, b) => combineDateTime(a.date, a.start_time).getTime() - combineDateTime(b.date, b.start_time).getTime()
          );
        });
        setPanelOpen(false);
        return;
      }

      const c = draft.customer!;
      const next: BookingOrBlock = {
        kind: 'booking',
        id: activeId ?? crypto.randomUUID(),
        customer_id: c.id,
        customer_name: c.name || c.phone,
        customer_phone: c.phone,
        station_id: draft.station_id,
        station_name: station.name,
        game_type: draft.game_type,
        date: draft.date,
        start_time: draft.start_time,
        duration_minutes: draft.duration_minutes,
        controllers: draft.game_type === 'ps5' ? draft.controllers : undefined,
        vr_mode: draft.game_type === 'vr' ? draft.vr_mode : undefined,
        vr_label: draft.game_type === 'vr' ? draft.vr_label : undefined,
        notes: draft.notes,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('bookings').upsert(next, { onConflict: 'id' });
      if (error) {
        toast.error(error.message);
        return;
      }
      setItems((prev) => {
        const rest = prev.filter((x) => x.id !== next.id);
        return [...rest, next].sort(
          (a, b) => combineDateTime(a.date, a.start_time).getTime() - combineDateTime(b.date, b.start_time).getTime()
        );
      });
      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const cancelBooking = async () => {
    if (!activeItem || activeItem.kind !== 'booking') return;
    
    setDeleteConfirm({
      title: 'Cancel Booking?',
      description: 'Are you sure you want to cancel this booking? This action cannot be undone.',
      onConfirm: async () => {
        const cancelledAt = new Date().toISOString();
        const { error } = await supabase.from('bookings').update({ cancelled_at: cancelledAt }).eq('id', activeItem.id);
        if (error) {
          toast.error(error.message);
          return;
        }
        setItems((prev) =>
          prev.map((x) => (x.id === activeItem.id ? ({ ...x, cancelled_at: cancelledAt } as BookingOrBlock) : x))
        );
        setDeleteConfirm(null);
        toast.success('Booking cancelled');
      }
    });
  };

  const convertToBill = () => {
    if (!activeItem || activeItem.kind !== 'booking') return;
    window.localStorage.setItem(
      'gg_billing_prefill_v1',
      JSON.stringify({
        customer_id: activeItem.customer_id,
        game_type: activeItem.game_type,
        duration_minutes: activeItem.duration_minutes,
        controllers: activeItem.controllers ?? 2,
        station_name: activeItem.station_name,
        vr_mode: activeItem.vr_mode,
        vr_label: activeItem.vr_label,
      })
    );
    onNavigate?.('billing');
  };

  const selectedDateLabel = useMemo(() => {
    const d = parseISO(`${selectedDate}T00:00:00`);
    return format(d, 'EEEE, d MMM yyyy');
  }, [selectedDate]);

  const rowH = 32;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        active="Bookings"
        onNavigate={(next) => {
          if (next === 'Billing') onNavigate?.('billing');
          else if (next === 'Bookings') onNavigate?.('bookings');
          else if (next === 'Settings') onNavigate?.('settings');
          else if (next === 'Inventory') onNavigate?.('inventory');
          else if (next === 'Customers') onNavigate?.('customers');
          else if (next === 'Reports') onNavigate?.('reports');
        }}
        onLogout={onLogout}
      />
      <main className="flex-1 pb-24 md:ml-64 md:pb-0">
        <PageHeader 
          title="Bookings" 
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => setView((v) => (v === 'grid' ? 'list' : 'grid'))}>
                {view === 'grid' ? 'List view' : 'Grid view'}
              </Button>
              <Button size="sm" className="gap-2" onClick={() => openNew()}>
                <Plus size={16} />
                New booking
              </Button>
            </>
          }
        />

        <div className="mx-auto w-full max-w-[1600px] p-3 sm:p-4">
          {/* Today's overview strip */}
          <div className="mb-3 grid grid-cols-2 gap-2 rounded-md border border-border/50 bg-background/40 p-3 sm:grid-cols-4">
            <div className="text-xs">
              <div className="text-muted-foreground">Total</div>
              <div className="font-mono text-sm font-bold">{overview.total}</div>
            </div>
            <div className="text-xs">
              <div className="text-muted-foreground">In progress</div>
              <div className="font-mono text-sm font-bold">{overview.inProgress}</div>
            </div>
            <div className="text-xs">
              <div className="text-muted-foreground">Upcoming</div>
              <div className="font-mono text-sm font-bold">{overview.upcoming}</div>
            </div>
            <div className="text-xs">
              <div className="text-muted-foreground">Cancelled</div>
              <div className="font-mono text-sm font-bold">{overview.cancelled}</div>
            </div>
          </div>

          {/* Date navigator */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 bg-background/40 p-3">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button className="h-10 w-10" variant="outline" size="icon" onClick={() => setSelectedDate(ymd(addDays(parseISO(`${selectedDate}T00:00:00`), -1)))}>
                <ChevronLeft size={18} />
              </Button>
              <Button className="h-10 w-10" variant="outline" size="icon" onClick={() => setSelectedDate(ymd(addDays(parseISO(`${selectedDate}T00:00:00`), 1)))}>
                <ChevronRight size={18} />
              </Button>
              <div className="min-w-0 px-1 text-sm font-bold sm:px-2 sm:text-base">{selectedDateLabel}</div>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(todayYmd)}>
                Today
              </Button>
              <DatePickerButton value={selectedDate} onChange={setSelectedDate} />
            </div>
          </div>

          {isPastDay ? (
            <div className="mb-3 rounded-md border border-border/50 bg-muted/20 p-3 text-sm text-muted-foreground">
              Past dates are read-only.
            </div>
          ) : null}

          {loadingData ? (
            <div className="rounded-md border border-border/50 bg-background/40 p-6 text-sm text-muted-foreground">Loading bookings...</div>
          ) : view === 'list' ? (
            <div className="rounded-md border border-border/50 bg-background/40">
              <div className="hidden grid-cols-[120px_1fr_1fr_120px_120px] gap-2 border-b border-border/50 p-3 text-xs font-semibold text-muted-foreground md:grid">
                <div>Time</div>
                <div>Station</div>
                <div>Customer</div>
                <div>Duration</div>
                <div>Status</div>
              </div>
              <div className="divide-y divide-border/50">
                {dayBookings.map((b) => (
                  <button
                    key={b.id}
                    className="grid w-full gap-2 p-3 text-left hover:bg-accent md:grid-cols-[120px_1fr_1fr_120px_120px]"
                    type="button"
                    onClick={() => openDetail(b.id)}
                  >
                    <div className="font-mono text-sm md:text-sm">
                      {b.start_time}–{format(endDateTime(b), 'HH:mm')}
                    </div>
                    <div className="text-sm">
                      <span className="text-xs text-muted-foreground md:hidden">Station: </span>
                      {b.station_name}
                    </div>
                    <div className="text-sm">
                      <span className="text-xs text-muted-foreground md:hidden">Customer: </span>
                      {b.customer_name}
                    </div>
                    <div className="text-sm font-mono">
                      <span className="text-xs text-muted-foreground md:hidden">Duration: </span>
                      {b.duration_minutes}m
                    </div>
                    <div className="text-sm">
                      <StatusPill status={b.status} />
                    </div>
                  </button>
                ))}
                {dayBookings.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No bookings for this day.</div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-border/50 bg-background/40">
              <div className="grid" style={{ gridTemplateColumns: '120px 1fr' }}>
                {/* Fixed time column (does not scroll horizontally) */}
                <div className="border-r border-border/50">
                  <div className="p-3 text-xs font-semibold text-muted-foreground border-b border-border/50">Time</div>
                  {slots.slice(0, -1).map((t) => (
                    <div key={t} className="px-3 text-xs text-muted-foreground font-mono" style={{ height: rowH }}>
                      {t}
                    </div>
                  ))}
                </div>

                {/* Stations area (only this scrolls horizontally) */}
                <div className="overflow-x-auto">
                  <div style={{ minWidth: Math.max(980, stationsOrdered.length * 180) }}>
                    {/* Stations header row */}
                    <div
                      className="grid border-b border-border/50"
                      style={{ gridTemplateColumns: `repeat(${stationsOrdered.length}, minmax(180px, 1fr))` }}
                    >
                      {stationsOrdered.map((s) => (
                        <div key={s.id} className="p-3 text-xs font-semibold border-r border-border/50 last:border-r-0">
                          <div className="text-muted-foreground">{labelType(s.type)}</div>
                          <div className="text-sm font-bold">{s.name}</div>
                        </div>
                      ))}
                    </div>

                    {/* Stations grid body */}
                    <div className="grid" style={{ gridTemplateColumns: `repeat(${stationsOrdered.length}, minmax(180px, 1fr))` }}>
                      {stationsOrdered.map((station) => (
                        <div key={station.id} className="relative border-r border-border/50 last:border-r-0">
                          {/* slot click targets */}
                          {slots.slice(0, -1).map((t) => {
                            const disabled = isPastDay || (selectedDate === todayYmd && isPastStart(selectedDate, t));
                            return (
                              <button
                                key={t}
                                type="button"
                                className={cn(
                                  "group flex w-full items-center justify-center border-b border-border/30 text-xs",
                                  "hover:bg-muted/20",
                                  disabled && "pointer-events-none opacity-60"
                                )}
                                style={{ height: rowH }}
                                onClick={() =>
                                  openNew({
                                    station_id: station.id,
                                    game_type: station.type,
                                    start_time: t,
                                    duration_minutes: 60,
                                    kind: 'booking',
                                    customer: null,
                                  })
                                }
                              >
                                <span className="opacity-0 transition-opacity group-hover:opacity-60">+</span>
                              </button>
                            );
                          })}

                          {/* overlays */}
                          {dayItems
                            .filter((x) => x.station_id === station.id)
                            .map((x) => {
                              const startIdx = Math.max(0, slots.indexOf(x.start_time));
                              const height = Math.max(1, Math.round(x.duration_minutes / settings.slot_minutes)) * rowH;
                              const top = startIdx * rowH;
                              const label = x.kind === 'block' ? 'Blocked' : x.customer_name;
                              const type = x.kind === 'block' ? null : x.game_type;
                              const status = x.kind === 'booking' ? deriveStatus(x, now) : null;
                              return (
                                <button
                                  key={x.id}
                                  type="button"
                                  className={cn(
                                    "absolute left-2 right-2 rounded-md border px-2 py-1 text-left shadow-sm",
                                    type ? TYPE_COLORS[type] : 'bg-muted/30 border-border text-muted-foreground',
                                    status === 'in_progress' && 'ring-1 ring-red-500/60',
                                    x.kind === 'booking' && (x as any).cancelled_at && 'opacity-50 line-through'
                                  )}
                                  style={{ top, height }}
                                  onClick={() => openDetail(x.id)}
                                >
                                  <div className="truncate text-xs font-semibold">{label}</div>
                                  <div className="mt-0.5 flex items-center justify-between text-[11px] font-mono opacity-80">
                                    <span>
                                      {x.start_time}–{format(endDateTime(x), 'HH:mm')}
                                    </span>
                                    {status ? <StatusDot status={status} /> : null}
                                  </div>
                                </button>
                              );
                            })}

                          {/* Current time indicator */}
                          {selectedDate === todayYmd ? (
                            (() => {
                              const openDT = combineDateTime(todayYmd, settings.opening_time);
                              const mins = Math.round((now.getTime() - openDT.getTime()) / 60000);
                              const idx = mins / settings.slot_minutes;
                              if (idx < 0 || idx > slots.length - 1) return null;
                              return <div className="pointer-events-none absolute left-0 right-0 h-px bg-red-500" style={{ top: idx * rowH }} />;
                            })()
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Booking Dialog (Popup) */}
        <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
          <DialogContent className="sm:max-w-[520px] bg-background/95 backdrop-blur-xl border-border/50 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-border/50 pb-4 mb-4">
              <DialogTitle className="flex flex-col gap-1">
                <span>{panelMode === 'new' ? 'New Booking' : panelMode === 'edit' ? 'Edit Booking' : 'Booking Details'}</span>
                <span className="text-xs font-normal text-muted-foreground tracking-normal">{selectedDateLabel}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {panelMode === 'detail' && activeItem ? (
                <div className="space-y-4">
                  {activeItem.kind === 'booking' ? (
                    <>
                      <div className="rounded-md border border-border/50 bg-background/40 p-3">
                        <div className="text-xs text-muted-foreground">Customer</div>
                        <div className="text-sm font-semibold">{activeItem.customer_name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{activeItem.customer_phone}</div>
                      </div>

                      <div className="rounded-md border border-border/50 bg-background/40 p-3">
                        <div className="text-xs text-muted-foreground">Session</div>
                        <div className="text-sm font-semibold">
                          {activeItem.station_name} · {labelType(activeItem.game_type)}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {activeItem.date} · {activeItem.start_time}–{format(endDateTime(activeItem), 'HH:mm')} · {activeItem.duration_minutes}m
                        </div>
                        {activeItem.controllers ? (
                          <div className="mt-1 text-xs text-muted-foreground">Controllers: {activeItem.controllers}</div>
                        ) : null}
                        {activeItem.vr_mode ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            VR: {activeItem.vr_mode} {activeItem.vr_label ? `· ${activeItem.vr_label}` : ''}
                          </div>
                        ) : null}
                      </div>

                      {activeItem.notes ? (
                        <div className="rounded-md border border-border/50 bg-background/40 p-3">
                          <div className="text-xs text-muted-foreground">Notes</div>
                          <div className="text-sm whitespace-pre-wrap">{activeItem.notes}</div>
                        </div>
                      ) : null}

                      <div className="flex items-center gap-2 pt-2">
                        <Button variant="outline" onClick={openEdit} disabled={isPastDay || !!(activeItem as any).cancelled_at}>
                          Edit
                        </Button>
                        <Button variant="destructive" onClick={cancelBooking} disabled={!!(activeItem as any).cancelled_at}>
                          Cancel
                        </Button>
                        <Button className="ml-auto" onClick={convertToBill}>
                          Convert to bill
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-md border border-border/50 bg-muted/20 p-3">
                        <div className="text-sm font-semibold">Blocked</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {activeItem.station_name} · {activeItem.start_time}–{format(endDateTime(activeItem), 'HH:mm')} · {activeItem.duration_minutes}m
                        </div>
                        {activeItem.reason ? <div className="mt-2 text-sm">{activeItem.reason}</div> : null}
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Button variant="destructive" onClick={() => {
                          setDeleteConfirm({
                            title: 'Remove Block?',
                            description: 'Are you sure you want to remove this block? The station will become available for bookings.',
                            onConfirm: async () => {
                              const { error } = await supabase.from('bookings').delete().eq('id', activeItem.id);
                              if (error) {
                                toast.error(error.message);
                                return;
                              }
                              setItems(prev => prev.filter(x => x.id !== activeItem.id));
                              setDeleteConfirm(null);
                              setPanelOpen(false);
                              toast.success('Block removed');
                            }
                          });
                        }}>
                          Remove Block
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold text-muted-foreground">Type</label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={draft.kind === 'booking' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDraft((d) => ({ ...d, kind: 'booking' }))}
                      >
                        Booking
                      </Button>
                      <Button
                        type="button"
                        variant={draft.kind === 'block' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDraft((d) => ({ ...d, kind: 'block' }))}
                      >
                        Block
                      </Button>
                    </div>
                  </div>

                  {draft.kind === 'booking' ? (
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-muted-foreground">Customer (required)</label>
                      <CustomerPicker
                        customers={customers}
                        value={draft.customer}
                        onChange={(c) => setDraft((d) => ({ ...d, customer: c }))}
                        onCreate={async (payload) => {
                          const newId = `CUS-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
                          const createdPayload = {
                            id: newId,
                            name: payload.name || payload.phone,
                            phone: payload.phone,
                            whatsapp_number: payload.whatsapp_number || payload.phone,
                            loyalty_points: 0,
                            visits: 0,
                          };
                          const { data, error } = await supabase
                            .from('customers')
                            .insert(createdPayload)
                            .select('*')
                            .single();
                          if (error) {
                            toast.error(error.message);
                            return;
                          }
                          const created = data as Customer;
                          setCustomers((prev) => [created, ...prev]);
                          setDraft((d) => ({ ...d, customer: created }));
                        }}
                        disabled={isPastDay}
                      />
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-muted-foreground">Reason</label>
                      <Input
                        disabled={isPastDay}
                        value={draft.reason ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
                        className="h-10"
                        placeholder="Maintenance, staff break, etc."
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-muted-foreground">Game type</label>
                      <select
                        disabled={isPastDay}
                        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                        value={draft.game_type}
                        onChange={(e) => {
                          const nextType = e.target.value as StationType;
                          const firstStation = stationsOrdered.find((s) => s.type === nextType) ?? stationsOrdered[0];
                          setDraft((d) => ({ ...d, game_type: nextType, station_id: firstStation?.id ?? d.station_id }));
                        }}
                      >
                        <option value="ps5">PS5</option>
                        <option value="snooker">Snooker</option>
                        <option value="pool">Pool</option>
                        <option value="vr">VR</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-muted-foreground">Station</label>
                      <select
                        disabled={isPastDay}
                        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                        value={draft.station_id}
                        onChange={(e) => setDraft((d) => ({ ...d, station_id: e.target.value }))}
                      >
                        {stationsOrdered
                          .filter((s) => s.type === draft.game_type)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-muted-foreground">Date</label>
                      <input
                        disabled={isPastDay}
                        type="date"
                        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                        value={draft.date}
                        onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-muted-foreground">Start time</label>
                      <select
                        disabled={isPastDay}
                        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                        value={draft.start_time}
                        onChange={(e) => setDraft((d) => ({ ...d, start_time: e.target.value }))}
                      >
                        {slots.slice(0, -1).map((t) => (
                          <option key={t} value={t} disabled={draft.date === todayYmd && isPastStart(draft.date, t)}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-muted-foreground">Duration</label>
                      <select
                        disabled={isPastDay}
                        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                        value={String(draft.duration_minutes)}
                        onChange={(e) => setDraft((d) => ({ ...d, duration_minutes: Number(e.target.value) }))}
                      >
                        {[15, 30, 60, 90, 120, 150, 180, 240].map((m) => (
                          <option key={m} value={m}>
                            {m < 60 ? `${m} min` : m === 60 ? '1 hr' : `${m / 60} hr`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-muted-foreground">Ends at</label>
                      <div className="h-10 rounded-md border border-border/50 bg-muted/20 px-3 text-sm font-mono flex items-center">
                        {format(addMinutes(combineDateTime(draft.date, draft.start_time), draft.duration_minutes), 'hh:mm a')}
                      </div>
                    </div>
                  </div>

                  {draft.game_type === 'ps5' ? (
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-muted-foreground">Controllers</label>
                      <select
                        disabled={isPastDay}
                        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                        value={String(draft.controllers ?? 2)}
                        onChange={(e) => setDraft((d) => ({ ...d, controllers: Number(e.target.value) }))}
                      >
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {draft.game_type === 'vr' ? (
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-muted-foreground">VR type</label>
                      <select
                        disabled={isPastDay}
                        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                        value={draft.vr_mode ?? 'cricket'}
                        onChange={(e) => setDraft((d) => ({ ...d, vr_mode: e.target.value as any }))}
                      >
                        <option value="cricket">Cricket</option>
                        <option value="adventure">Adventure</option>
                      </select>
                      <Input
                        disabled={isPastDay}
                        value={draft.vr_label ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, vr_label: e.target.value }))}
                        className="h-10"
                        placeholder="Format / game (optional)"
                      />
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <label className="text-xs font-semibold text-muted-foreground">Notes</label>
                    <textarea
                      disabled={isPastDay}
                      className="min-h-[90px] rounded-md border border-input bg-background p-2 text-sm"
                      value={draft.notes ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                      placeholder="Optional notes"
                    />
                  </div>

                  <DialogFooter className="pt-4 border-t border-border/50">
                    <Button
                      className="w-full"
                      disabled={
                        isPastDay ||
                        (draft.date === todayYmd && isPastStart(draft.date, draft.start_time)) ||
                        (draft.kind === 'booking' && !draft.customer) ||
                        saving
                      }
                      onClick={saveDraft}
                    >
                      {saving ? 'Saving...' : 'Save Booking'}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile FAB */}
        <div className="fixed bottom-[80px] right-6 z-50 md:hidden">
          <Button 
            className="h-14 w-14 rounded-full shadow-lg shadow-primary/30"
            onClick={() => openNew()}
            disabled={isPastDay}
          >
            <Plus size={24} />
          </Button>
        </div>

        {/* Global Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-[400px] bg-background/95 backdrop-blur-xl border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle size={20} />
                {deleteConfirm?.title}
              </DialogTitle>
              <DialogDescription className="py-4 text-sm text-muted-foreground">
                {deleteConfirm?.description}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={deleteConfirm?.onConfirm}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function labelType(t: StationType) {
  return t === 'ps5' ? 'PS5' : t === 'snooker' ? 'Snooker' : t === 'pool' ? 'Pool' : 'VR';
}

function StatusPill({ status }: { status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled' }) {
  const cls =
    status === 'in_progress'
      ? 'bg-red-500/15 text-red-200 border-red-500/40'
      : status === 'upcoming'
        ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40'
        : status === 'completed'
          ? 'bg-muted/40 text-muted-foreground border-border'
          : 'bg-muted/30 text-muted-foreground border-border line-through';
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs', cls)}>{status.replace('_', ' ')}</span>;
}

function StatusDot({ status }: { status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled' }) {
  const cls =
    status === 'in_progress'
      ? 'bg-red-400'
      : status === 'upcoming'
        ? 'bg-emerald-400'
        : status === 'completed'
          ? 'bg-muted-foreground'
          : 'bg-muted-foreground';
  return <span className={cn('inline-block h-2 w-2 rounded-full', cls)} />;
}

function DatePickerButton({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <Button variant="outline" size="icon" onClick={() => inputRef.current?.showPicker?.() ?? inputRef.current?.click()}>
        <Calendar size={18} />
      </Button>
      <input
        ref={inputRef}
        type="date"
        className="sr-only"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  );
}

