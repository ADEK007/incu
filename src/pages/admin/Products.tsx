import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { Plus, Edit, Trash2, Package, Search, Filter, X, Save, UploadCloud, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AdminProducts = () => {
  const { user, profile } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    specifications: '',
    price: '',
    category: '',
    image_url: '',
    images: '',
    stock: '0'
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFileToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${Date.now()}_${cleanName}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('products').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleMainImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingMain(true);
      const publicUrl = await uploadFileToSupabase(file);
      setFormData((prev) => ({ ...prev, image_url: publicUrl }));
      toast.success('Main image uploaded to Supabase!');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Failed to upload image to Supabase');
    } finally {
      setUploadingMain(false);
      e.target.value = '';
    }
  };

  const handleGalleryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingGallery(true);
      const uploadPromises = Array.from(files).map((f) => uploadFileToSupabase(f));
      const urls = await Promise.all(uploadPromises);

      setFormData((prev) => {
        const existing = prev.images
          .split('\n')
          .map((u) => u.trim())
          .filter(Boolean);
        const combined = [...existing, ...urls];
        return { ...prev, images: combined.join('\n') };
      });
      toast.success(`${urls.length} gallery image(s) uploaded to Supabase!`);
    } catch (err: any) {
      console.error('Gallery upload error:', err);
      toast.error(err.message || 'Failed to upload gallery images to Supabase');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const removeGalleryImage = (indexToRemove: number) => {
    setFormData((prev) => {
      const list = prev.images
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);
      const updated = list.filter((_, idx) => idx !== indexToRemove);
      return { ...prev, images: updated.join('\n') };
    });
  };

  const handleOpenModal = (product: any = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || '',
        description: product.description || '',
        specifications: product.specifications ? JSON.stringify(product.specifications, null, 2) : '',
        price: (product.price ?? 0).toString(),
        category: product.category || '',
        image_url: product.image_url || '',
        images: (product.images || []).join('\n'),
        stock: (product.stock ?? product.stock_quantity ?? 0).toString()
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        specifications: '',
        price: '',
        category: '',
        image_url: '',
        images: '',
        stock: '0'
      });
    }
    setIsModalOpen(true);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let specsJson = null;
    try {
      if (formData.specifications && formData.specifications.trim() !== '') {
        specsJson = JSON.parse(formData.specifications);
      }
    } catch (err) {
      toast.error('Invalid JSON in Specifications field. Please use format like: { "Color": "Black" }');
      return;
    }

    const tenantId = profile?.tenant_id ?? profile?.id ?? user?.id ?? null;

    const productData: any = {
      name: formData.name,
      description: formData.description,
      specifications: specsJson,
      price: parseFloat(formData.price) || 0,
      category: formData.category,
      image_url: formData.image_url,
      images: formData.images.split('\n').map(url => url.trim()).filter(url => url !== ''),
      stock: parseInt(formData.stock.toString()) || 0,
      tenant_id: tenantId,
    };

    try {
      setLoading(true);
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
        if (error) throw error;
        toast.success('Product created successfully');
      }
      setIsModalOpen(false);
      await fetchProducts();
    } catch (error: any) {
      console.error('Database error:', error);
      toast.error(`Database error: ${error.message || 'Failed to save product'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-900 flex items-center">
              <Package size={36} className="text-indigo-600 mr-4" />
              Products Management
            </h1>
            <p className="text-gray-500 font-medium">Add, update, and manage your inventory here.</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center space-x-3"
          >
            <Plus size={24} />
            <span>Add New Product</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-6 items-center">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium text-gray-900"
            />
          </div>
          <button className="w-full sm:w-auto p-4 bg-gray-50 border-2 border-transparent hover:border-indigo-600 rounded-2xl text-gray-600 font-bold flex items-center justify-center space-x-2 transition-all">
            <Filter size={20} />
            <span>Filters</span>
          </button>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Product</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Category</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Price</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Stock</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-8 py-6 h-20 bg-gray-50/20"></td>
                    </tr>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                      No products found
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-indigo-50/10 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900/5 p-1 border border-gray-100 flex items-center justify-center flex-shrink-0">
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-contain rounded-lg" />
                          </div>
                          <p className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{product.name}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-black text-indigo-600">{formatPrice(product.price)}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${product.stock > 10 ? 'bg-green-500' : product.stock > 0 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                          <span className="font-bold text-gray-900">{product.stock}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleOpenModal(product)}
                            className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <Edit size={20} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
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

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-2xl font-black text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Product Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl outline-none transition-all font-medium"
                    placeholder="e.g. Premium Leather Watch"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Category</label>
                  <input
                    required
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl outline-none transition-all font-medium"
                    placeholder="e.g. Accessories"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Price (BDT)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl outline-none transition-all font-medium"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Stock Quantity</label>
                  <input
                    required
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl outline-none transition-all font-medium"
                    placeholder="Enter quantity"
                  />
                </div>
              </div>

              {/* Main Product Image */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center justify-between">
                  <span>Main Product Image</span>
                  {uploadingMain && (
                    <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                      <Loader2 size={13} className="animate-spin" /> Uploading to Supabase...
                    </span>
                  )}
                </label>

                <div className="space-y-3">
                  {formData.image_url ? (
                    <div className="relative group w-full h-44 rounded-2xl overflow-hidden bg-gray-100 border-2 border-indigo-100 flex items-center justify-center">
                      <img
                        src={formData.image_url}
                        alt="Main preview"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <label className="px-4 py-2 bg-white text-gray-900 rounded-xl text-xs font-bold shadow-lg cursor-pointer hover:bg-gray-50 transition">
                          Change Image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleMainImageFileChange}
                            disabled={uploadingMain}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          className="p-2 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition"
                          title="Remove image"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 hover:border-indigo-500 bg-gray-50 hover:bg-indigo-50/20 rounded-2xl cursor-pointer transition-all p-4 group">
                      <div className="flex flex-col items-center justify-center text-center">
                        {uploadingMain ? (
                          <div className="flex flex-col items-center space-y-2">
                            <Loader2 className="animate-spin text-indigo-600" size={32} />
                            <span className="text-sm font-bold text-indigo-600">Uploading to Supabase...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center text-indigo-600 mb-2 transition">
                              <UploadCloud size={24} />
                            </div>
                            <p className="text-sm font-bold text-gray-700">
                              <span className="text-indigo-600">Choose from Device / PC / Phone</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP, GIF (Uploads directly to Supabase)</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleMainImageFileChange}
                        disabled={uploadingMain}
                      />
                    </label>
                  )}

                  {/* Fallback Direct URL input */}
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 focus:border-indigo-600 rounded-xl outline-none transition"
                    placeholder="Or paste direct image URL (https://...)"
                  />
                </div>
              </div>

              {/* Additional Gallery Images */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center justify-between">
                  <span>Additional Images (Gallery)</span>
                  {uploadingGallery && (
                    <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                      <Loader2 size={13} className="animate-spin" /> Uploading to Supabase...
                    </span>
                  )}
                </label>

                <div className="space-y-3">
                  {/* Gallery Upload Button */}
                  <label className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-gray-300 hover:border-indigo-500 bg-gray-50 hover:bg-indigo-50/20 rounded-xl cursor-pointer transition font-bold text-xs text-gray-700 hover:text-indigo-600">
                    {uploadingGallery ? (
                      <Loader2 size={16} className="animate-spin text-indigo-600" />
                    ) : (
                      <UploadCloud size={16} />
                    )}
                    <span>Choose Additional Images from Device (Multiple)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleGalleryFilesChange}
                      disabled={uploadingGallery}
                    />
                  </label>

                  {/* Gallery Previews Grid */}
                  {formData.images.split('\n').map(u => u.trim()).filter(Boolean).length > 0 && (
                    <div className="grid grid-cols-4 gap-2.5 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      {formData.images.split('\n').map(u => u.trim()).filter(Boolean).map((url, idx) => (
                        <div key={idx} className="relative group w-full h-20 rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm">
                          <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow hover:bg-red-600"
                            title="Remove image"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fallback Direct URLs Textarea */}
                  <textarea
                    rows={2}
                    value={formData.images}
                    onChange={(e) => setFormData({...formData, images: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-600 rounded-xl outline-none text-xs transition font-mono resize-none"
                    placeholder="Or paste multiple image links (one URL per line)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl outline-none transition-all font-medium resize-none"
                  placeholder="Enter product details..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                  <span>Specifications (JSON format)</span>
                  <span className="text-[10px] font-normal lowercase opacity-60">e.g. {"{ \"Color\": \"Black\", \"Size\": \"XL\" }"}</span>
                </label>
                <textarea
                  rows={4}
                  value={formData.specifications}
                  onChange={(e) => setFormData({...formData, specifications: e.target.value})}
                  className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl outline-none transition-all font-mono text-sm resize-none"
                  placeholder='{ "Material": "Leather", "Warranty": "1 Year" }'
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center space-x-2"
                >
                  <Save size={20} />
                  <span>{editingProduct ? 'Update Product' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminProducts;
