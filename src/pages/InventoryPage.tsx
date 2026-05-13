import { useEffect, useState, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  AlertTriangle,
  ArrowUpDown,
  Filter,
  Check,
  Minus,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';

export default function InventoryPage({
  onNavigate,
  onLogout,
}: {
  onNavigate?: (next: 'billing' | 'bookings' | 'settings' | 'inventory' | 'customers' | 'reports') => void;
  onLogout?: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: '',
    mrp: 0,
    stock_quantity: 0,
    low_stock_threshold: 5
  });

  useEffect(() => {
    document.title = 'Inventory · Goat Gaming';
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  }, [products, search]);

  const stats = useMemo(() => {
    const totalItems = products.length;
    const totalStockValue = products.reduce((acc, p) => acc + (p.mrp * p.stock_quantity), 0);
    const lowStockCount = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold).length;
    const outOfStockCount = products.filter(p => p.stock_quantity === 0).length;
    return { totalItems, totalStockValue, lowStockCount, outOfStockCount };
  }, [products]);

  const handleSave = async () => {
    if (!formData.id || !formData.name || !formData.category) {
      toast.error('Please fill all required fields');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .upsert({
          id: formData.id.trim().toUpperCase(),
          name: formData.name.trim(),
          category: formData.category.trim(),
          mrp: Number(formData.mrp),
          stock_quantity: Number(formData.stock_quantity),
          low_stock_threshold: Number(formData.low_stock_threshold)
        });

      if (error) throw error;

      toast.success(editingProduct ? 'Product updated' : 'Product added');
      setIsAddDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      loadProducts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete);

      if (error) throw error;
      toast.success('Product deleted');
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      loadProducts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const updateStockQuantity = async (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const newStock = Math.max(0, product.stock_quantity + delta);
    
    // Optimistic update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock_quantity: newStock } : p));
    
    const { error } = await supabase
      .from('products')
      .update({ stock_quantity: newStock })
      .eq('id', id);
      
    if (error) {
      toast.error('Failed to update stock');
      loadProducts(); // Rollback
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      category: '',
      mrp: 0,
      stock_quantity: 0,
      low_stock_threshold: 5
    });
  };

  const openAdd = () => {
    resetForm();
    const newId = `PRD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    setFormData(prev => ({ ...prev, id: newId }));
    setIsAddDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      id: product.id,
      name: product.name,
      category: product.category,
      mrp: product.mrp,
      stock_quantity: product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold
    });
    setIsAddDialogOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        active="Inventory"
        onNavigate={(next) => {
           if (next === 'Billing') onNavigate?.('billing');
           else if (next === 'Bookings') onNavigate?.('bookings');
           else if (next === 'Settings') onNavigate?.('settings');
           else if (next === 'Customers') onNavigate?.('customers');
           else if (next === 'Reports') onNavigate?.('reports');
        }}
        onLogout={onLogout}
      />
      
      <main className="flex-1 pb-24 md:ml-64 md:pb-0 overflow-x-hidden">
        <PageHeader 
          title="Inventory" 
          actions={
            <>
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input 
                  placeholder="Search..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-48 pl-9 rounded-lg bg-muted/30 border-border/50 transition-all duration-300 focus:w-64 focus:bg-background focus:border-primary/40 focus:ring-[4px] focus:ring-primary/10 focus:shadow-[0_0_20px_rgba(var(--primary),0.1)] outline-none"
                />
              </div>
              
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) {
                  setEditingProduct(null);
                  resetForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2" onClick={openAdd}>
                    <Plus size={16} /> Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-border/50">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product ID</label>
                    <Input 
                      placeholder="e.g. SNK-001" 
                      value={formData.id}
                      onChange={e => setFormData({...formData, id: e.target.value})}
                      disabled={true}
                      className="bg-muted/50 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">ID is automatically generated</p>
                  </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</label>
                      <Input 
                        placeholder="e.g. Red Bull" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                      <Input 
                        placeholder="e.g. Drinks" 
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">MRP (₹)</label>
                        <Input 
                          type="number" 
                          value={formData.mrp}
                          onChange={e => setFormData({...formData, mrp: Number(e.target.value)})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock</label>
                        <Input 
                          type="number" 
                          value={formData.stock_quantity}
                          onChange={e => setFormData({...formData, stock_quantity: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between">
                        Low Stock Threshold
                        <span className="text-primary">{formData.low_stock_threshold} units</span>
                      </label>
                      <Input 
                        type="range" 
                        min="1" 
                        max="20" 
                        value={formData.low_stock_threshold}
                        onChange={e => setFormData({...formData, low_stock_threshold: Number(e.target.value)})}
                        className="accent-primary"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={actionLoading}>
                      {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingProduct ? 'Update Product' : 'Save Product'}
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
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-10 rounded-xl bg-background/50 border-border/50 backdrop-blur-sm transition-all duration-300 focus:bg-background focus:border-primary/40 focus:ring-[4px] focus:ring-primary/10 focus:shadow-[0_0_25px_rgba(var(--primary),0.12)] outline-none"
            />
          </div>

          {/* Inventory Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="rounded-xl border border-border/50 bg-background/40 p-3 md:p-4 shadow-sm">
              <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Items</div>
              <div className="text-xl md:text-2xl font-black text-foreground italic">{stats.totalItems}</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/40 p-3 md:p-4 shadow-sm">
              <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Stock Value</div>
              <div className="text-xl md:text-2xl font-black text-primary italic">₹{stats.totalStockValue.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/40 p-3 md:p-4 shadow-sm">
              <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Low Stock</div>
              <div className="text-xl md:text-2xl font-black text-amber-500 italic">{stats.lowStockCount}</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/40 p-3 md:p-4 shadow-sm">
              <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Out of Stock</div>
              <div className="text-xl md:text-2xl font-black text-red-500 italic">{stats.outOfStockCount}</div>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-background/40 shadow-xl overflow-hidden backdrop-blur-md max-w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/50">
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Stock</th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary/50" />
                        <p className="mt-2 text-sm text-muted-foreground">Loading inventory...</p>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        No products found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const isLowStock = product.stock_quantity <= product.low_stock_threshold;
                      const isOutOfStock = product.stock_quantity === 0;
                      
                      return (
                        <tr key={product.id} className="hover:bg-muted/20 transition-colors group">
                          <td className="px-3 md:px-6 py-3 md:py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground text-sm md:text-base leading-tight">{product.name}</span>
                              <span className="text-[9px] md:text-[10px] text-muted-foreground font-mono">{product.id}</span>
                            </div>
                          </td>
                          <td className="px-3 md:px-6 py-3 md:py-4">
                            <Badge variant="outline" className="bg-muted/50 border-border/50 text-[10px] px-1.5 py-0">
                              {product.category}
                            </Badge>
                          </td>
                          <td className="px-3 md:px-6 py-3 md:py-4 font-mono font-bold text-emerald-400 text-sm md:text-base">
                            ₹{product.mrp}
                          </td>
                          <td className="px-3 md:px-6 py-3 md:py-4">
                            <div className="flex flex-col items-center gap-1.5 md:gap-2">
                              <div className="flex items-center gap-3">
                                <button 
                                  className="h-7 w-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                                  onClick={() => updateStockQuantity(product.id, -1)}
                                >
                                  <Minus size={14} />
                                </button>
                                <span className={`text-base font-mono font-bold w-6 text-center ${
                                  isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-foreground'
                                }`}>
                                  {product.stock_quantity}
                                </span>
                                <button 
                                  className="h-7 w-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                                  onClick={() => updateStockQuantity(product.id, 1)}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              {isOutOfStock ? (
                                <Badge variant="destructive" className="text-[9px] h-4 px-1.5 uppercase tracking-tighter">Out of Stock</Badge>
                              ) : isLowStock ? (
                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 uppercase tracking-tighter text-amber-500 border-amber-500/50 bg-amber-500/10">Low Stock</Badge>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 md:px-6 py-3 md:py-4 text-right">
                            <div className="flex justify-end gap-1 md:gap-2">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 md:h-8 md:w-8 rounded-full hover:bg-primary/20 hover:text-primary"
                                onClick={() => openEdit(product)}
                              >
                                <Edit2 size={12} md:size={14} />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 md:h-8 md:w-8 rounded-full hover:bg-red-500/20 hover:text-red-500"
                                onClick={() => {
                                  setProductToDelete(product.id);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 size={12} md:size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
                Are you sure you want to delete this product? This action cannot be undone and will remove it from the inventory.
              </div>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
                {actionLoading ? 'Deleting...' : 'Delete Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Mobile FAB */}
        <div className="fixed bottom-[80px] right-6 z-50 md:hidden">
          <Button 
            className="h-14 w-14 rounded-full shadow-lg shadow-primary/30"
            onClick={openAdd}
          >
            <Plus size={24} />
          </Button>
        </div>
      </main>
    </div>
  );
}
