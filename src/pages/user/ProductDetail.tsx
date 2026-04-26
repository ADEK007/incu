import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { ArrowLeft, Star, ShieldCheck, Truck, RotateCcw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import ProductCard from '../../components/ui/ProductCard';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const { profile, user } = useAuthStore();
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
      toast.error('You must be logged in to write a review');
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
      
      toast.success('Review submitted successfully!');
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
    if (product.stock <= 0) {
      toast.error('This product is out of stock');
      return;
    }
    if (product.stock < quantity) {
      toast.error('Not enough stock available');
      return;
    }
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
    toast.success(`${quantity} ${product.name} added to cart`);
  };

  const handleBuyNow = () => {
    if (product.stock <= 0) {
      toast.error('This product is out of stock');
      return;
    }
    if (product.stock < quantity) {
      toast.error('Not enough stock available');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button
        onClick={() => navigate('/Products')}
        className="flex items-center text-gray-500 hover:text-indigo-600 mb-8 transition-colors group"
      >
        <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to products
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        {/* Product Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner">
            <img
              src={mainImage || 'https://via.placeholder.com/800?text=Hardware'}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800?text=Hardware';
              }}
            />
            <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl text-sm font-black text-indigo-600 shadow-sm border border-indigo-50">
              {product.category}
            </div>
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                <span className="bg-white text-red-600 px-6 py-3 rounded-full font-black text-lg uppercase tracking-widest">
                  Out of Stock
                </span>
              </div>
            )}
          </div>
          {/* Gallery Thumbnails */}
          <div className="grid grid-cols-5 gap-4">
            {allImages.map((img, i) => (
              <div 
                key={i} 
                onClick={() => setMainImage(img)}
                className={`aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${mainImage === img ? 'border-indigo-600 shadow-md' : 'border-transparent hover:border-gray-200'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} className={i < Math.round(Number(averageRating)) ? "fill-current" : "fill-current opacity-30"} />
                ))}
              </div>
              <span className="text-sm font-bold text-gray-400">{averageRating} ({reviews.length} reviews)</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight">
              {product.name}
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-4xl font-black text-indigo-600 font-mono">
                {formatPrice(product.price, profile?.country)}
              </span>
              <span className="text-xl font-medium text-gray-400 line-through font-mono">
                {formatPrice(product.price * 1.2, profile?.country)}
              </span>
              <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                20% OFF
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${!isOutOfStock && product.stock > 10 ? 'bg-green-500' : !isOutOfStock ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <span className="text-sm font-bold text-gray-600 font-mono">
                {!isOutOfStock ? `${product.stock} in stock` : 'Out of stock'}
              </span>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 space-y-6">
            <div className="flex items-center space-x-6">
              <div className="flex items-center border-2 border-gray-100 rounded-2xl p-1 bg-gray-50/50">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={isOutOfStock}
                  className="w-12 h-12 flex items-center justify-center text-xl font-bold text-gray-600 hover:text-indigo-600 transition-colors disabled:opacity-20"
                >
                  -
                </button>
                <span className="w-12 text-center font-black text-lg text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={isOutOfStock}
                  className="w-12 h-12 flex items-center justify-center text-xl font-bold text-gray-600 hover:text-indigo-600 transition-colors disabled:opacity-20"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                title="Add to Cart"
                className={`p-4 rounded-2xl border-2 transition-all active:scale-95 flex items-center justify-center ${
                  isOutOfStock 
                    ? 'border-gray-100 text-gray-300 cursor-not-allowed' 
                    : 'border-indigo-100 text-indigo-600 hover:bg-indigo-50 shadow-sm'
                }`}
              >
                <Plus size={24} />
              </button>
              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className={`flex-grow px-8 py-4 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-3 ${
                  isOutOfStock 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                }`}
              >
                <span>{!isOutOfStock ? 'Buy Now' : 'Out of Stock'}</span>
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

      {/* Tabs Section */}
      <div className="mt-20">
        <div className="flex border-b border-gray-100 space-x-12">
          {['description', 'specifications', 'reviews'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-6 text-sm font-black uppercase tracking-widest transition-all relative ${
                activeTab === tab ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="py-12">
          {activeTab === 'description' && (
            <div className="prose prose-indigo max-w-none">
              <p className="text-lg text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                {product.description || 'No description available.'}
              </p>
            </div>
          )}

          {activeTab === 'specifications' && (
            <div className="max-w-3xl">
              {product.specifications ? (
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(product.specifications).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                      <span className="text-gray-900 font-black font-mono">{String(value)}</span>
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
                  <h3 className="text-2xl font-black text-gray-900">Customer Reviews</h3>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex items-center text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={20} className={i < Math.round(Number(averageRating)) ? "fill-current" : "fill-current opacity-30"} />
                      ))}
                    </div>
                    <span className="text-lg font-black text-gray-900">{averageRating} out of 5</span>
                    <span className="text-gray-400 font-bold ml-2">({reviews.length} total)</span>
                  </div>
                </div>
              </div>

              {/* Add Review Form */}
              {user ? (
                <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                  <h4 className="text-xl font-black text-gray-900 mb-6">Write a Review</h4>
                  <form onSubmit={handleSubmitReview} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Your Rating</label>
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
                              className={star <= newReview.rating ? "text-yellow-400 fill-current" : "text-gray-300"}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Your Comment</label>
                      <textarea
                        required
                        rows={4}
                        value={newReview.comment}
                        onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        className="w-full px-5 py-3 bg-white border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none transition-all font-medium resize-none"
                        placeholder="What did you like or dislike?"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-50"
                    >
                      {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-indigo-50 rounded-3xl p-8 border border-indigo-100 text-center">
                  <p className="text-indigo-900 font-bold text-lg mb-4">Want to share your experience?</p>
                  <button 
                    onClick={() => navigate('/login')}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black transition-all hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100"
                  >
                    Log in to write a review
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-12 pt-8">
                {reviews.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-sm">
                    No reviews yet. Be the first to review!
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="space-y-4 pb-12 border-b border-gray-50 last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg">
                            {review.users?.full_name?.[0] || '?'}
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{review.users?.full_name || 'Anonymous User'}</p>
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
                      <p className="text-gray-600 font-medium leading-relaxed">{review.comment}</p>
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
        <div className="mt-32 space-y-12">
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-gray-900">Related Products</h2>
              <div className="h-1.5 w-20 bg-indigo-600 rounded-full"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
