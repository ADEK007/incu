import { Link, useNavigate } from 'react-router-dom';
import { Plus, Star, Zap } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { useTranslation } from '../../hooks/useTranslation';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    category: string;
    stock: number;
  };
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCartStore();
  const { profile } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleBuyNow = () => {
    addItem(product);
    navigate('/cart');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs sm:shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-full">
      <div>
        <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden bg-slate-900/5 dark:bg-slate-800/40 p-2 sm:p-3 flex items-center justify-center">
          <img
            src={product.image_url || 'https://via.placeholder.com/400?text=Hardware'}
            alt={product.name}
            className="w-full h-full object-contain rounded-xl transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Hardware';
            }}
          />
          <div className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-200 shadow-xs border border-gray-100 dark:border-gray-700 max-w-[90px] truncate">
            {product.category}
          </div>
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center m-1.5 sm:m-2 rounded-xl">
              <span className="bg-white text-red-600 px-2.5 py-1 sm:px-4 sm:py-2 rounded-full font-bold text-[11px] sm:text-sm uppercase tracking-wider shadow-md">
                {t.products.outOfStock}
              </span>
            </div>
          )}
        </Link>

        <div className="p-3 sm:p-5">
          <div className="flex items-center space-x-1 mb-1 sm:mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />
            ))}
            <span className="text-[10px] sm:text-xs text-gray-400 ml-1">(4.8)</span>
          </div>

          <Link to={`/product/${product.id}`} className="block">
            <h3 className="text-xs sm:text-base font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]">
              {product.name}
            </h3>
          </Link>
        </div>
      </div>

      <div className="p-3 sm:p-5 pt-0">
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex flex-col">
            <span className="text-base sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {formatPrice(product.price, profile?.country)}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-400 line-through font-mono">
              {formatPrice(product.price * 1.2, profile?.country)}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 self-end sm:self-auto w-full sm:w-auto justify-end">
            <button
              onClick={() => addItem(product)}
              disabled={product.stock === 0}
              title={t.products.addToCart}
              aria-label={t.products.addToCart}
              className={`p-2 sm:p-3 rounded-xl transition-all duration-200 flex-shrink-0 ${
                product.stock > 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white shadow-xs active:scale-95'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Plus size={16} className="sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={handleBuyNow}
              disabled={product.stock === 0}
              aria-label={t.products.buyNow}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 ${
                product.stock > 0
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:scale-95'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Zap size={14} className="fill-current" />
              <span>{t.products.buyNow}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
