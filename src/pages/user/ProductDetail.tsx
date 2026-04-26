import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { ShoppingCart, ArrowLeft, Star, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const { profile } = useAuthStore();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900">Product not found</h2>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-indigo-600 font-medium hover:underline"
        >
          Back to home
        </button>
      </div>
    );
  }

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
    toast.success(`${quantity} ${product.name} added to cart`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-500 hover:text-indigo-600 mb-8 transition-colors group"
      >
        <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to products
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        {/* Product Image */}
        <div className="relative aspect-square rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner">
          <img
            src={product.image_url || 'https://via.placeholder.com/800'}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl text-sm font-black text-indigo-600 shadow-sm border border-indigo-50">
            {product.category}
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} className="fill-current" />
                ))}
              </div>
              <span className="text-sm font-bold text-gray-400">4.9 (128 reviews)</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight">
              {product.name}
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-4xl font-black text-indigo-600">
                {formatPrice(product.price, profile?.country)}
              </span>
              <span className="text-xl font-medium text-gray-400 line-through">
                {formatPrice(product.price * 1.2, profile?.country)}
              </span>
              <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                20% OFF
              </span>
            </div>
          </div>

          <p className="text-lg text-gray-600 leading-relaxed font-medium">
            {product.description || 'Experience the perfect blend of style and performance with our latest collection. Crafted with precision and high-quality materials, this product is designed to elevate your daily routine.'}
          </p>

          <div className="pt-8 border-t border-gray-100 space-y-6">
            <div className="flex items-center space-x-6">
              <div className="flex items-center border-2 border-gray-100 rounded-2xl p-1 bg-gray-50/50">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 flex items-center justify-center text-xl font-bold text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  -
                </button>
                <span className="w-12 text-center font-black text-lg text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 flex items-center justify-center text-xl font-bold text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={product.stock_quantity === 0}
                className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center space-x-3 disabled:bg-gray-200 disabled:shadow-none disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <ShoppingCart size={24} />
                <span>{product.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-2xl space-y-2">
                <ShieldCheck className="text-indigo-600" size={24} />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-tight">1 Year Warranty</span>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-2xl space-y-2">
                <Truck className="text-indigo-600" size={24} />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-tight">Free Shipping</span>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-2xl space-y-2">
                <RotateCcw className="text-indigo-600" size={24} />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-tight">30 Day Returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
