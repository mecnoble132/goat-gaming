import { useEffect, useMemo, useRef, useState } from 'react';
import { Customer } from '@/types';
import { Search, UserPlus, Edit2, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface CustomerStripProps {
  selectedCustomer: Customer | null;
  allCustomers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onClearCustomer: () => void;
  onCreateCustomer: (payload: { name?: string; phone: string; whatsapp_number?: string }) => void;
}

export function CustomerStrip({ 
  selectedCustomer, 
  allCustomers,
  onSelectCustomer, 
  onClearCustomer,
  onCreateCustomer,
}: CustomerStripProps) {
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [sameWhatsapp, setSameWhatsapp] = useState(true);
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allCustomers.filter((customer) => customer.name?.toLowerCase().includes(q) || customer.phone.includes(search.trim()));
  }, [allCustomers, search]);

  useEffect(() => {
    if (!isSearching) return;
    const controller = new AbortController();

    window.addEventListener(
      'pointerdown',
      (e) => {
        const root = rootRef.current;
        if (!root) return;
        if (root.contains(e.target as Node)) return;
        setIsSearching(false);
        setShowCreateForm(false);
      },
      { signal: controller.signal }
    );

    return () => controller.abort();
  }, [isSearching]);

  const handleSelect = (m: Customer) => {
    onSelectCustomer(m);
    setSearch('');
    setIsSearching(false);
    setShowCreateForm(false);
  };

  const submitNewCustomer = () => {
    if (!newPhone.trim()) return;
    const whatsapp = sameWhatsapp ? newPhone.trim() : newWhatsapp.trim();
    onCreateCustomer({
      name: newName.trim() || undefined,
      phone: newPhone.trim(),
      whatsapp_number: whatsapp || undefined,
    });
    setNewName('');
    setNewPhone('');
    setNewWhatsapp('');
    setSameWhatsapp(true);
    setShowCreateForm(false);
    setSearch('');
    setIsSearching(false);
  };

  return (
    <div className="sticky top-[57px] z-30 w-full border-b border-border/50 bg-background/80 backdrop-blur-md md:top-0">
      <div className="mx-auto max-w-[1600px] px-4 py-3">
        {selectedCustomer ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Avatar className="h-9 w-9 bg-primary/10 text-primary font-bold text-sm border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.15)]">
                <AvatarFallback>{selectedCustomer.name?.substring(0, 2).toUpperCase() || 'CU'}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-sm font-bold leading-none tracking-tight">{selectedCustomer.name || 'Anonymous Customer'}</h3>
                <p className="font-mono text-[11px] text-muted-foreground mt-1">{selectedCustomer.phone}</p>
              </div>
              <div className="ml-2 flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 shadow-[0_0_10px_rgba(var(--secondary),0.08)]">
                <Star size={14} className="fill-secondary text-secondary" />
                <span className="font-mono text-xs font-bold text-secondary">{selectedCustomer.loyalty_points} pts</span>
              </div>
            </div>
            <Button
              variant="ghost" 
              size="sm" 
              className="gap-2 self-start text-primary transition-all hover:bg-primary/10 hover:text-primary sm:self-auto"
              onClick={() => {
                setSearch('');
                setShowCreateForm(false);
                setIsSearching(false);
                onClearCustomer();
              }}
            >
              Change <Edit2 size={14} />
            </Button>
          </div>
        ) : (
          <div className="relative w-full" ref={rootRef}>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 transition-colors",
                  isSearching ? "text-primary" : "text-muted-foreground"
                )} size={18} />
                <Input 
                  placeholder="Search by name or phone number" 
                  className="h-11 pl-10 pr-3 text-sm rounded-xl border-border/50 bg-muted/20 focus:ring-primary focus:bg-background transition-all shadow-sm"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setIsSearching(!!e.target.value);
                  }}
                  onFocus={() => setIsSearching(true)}
                />

                {isSearching && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border bg-popover shadow-xl animate-in fade-in slide-in-from-top-2">
                    <div className="max-h-[300px] overflow-y-auto p-2">
                      {results.length > 0 && !showCreateForm ? (
                        results.map(m => (
                          <button
                            key={m.id}
                            className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-accent transition-colors"
                            onClick={() => handleSelect(m)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-muted text-xs">{m.name?.substring(0, 2).toUpperCase() || 'CU'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold">{m.name}</p>
                                <p className="font-mono text-xs text-muted-foreground">{m.phone}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="font-mono">{m.loyalty_points} pts</Badge>
                          </button>
                        ))
                      ) : showCreateForm ? (
                        <div className="space-y-3 p-3">
                          <p className="text-xs font-semibold text-muted-foreground">Create new customer</p>
                          <Input
                            placeholder="Name (optional)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                          />
                          <Input
                            placeholder="Phone number (required)"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                          />
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={sameWhatsapp}
                              onChange={(e) => setSameWhatsapp(e.target.checked)}
                            />
                            WhatsApp same as phone
                          </label>
                          {!sameWhatsapp && (
                            <Input
                              placeholder="WhatsApp number"
                              value={newWhatsapp}
                              onChange={(e) => setNewWhatsapp(e.target.value)}
                            />
                          )}
                          <Button className="w-full" onClick={submitNewCustomer} disabled={!newPhone.trim()}>
                            Save and attach customer
                          </Button>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No customer found matching "{search}"
                        </div>
                      )}
                    </div>
                    <div className="border-t bg-muted/30 p-2">
                      <Button variant="ghost" className="w-full justify-start gap-2 text-primary" onClick={() => setShowCreateForm(true)}>
                        <UserPlus size={18} />
                        Create new customer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
