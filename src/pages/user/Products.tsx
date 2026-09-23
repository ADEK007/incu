import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ProductCard from '../../components/ui/ProductCard';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

const PRODUCTS_PER_PAGE = 10;

const Products = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
  }, [page, selectedCategory]);

  const fetchProducts = async () => {
    setLoading(true);

    const from = (page - 1) * PRODUCTS_PER_PAGE;
    const to = from + PRODUCTS_PER_PAGE - 1;

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' });

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    const { data, error, count } = await query.range(from, to);

    if (!error) {
      setProducts(data || []);
      setTotalCount(count || 0);

      // Extract unique categories from all products
      if (categories.length === 0) {
        const { data: catData } = await supabase.from('products').select('category');
        if (catData) {
          const uniqueCats = Array.from(new Set(catData.map((p: any) => p.category).filter(Boolean)));
          setCategories(uniqueCats as string[]);
        }
      }
    } else {
      console.error(error);
    }

    setLoading(false);
  };

  const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 space-y-6 sm:space-y-10">

      {/* 🔙 BACK BUTTON */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center text-sm sm:text-base text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
        >
          {t.products.backHome}
        </Link>
      </div>

      {/* TITLE & SUBTITLE */}
      <div>
        <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white">
          {t.products.title}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 text-xs sm:text-base">
          {t.products.subtitle}
        </p>
      </div>

      {/* CATEGORY FILTER CHIPS (Horizontal scroll on mobile) */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-3 px-3 sm:mx-0 sm:px-0">
          <button
            onClick={() => { setSelectedCategory('all'); setPage(1); }}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setPage(1); }}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* PRODUCTS GRID (2 columns on mobile, 3-4 on larger screens) */}
      {loading ? (
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-500 font-medium">{t.products.loading}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {products.length > 0 ? (
            products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))
          ) : (
            <div className="col-span-full text-center py-16 bg-gray-50 dark:bg-slate-800/40 rounded-3xl border border-gray-100 dark:border-slate-800 text-gray-500">
              {t.products.noProducts}
            </div>
          )}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 sm:gap-4 pt-6 sm:pt-10">
          {/* PREV */}
          <button
            onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            disabled={page === 1}
            className="px-3 sm:px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs sm:text-sm font-bold disabled:opacity-50 transition"
          >
            {t.products.prev}
          </button>

          {/* PAGE INFO */}
          <span className="font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            {t.products.page} {page} {t.products.of} {totalPages || 1}
          </span>

          {/* NEXT */}
          <button
            onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            disabled={page >= totalPages}
            className={`px-3 sm:px-4 py-2 rounded-xl text-white text-xs sm:text-sm font-bold transition ${
              page >= totalPages
                ? 'bg-gray-300 dark:bg-slate-600 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {t.products.next}
          </button>
        </div>
      )}
    </div>
  );
};

export default Products;
