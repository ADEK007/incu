import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { ArrowLeft, Star, ShieldCheck, Truck, RotateCcw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import ProductCard from '../../components/ui/ProductCard';
import { useTranslation } from '../../hooks/useTranslation';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const { profile, user } = useAuthStore();
  const { t } = useTranslation();
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');
  const [mainImage, setMainImage] = useState<string>('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch product
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (productError) throw productError;
        setProduct(productData);
        setMainImage(productData.image_url);

        // Fetch related products (same category, excluding current)
        const { data: relatedData } = await supabase
          .from('products')
          .select('*')
          .eq('category', productData.category)
          .neq('id', id)
          .limit(4);
        setRelatedProducts(relatedData || []);

        // Fetch reviews
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            *,
            users (
              full_name
            )
          `)
          .eq('product_id', id)
          .order('created_at', { ascending: false });

        if (reviewsError) throw reviewsError;
        setReviews(reviewsData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error(t.productDetail.loginToReview);
      return;
    }

    try {
      setIsSubmittingReview(true);
      const { error } = await supabase
        .from('reviews')
        .insert({
          product_id: id,
          user_id: user.id,
          rating: newReview.rating,
          comment: newReview.comment
        });

      if (error) throw error;
      
      toast.success(t.productDetail.submitReview);
      setNewReview({ rating: 5, comment: '' });
      
      // Refresh reviews
      const { data: updatedReviews } = await supabase
        .from('reviews')
        .select(`
          *,
          users (
            full_name
          )
        `)
        .eq('product_id', id)
        .order('created_at', { ascending: false });
      setReviews(updatedReviews || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t.productDetail.productNotFound}</h2>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-indigo-600 font-medium hover:underline"
        >
          {t.products.backHome}
        </button>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (product.stock <= 0) {
      toast.error(t.productDetail.outOfStockError);
      return;
    }
    if (product.stock < quantity) {
      toast.error(t.productDetail.insufficientStock);
      return;
    }
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
    toast.success(`${quantity} ${product.name} ${t.productDetail.addedToCart}`);
  };

  const handleBuyNow = () => {
    if (product.stock <= 0) {
      toast.error(t.productDetail.outOfStockError);
      return;
    }
    if (product.stock < quantity) {
      toast.error(t.productDetail.insufficientStock);
      return;
    }
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
    navigate('/cart');
  };

  const allImages = [product.image_url, ...(product.images || [])].filter(Boolean);

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 pb-32 md:pb-12">
      <button
        onClick={() => navigate('/products')}
        className="flex items-center text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 sm:mb-8 transition-colors group font-semibold text-sm sm:text-base"
      >
        <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
        {t.productDetail.backToProducts}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
        {/* Product Image Gallery */}
        <div className="space-y-3 sm:space-y-4">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-900/5 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 shadow-inner flex items-center justify-center p-3 sm:p-4">
            <img
              src={mainImage || 'https://via.placeholder.com/800?text=Hardware'}
              alt={product.name}
              className="w-full h-full object-contain rounded-2xl transition-all duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800?text=Hardware';
              }}
            />
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 shadow-xs border border-indigo-50 dark:border-slate-700">
              {product.category}
            </div>
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center rounded-3xl">
                <span className="bg-white text-red-600 px-4 py-2 sm:px-6 sm:py-3 rounded-full font-black text-sm sm:text-lg uppercase tracking-widest shadow-lg">
                  {t.productDetail.outOfStock}
                </span>
              </div>
            )}
          </div>
          {/* Gallery Thumbnails */}
          {allImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2 sm:gap-4">
              {allImages.map((img, i) => (
                <div 
                  key={i} 
                  onClick={() => setMainImage(img)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-slate-900/5 dark:bg-slate-800/40 p-1 sm:p-1.5 flex items-center justify-center ${mainImage === img ? 'border-indigo-600 shadow-md ring-2 ring-indigo-600/20' : 'border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-contain rounded-lg" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col space-y-6 sm:space-y-8">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className={i < Math.round(Number(averageRating)) ? "fill-current" : "fill-current opacity-30"} />
                ))}
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-400">{averageRating} ({reviews.length} {t.productDetail.reviews})</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight">
              {product.name}
            </h1>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <span className="text-2xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {formatPrice(product.price, profile?.country)}
              </span>
              <span className="text-base sm:text-xl font-medium text-gray-400 line-through font-mono">
                {formatPrice(product.price * 1.2, profile?.country)}
              </span>
              <span className="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider">
                20% {t.productDetail.off}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${!isOutOfStock && product.stock > 10 ? 'bg-green-500' : !isOutOfStock ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <span className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300 font-mono">
                {!isOutOfStock ? `${product.stock} ${t.productDetail.inStock}` : t.productDetail.outOfStock}
              </span>
            </div>
          </div>

          <div className="pt-6 sm:pt-8 border-t border-gray-100 dark:border-slate-800 space-y-6">
            <div className="flex items-center space-x-3 sm:space-x-6">
              <div className="flex items-center border-2 border-gray-100 dark:border-slate-800 rounded-2xl p-1 bg-gray-50/50 dark:bg-slate-800/50">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={isOutOfStock}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors disabled:opacity-20"
                >
                  -
                </button>
                <span className="w-8 sm:w-12 text-center font-black text-base sm:text-lg text-gray-900 dark:text-white">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={isOutOfStock}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors disabled:opacity-20"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                title={t.productDetail.addToCart}
                className={`p-3 sm:p-4 rounded-2xl border-2 transition-all active:scale-95 flex items-center justify-center ${
                  isOutOfStock 
                    ? 'border-gray-100 dark:border-slate-800 text-gray-300 dark:text-slate-600 cursor-not-allowed' 
                    : 'border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 shadow-xs'
                }`}
              >
                <Plus size={20} className="sm:w-6 sm:h-6" />
              </button>
              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className={`flex-grow px-4 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-sm sm:text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-2 sm:space-x-3 ${
                  isOutOfStock 
                    ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                }`}
              >
                <span>{!isOutOfStock ? t.productDetail.buyNow : t.productDetail.outOfStock}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2 sm:pt-4">
              <div className="flex flex-col items-center text-center p-2.5 sm:p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl space-y-1 sm:space-y-2">
                <ShieldCheck className="text-indigo-600 dark:text-indigo-400" size={20} />
                <span className="text-[10px] sm:text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight">{t.productDetail.warrantyBadge}</span>
              </div>
              <div className="flex flex-col items-center text-center p-2.5 sm:p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl space-y-1 sm:space-y-2">
                <Truck className="text-indigo-600 dark:text-indigo-400" size={20} />
                <span className="text-[10px] sm:text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight">{t.productDetail.shippingBadge}</span>
              </div>
              <div className="flex flex-col items-center text-center p-2.5 sm:p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl space-y-1 sm:space-y-2">
                <RotateCcw className="text-indigo-600 dark:text-indigo-400" size={20} />
                <span className="text-[10px] sm:text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight">{t.productDetail.returnsBadge}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="mt-20">
        <div className="flex border-b border-gray-100 dark:border-slate-800 space-x-8 sm:space-x-12">
          {[
            { id: 'description', label: t.productDetail.tabDescription },
            { id: 'specifications', label: t.productDetail.tabSpecs },
            { id: 'reviews', label: t.productDetail.tabReviews },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 sm:pb-6 text-sm sm:text-base font-black uppercase tracking-wider transition-all relative ${
                activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="py-12">
          {activeTab === 'description' && (
            <div className="prose prose-indigo dark:prose-invert max-w-none">
              <p className="text-lg text-gray-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                {product.description || 'No description available.'}
              </p>
            </div>
          )}

          {activeTab === 'specifications' && (
            <div className="max-w-3xl">
              {product.specifications ? (
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(product.specifications).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl">
                      <span className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                      <span className="text-gray-900 dark:text-white font-black font-mono">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 font-medium">No specifications provided.</p>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">{t.productDetail.tabReviews}</h3>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex items-center text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={20} className={i < Math.round(Number(averageRating)) ? "fill-current" : "fill-current opacity-30"} />
                      ))}
                    </div>
                    <span className="text-lg font-black text-gray-900 dark:text-white">{averageRating} / 5</span>
                    <span className="text-gray-400 font-bold ml-2">({reviews.length} total)</span>
                  </div>
                </div>
              </div>

              {/* Add Review Form */}
              {user ? (
                <div className="bg-gray-50 dark:bg-slate-800/60 rounded-3xl p-8 border border-gray-100 dark:border-slate-800">
                  <h4 className="text-xl font-black text-gray-900 dark:text-white mb-6">{t.productDetail.writeReview}</h4>
                  <form onSubmit={handleSubmitReview} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.productDetail.yourRating}</label>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReview({ ...newReview, rating: star })}
                            className="transition-transform active:scale-90"
                          >
                            <Star
                              size={28}
                              className={star <= newReview.rating ? "text-yellow-400 fill-current" : "text-gray-300 dark:text-slate-600"}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.productDetail.rating}</label>
                      <textarea
                        required
                        rows={4}
                        value={newReview.comment}
                        onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        className="w-full px-5 py-3 bg-white dark:bg-slate-900 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none transition-all font-medium resize-none text-foreground"
                        placeholder={t.productDetail.yourComment}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="bg-gray-900 dark:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-50"
                    >
                      {isSubmittingReview ? t.productDetail.submitting : t.productDetail.submitReview}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-indigo-50 dark:bg-slate-800/60 rounded-3xl p-8 border border-indigo-100 dark:border-slate-800 text-center">
                  <p className="text-indigo-900 dark:text-indigo-300 font-bold text-lg mb-4">{t.productDetail.loginToReviewText}</p>
                  <button 
                    onClick={() => navigate('/login')}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black transition-all hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100"
                  >
                    {t.productDetail.loginToReview}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-12 pt-8">
                {reviews.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-sm">
                    {t.productDetail.noReviews}
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="space-y-4 pb-12 border-b border-gray-50 dark:border-slate-800 last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg">
                            {review.users?.full_name?.[0] || '?'}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 dark:text-white">{review.users?.full_name || 'Anonymous User'}</p>
                            <div className="flex items-center text-yellow-400">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={14} className={i < review.rating ? "fill-current" : "fill-current opacity-30"} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-gray-400">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-slate-300 font-medium leading-relaxed">{review.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 sm:mt-28 space-y-6 sm:space-y-10">
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <h2 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white">{t.productDetail.relatedProducts}</h2>
              <div className="h-1.5 w-16 bg-indigo-600 rounded-full"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* STICKY MOBILE BOTTOM ACTION BAR */}
      <div className="md:hidden fixed bottom-[56px] left-0 right-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border px-4 py-2.5 flex items-center justify-between shadow-2xl gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total</p>
          <p className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {formatPrice(product.price * quantity, profile?.country)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            aria-label="Add to cart"
            className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 active:scale-95 transition"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider active:scale-95 transition shadow-sm"
          >
            {!isOutOfStock ? t.productDetail.buyNow : t.productDetail.outOfStock}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
