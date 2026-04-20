import { Link, useNavigate } from 'react-router-dom';
import { Plus, Star, Zap } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';

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
  const navigate = useNavigate();

  const handleBuyNow = () => {
    addItem(product);
    navigate('/cart');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={product.image_url || 'https://via.placeholder.com/400?text=Hardware'}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Hardware';
          }}
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
          {product.category}
        </div>
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-white text-red-600 px-4 py-2 rounded-full font-bold text-sm uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      <div className="p-5">
        <div className="flex items-center space-x-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
          ))}
          <span className="text-xs text-gray-400 ml-1">(4.8)</span>
        </div>

        <Link to={`/product/${product.id}`} className="block">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
            {product.name}
          </h3>
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-black text-indigo-600 font-mono">
              {formatPrice(product.price, profile?.country)}
            </span>
            <span className="text-xs text-gray-400 line-through font-mono">
              {formatPrice(product.price * 1.2, profile?.country)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => addItem(product)}
              disabled={product.stock === 0}
              title="Add to Cart"
              className={`p-3 rounded-xl transition-all duration-200 ${
                product.stock > 0
                  ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-sm active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Plus size={20} />
            </button>
            <button
              onClick={handleBuyNow}
              disabled={product.stock === 0}
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-black text-sm transition-all duration-200 ${
                product.stock > 0
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-indigo-200 active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Zap size={16} className="fill-current" />
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
