import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { Star, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  product_id: string;
  products?: { name: string; image_url: string | null } | null;
}

const ReviewsTab = () => {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, product_id, products(name, image_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setReviews((data as any) || []);
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black text-foreground">My Reviews</h2>
        <p className="text-sm text-muted-foreground mt-1">Reviews you've written for products.</p>
      </header>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />)}</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <MessageSquare className="mx-auto text-muted-foreground mb-3" size={40} />
          <h3 className="font-bold text-foreground">No reviews yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Share your experience on products you've purchased.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <Link key={r.id} to={`/product/${r.product_id}`} className="block bg-card border border-border rounded-2xl p-5 hover:border-primary/40 transition-colors">
              <div className="flex items-start gap-4">
                <img src={r.products?.image_url || 'https://via.placeholder.com/64'} alt="" className="w-14 h-14 rounded-xl object-contain bg-slate-900/5 p-1 border border-border" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{r.products?.name || 'Product'}</p>
                  <div className="flex items-center gap-1 my-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} size={14} className={n <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground line-clamp-2">{r.comment}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsTab;
