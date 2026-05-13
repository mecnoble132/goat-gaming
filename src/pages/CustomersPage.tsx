import { useEffect, useState, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Phone, 
  MessageSquare,
  Award,
  Calendar,
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/types';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function CustomersPage({
  onNavigate,
  onLogout,
}: {
  onNavigate?: (next: 'billing' | 'bookings' | 'settings' | 'inventory' | 'customers' | 'reports') => void;
  onLogout?: () => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Customer | 'joined'; direction: 'asc' | 'desc' }>({
    key: 'joined',
    direction: 'desc'
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp_number: '',
    loyalty_points: 0
  });

  useEffect(() => {
    document.title = 'Customers · Goat Gaming';
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase();
    let result = customers.filter(c => 
      c.name?.toLowerCase().includes(q) || 
      c.phone.includes(q) ||
      c.id.toLowerCase().includes(q)
    );

    // Sorting
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortConfig.key === 'joined') {
        aValue = new Date(a.created_at || 0).getTime();
        bValue = new Date(b.created_at || 0).getTime();
      } else {
        aValue = a[sortConfig.key as keyof Customer] ?? '';
        bValue = b[sortConfig.key as keyof Customer] ?? '';
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [customers, search, sortConfig]);

  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalLoyaltyPoints = customers.reduce((acc, c) => acc + (c.loyalty_points || 0), 0);
    const topCustomer = customers.reduce((prev, current) => 
      ((prev.loyalty_points || 0) > (current.loyalty_points || 0)) ? prev : current, 
      customers[0]
    );
    return { totalCustomers, totalLoyaltyPoints, topCustomer };
  }, [customers]);

  const toggleSort = (key: keyof Customer | 'joined') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSave = async () => {
    if (!formData.phone || !formData.name) {
      toast.error('Name and Phone are required');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        whatsapp_number: formData.whatsapp_number.trim() || formData.phone.trim(),
        loyalty_points: Number(formData.loyalty_points)
      };

      let error;
      if (editingCustomer) {
        const { error: err } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', editingCustomer.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('customers')
          .insert({ ...payload, created_at: new Date().toISOString() });
        error = err;
      }

      if (error) throw error;

      toast.success(editingCustomer ? 'Customer updated' : 'Customer added');
      setIsAddDialogOpen(false);
      setEditingCustomer(null);
      resetForm();
      loadCustomers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDelete);

      if (error) throw error;
      toast.success('Customer deleted');
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
      loadCustomers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      whatsapp_number: '',
      loyalty_points: 0
    });
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone,
      whatsapp_number: customer.whatsapp_number || customer.phone,
      loyalty_points: customer.loyalty_points || 0
    });
    setIsAddDialogOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        active="Customers"
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
      
      <main className="flex-1 pb-24 md:ml-64 md:pb-0 overflow-x-hidden">
        <PageHeader 
          title="Customers" 
          actions={
            <>
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input 
                  placeholder="Search name or phone..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-48 pl-9 rounded-lg bg-muted/30 border-border/50 transition-all duration-300 focus:w-64 focus:bg-background focus:border-primary/40 focus:ring-[4px] focus:ring-primary/10 focus:shadow-[0_0_20px_rgba(var(--primary),0.1)] outline-none"
                />
              </div>
              
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) {
                  setEditingCustomer(null);
                  resetForm();
                }
              }}>
                <Button size="sm" className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus size={16} /> Add Customer
                </Button>
                <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-border/50">
                  <DialogHeader>
                    <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</label>
                      <Input 
                        placeholder="Customer Name" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                      <Input 
                        placeholder="10-digit mobile" 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp Number</label>
                      <Input 
                        placeholder="WhatsApp number" 
                        value={formData.whatsapp_number}
                        onChange={e => setFormData({...formData, whatsapp_number: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GG Points</label>
                      <Input 
                        type="number" 
                        value={formData.loyalty_points}
                        onChange={e => setFormData({...formData, loyalty_points: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={actionLoading}>
                      {actionLoading ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Add Customer'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          }
        />

        <div className="mx-auto w-full max-w-[1600px] p-3 sm:p-4 space-y-4 md:space-y-6">
          {/* Mobile Search */}
          <div className="relative md:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="Search customers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-10 rounded-xl bg-background/50 border-border/50 backdrop-blur-sm transition-all duration-300 focus:bg-background focus:border-primary/40 focus:ring-[4px] focus:ring-primary/10 focus:shadow-[0_0_25px_rgba(var(--primary),0.12)] outline-none"
            />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 max-w-2xl">
      <div className="rounded-xl border border-border/50 bg-background/40 p-3 md:p-4 shadow-sm">
        <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Visits</div>
        <div className="text-xl md:text-2xl font-black text-foreground italic">{customers.reduce((acc, c) => acc + (c.visits || 0), 0)}</div>
      </div>
      <div className="rounded-xl border border-border/50 bg-background/40 p-3 md:p-4 shadow-sm">
        <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Total GG Points</div>
        <div className="text-xl md:text-2xl font-black text-primary italic">{stats.totalLoyaltyPoints.toLocaleString()}</div>
      </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-background/40 shadow-xl overflow-hidden backdrop-blur-md max-w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th 
                      className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleSort('name')}
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        Customer
                        <ArrowUpDown size={10} className={sortConfig.key === 'name' ? 'text-primary' : 'text-muted-foreground/50'} />
                      </div>
                    </th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact</th>
                    <th 
                      className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground text-center cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleSort('loyalty_points')}
                    >
                      <div className="flex items-center justify-center gap-1 md:gap-2">
                        GG Points
                        <ArrowUpDown size={10} className={sortConfig.key === 'loyalty_points' ? 'text-primary' : 'text-muted-foreground/50'} />
                      </div>
                    </th>
                    <th 
                      className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground text-center cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleSort('visits')}
                    >
                      <div className="flex items-center justify-center gap-1 md:gap-2">
                        Visits
                        <ArrowUpDown size={10} className={sortConfig.key === 'visits' ? 'text-primary' : 'text-muted-foreground/50'} />
                      </div>
                    </th>
                    <th 
                      className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleSort('joined')}
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        Joined
                        <ArrowUpDown size={10} className={sortConfig.key === 'joined' ? 'text-primary' : 'text-muted-foreground/50'} />
                      </div>
                    </th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <span>Loading customers...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                        {search ? `No customers matching "${search}"` : 'No customers yet'}
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="group hover:bg-muted/30 transition-colors">
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <div className="flex items-center gap-2 md:gap-3">
                            <div className="h-7 w-7 md:h-9 md:w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs md:text-sm">
                              {(customer.name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-foreground italic text-sm md:text-base leading-tight">{customer.name || 'Unnamed'}</div>
                              <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-mono tracking-tighter">{customer.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm">
                              <Phone size={10} className="text-muted-foreground md:w-[12px] md:h-[12px]" />
                              <span className="font-mono">{customer.phone}</span>
                            </div>
                            <div className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm text-muted-foreground">
                              <MessageSquare size={10} className="md:w-[12px] md:h-[12px]" />
                              <span className="font-mono text-[10px] md:text-xs">{customer.whatsapp_number}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center">
                            <Badge variant="outline" className="gap-1 px-2 py-0.5 border-primary/30 bg-primary/5 text-primary">
                              <Award size={10} />
                              {customer.loyalty_points || 0} GG pts
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-sm">{customer.visits || 0}</span>
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 text-[11px] md:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <Calendar size={10} className="md:w-[12px] md:h-[12px]" />
                            {customer.created_at ? format(new Date(customer.created_at), 'dd MMM yyyy') : 'N/A'}
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 text-right">
                          <div className="flex justify-end gap-1 md:gap-2">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 md:h-8 md:w-8 rounded-full hover:bg-primary/20 hover:text-primary"
                              onClick={() => openEdit(customer)}
                            >
                              <Edit2 size={12} md:size={14} />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 md:h-8 md:w-8 rounded-full hover:bg-red-500/20 hover:text-red-500"
                              onClick={() => {
                                setCustomerToDelete(customer.id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 size={12} md:size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px] bg-background/95 backdrop-blur-xl border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-500">
                <AlertTriangle size={20} />
                Confirm Deletion
              </DialogTitle>
              <div className="py-4 text-sm text-muted-foreground">
                Are you sure you want to delete this customer? This action cannot be undone and will remove all their records from the system.
              </div>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
                {actionLoading ? 'Deleting...' : 'Delete Customer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mobile FAB */}
        <div className="fixed bottom-[80px] right-6 z-50 md:hidden">
          <Button 
            className="h-14 w-14 rounded-full shadow-lg shadow-primary/30"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus size={24} />
          </Button>
        </div>
      </main>
    </div>
  );
}
