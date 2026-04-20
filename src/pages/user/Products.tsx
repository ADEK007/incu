import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ProductCard from '../../components/ui/ProductCard';
import { Link } from 'react-router-dom';

const PRODUCTS_PER_PAGE = 10;

const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const fetchProducts = async () => {
    setLoading(true);

    const from = (page - 1) * PRODUCTS_PER_PAGE;
    const to = from + PRODUCTS_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .range(from, to);

    if (!error) {
      setProducts(data || []);
      setTotalCount(count || 0);
    } else {
      console.error(error);
    }

    setLoading(false);
  };

  const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);

  if (loading) {
    return <div className="text-center py-20">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-10">

      {/* 🔙 BACK BUTTON */}
      <div>
        <Link
          to="/"
          className="inline-block mb-4 text-indigo-600 font-semibold hover:underline"
        >
          ← Back to Home
        </Link>
      </div>

      {/* TITLE */}
      <h1 className="text-3xl font-bold text-gray-900">
        All Products
      </h1>

      {/* PRODUCTS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.length > 0 ? (
          products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500">
            No products found
          </div>
        )}
      </div>

      {/* PAGINATION */}
      <div className="flex justify-center items-center gap-4 pt-10">

        {/* PREV */}
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Prev
        </button>

        {/* PAGE INFO */}
        <span className="font-bold">
          Page {page} of {totalPages || 1}
        </span>

        {/* NEXT */}
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          className={`px-4 py-2 rounded text-white ${
            page >= totalPages
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          Next
        </button>

      </div>
    </div>
  );
};

export default Products;