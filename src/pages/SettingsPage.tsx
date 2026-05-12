import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PRICING_CONFIG, GamePricingConfig, normalizePricingConfig } from '@/lib/pricing';
import { DEFAULT_SETTINGS, Station, StationType } from '@/lib/bookings';

type EditableStation = Station & { isNew?: boolean };

const DURATIONS = [15, 30, 60, 90, 120, 150, 180, 240];

export default function SettingsPage({
  onNavigate,
  onLogout,
}: {
  onNavigate?: (next: 'billing' | 'bookings' | 'settings' | 'inventory' | 'customers') => void;
  onLogout?: () => void;
}) {
  const [stations, setStations] = useState<EditableStation[]>([]);
  const [bookingSettings, setBookingSettings] = useState(DEFAULT_SETTINGS);
  const [pricingConfig, setPricingConfig] = useState<GamePricingConfig>(DEFAULT_PRICING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = 'Settings · Goat Gaming';
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: stationRows }, { data: bookingRow }, { data: pricingRow }] = await Promise.all([
        supabase.from('stations').select('id,name,type').order('name'),
        supabase.from('booking_settings').select('opening_time,closing_time,slot_minutes').eq('id', 1).maybeSingle(),
        supabase.from('pricing_settings').select('config').eq('id', 1).maybeSingle(),
      ]);
      setStations((stationRows ?? []) as EditableStation[]);
      if (bookingRow) {
        setBookingSettings({
          opening_time: bookingRow.opening_time,
          closing_time: bookingRow.closing_time,
          slot_minutes: bookingRow.slot_minutes,
        });
      }
      setPricingConfig(normalizePricingConfig(pricingRow?.config));
      setLoading(false);
    };
    load();
  }, []);

  const ps5Controllers = [1, 2, 3, 4];
  const snookerDurations = DURATIONS.filter((d) => d <= 180);

  const addStation = () => {
    setStations((prev) => [...prev, { id: `station-${Date.now()}`, name: '', type: 'ps5', isNew: true }]);
  };

  const removeStation = async (id: string, isNew?: boolean) => {
    if (isNew) {
      setStations((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    if (!confirm('Delete this station? Existing bookings for this station must be removed first.')) return;
    const { error } = await supabase.from('stations').delete().eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    setStations((prev) => prev.filter((s) => s.id !== id));
  };

  const saveAll = async () => {
    setSaving(true);
    const cleanedStations = stations
      .map((s) => ({ id: s.id.trim(), name: s.name.trim(), type: s.type }))
      .filter((s) => s.id && s.name);
    const { error: stationError } = await supabase.from('stations').upsert(cleanedStations, { onConflict: 'id' });
    if (stationError) {
      alert(stationError.message);
      setSaving(false);
      return;
    }

    const { error: bookingSettingsError } = await supabase
      .from('booking_settings')
      .upsert({ id: 1, ...bookingSettings }, { onConflict: 'id' });
    if (bookingSettingsError) {
      alert(bookingSettingsError.message);
      setSaving(false);
      return;
    }

    const { error: pricingError } = await supabase
      .from('pricing_settings')
      .upsert({ id: 1, config: pricingConfig }, { onConflict: 'id' });
    if (pricingError) {
      alert(pricingError.message);
      setSaving(false);
      return;
    }
    setStations(cleanedStations);
    setSaving(false);
    alert('Settings saved.');
  };

  const stationTypeOptions: StationType[] = ['ps5', 'snooker', 'pool', 'vr'];
  const vrCricket = pricingConfig.vr_cricket;
  const vrAdventure = pricingConfig.vr_adventure;
  const totalStations = useMemo(() => stations.length, [stations]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        active="Settings"
        onNavigate={(next) => {
          if (next === 'Billing') onNavigate?.('billing');
          else if (next === 'Bookings') onNavigate?.('bookings');
          else if (next === 'Inventory') onNavigate?.('inventory');
          else if (next === 'Customers') onNavigate?.('customers');
        }}
        onLogout={onLogout}
      />
      <main className="flex-1 pb-24 md:ml-64 md:pb-0">
        <PageHeader 
          title="Settings" 
          actions={
            <Button onClick={saveAll} disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save all changes'}
            </Button>
          }
        />

        <div className="mx-auto w-full max-w-[1600px] space-y-4 p-3 sm:p-4">
          {loading ? <div className="rounded-md border border-border/50 bg-background/40 p-4 text-sm text-muted-foreground">Loading settings...</div> : null}

          <section className="rounded-md border border-border/50 bg-background/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Stations ({totalStations})</h3>
              <Button size="sm" variant="outline" onClick={addStation}>
                Add station
              </Button>
            </div>
            <div className="space-y-2">
              {stations.map((station) => (
                <div key={station.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_140px_90px]">
                  <Input
                    placeholder="Station ID (example: ps5-4)"
                    value={station.id}
                    onChange={(e) => setStations((prev) => prev.map((x) => (x.id === station.id ? { ...x, id: e.target.value } : x)))}
                    disabled={!station.isNew}
                  />
                  <Input
                    placeholder="Station name"
                    value={station.name}
                    onChange={(e) => setStations((prev) => prev.map((x) => (x.id === station.id ? { ...x, name: e.target.value } : x)))}
                  />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                    value={station.type}
                    onChange={(e) =>
                      setStations((prev) => prev.map((x) => (x.id === station.id ? { ...x, type: e.target.value as StationType } : x)))
                    }
                  >
                    {stationTypeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="destructive" onClick={() => removeStation(station.id, station.isNew)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border/50 bg-background/40 p-4">
            <h3 className="mb-3 text-sm font-semibold">Booking timings</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              These timings control when customers can book slots and the slot size used in the bookings calendar.
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Opening time</span>
                <Input
                  type="time"
                  value={bookingSettings.opening_time}
                  onChange={(e) => setBookingSettings((s) => ({ ...s, opening_time: e.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Closing time</span>
                <Input
                  type="time"
                  value={bookingSettings.closing_time}
                  onChange={(e) => setBookingSettings((s) => ({ ...s, closing_time: e.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Slot length (minutes)</span>
                <Input
                  type="number"
                  min={5}
                  value={bookingSettings.slot_minutes}
                  onChange={(e) => setBookingSettings((s) => ({ ...s, slot_minutes: Number(e.target.value) || s.slot_minutes }))}
                />
              </label>
            </div>
          </section>

          <section className="rounded-md border border-border/50 bg-background/40 p-4">
            <h3 className="mb-3 text-sm font-semibold">Pricing</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              All values below are final prices charged to customers. Updating a number changes the billing amount for that exact game and duration.
            </p>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">PS5 (controllers x duration)</div>
              <div className="hidden grid-cols-6 gap-2 text-[11px] font-medium text-muted-foreground md:grid">
                {DURATIONS.slice(0, 6).map((duration) => (
                  <div key={`ps5-header-${duration}`}>{duration} min</div>
                ))}
              </div>
              {ps5Controllers.map((controller) => (
                <div key={controller} className="space-y-1">
                  <div className="text-[11px] font-medium text-muted-foreground">{controller} controller{controller > 1 ? 's' : ''}</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
                  {DURATIONS.slice(0, 6).map((duration) => {
                    const key = `${controller}-${duration}`;
                    return (
                      <Input
                        key={key}
                        type="number"
                        value={pricingConfig.ps5[key] ?? 0}
                        onChange={(e) =>
                          setPricingConfig((p) => ({ ...p, ps5: { ...p.ps5, [key]: Number(e.target.value) || 0 } }))
                        }
                        placeholder="Price"
                      />
                    );
                  })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">Snooker</div>
                <div className="mb-2 text-[11px] text-muted-foreground">Price by duration</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {snookerDurations.map((duration) => (
                    <label key={`snooker-${duration}`} className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground">{duration} minutes</span>
                      <Input
                        type="number"
                        value={pricingConfig.snooker[String(duration)] ?? 0}
                        onChange={(e) =>
                          setPricingConfig((p) => ({
                            ...p,
                            snooker: { ...p.snooker, [String(duration)]: Number(e.target.value) || 0 },
                          }))
                        }
                        placeholder="Price"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">Pool</div>
                <div className="mb-2 text-[11px] text-muted-foreground">Price by duration</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {snookerDurations.map((duration) => (
                    <label key={`pool-${duration}`} className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground">{duration} minutes</span>
                      <Input
                        type="number"
                        value={pricingConfig.pool[String(duration)] ?? 0}
                        onChange={(e) =>
                          setPricingConfig((p) => ({
                            ...p,
                            pool: { ...p.pool, [String(duration)]: Number(e.target.value) || 0 },
                          }))
                        }
                        placeholder="Price"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">VR Cricket</div>
                <div className="mb-2 hidden grid-cols-[1fr_110px_110px] gap-2 text-[11px] font-medium text-muted-foreground sm:grid">
                  <div>Package name</div>
                  <div>Duration</div>
                  <div>Price</div>
                </div>
                <div className="space-y-2">
                  {vrCricket.map((v, idx) => (
                    <div key={`${v.label}-${idx}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_110px_110px]">
                      <Input
                        value={v.label}
                        onChange={(e) =>
                          setPricingConfig((p) => {
                            const next = [...p.vr_cricket];
                            next[idx] = { ...next[idx], label: e.target.value };
                            return { ...p, vr_cricket: next };
                          })
                        }
                        placeholder="Label"
                      />
                      <Input
                        type="number"
                        value={v.minutes}
                        onChange={(e) =>
                          setPricingConfig((p) => {
                            const next = [...p.vr_cricket];
                            next[idx] = { ...next[idx], minutes: Number(e.target.value) || 0 };
                            return { ...p, vr_cricket: next };
                          })
                        }
                        placeholder="Minutes"
                      />
                      <Input
                        type="number"
                        value={v.price}
                        onChange={(e) =>
                          setPricingConfig((p) => {
                            const next = [...p.vr_cricket];
                            next[idx] = { ...next[idx], price: Number(e.target.value) || 0 };
                            return { ...p, vr_cricket: next };
                          })
                        }
                        placeholder="Price"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">VR Adventure</div>
                <div className="mb-2 hidden grid-cols-[1fr_110px_110px] gap-2 text-[11px] font-medium text-muted-foreground sm:grid">
                  <div>Package name</div>
                  <div>Duration</div>
                  <div>Price</div>
                </div>
                <div className="space-y-2">
                  {vrAdventure.map((v, idx) => (
                    <div key={`${v.label}-${idx}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_110px_110px]">
                      <Input
                        value={v.label}
                        onChange={(e) =>
                          setPricingConfig((p) => {
                            const next = [...p.vr_adventure];
                            next[idx] = { ...next[idx], label: e.target.value };
                            return { ...p, vr_adventure: next };
                          })
                        }
                        placeholder="Label"
                      />
                      <Input
                        type="number"
                        value={v.minutes}
                        onChange={(e) =>
                          setPricingConfig((p) => {
                            const next = [...p.vr_adventure];
                            next[idx] = { ...next[idx], minutes: Number(e.target.value) || 0 };
                            return { ...p, vr_adventure: next };
                          })
                        }
                        placeholder="Minutes"
                      />
                      <Input
                        type="number"
                        value={v.price}
                        onChange={(e) =>
                          setPricingConfig((p) => {
                            const next = [...p.vr_adventure];
                            next[idx] = { ...next[idx], price: Number(e.target.value) || 0 };
                            return { ...p, vr_adventure: next };
                          })
                        }
                        placeholder="Price"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
        <div className="fixed inset-x-0 bottom-[70px] z-40 border-t border-border/50 bg-background/90 p-3 backdrop-blur-xl md:hidden">
          <Button className="w-full" onClick={saveAll} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save all changes'}
          </Button>
        </div>
      </main>
    </div>
  );
}
