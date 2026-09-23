import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const DEFAULT_FAQS = [
  { q: 'How long does delivery take?', a: 'Delivery usually takes 2–5 business days depending on location.' },
  { q: 'Can I return a product?', a: 'Yes, returns are accepted within 7 days of delivery.' },
  { q: 'How can I contact support?', a: 'You can contact us via email or the support section in your account.' },
];

interface UserQuestion {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  created_at: string;
  product_id: string | null;
  products?: { name: string } | null;
}

interface ProductOpt { id: string; name: string; }

const QASection = () => {
  const user = useAuthStore((s) => s.user);
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [myQuestions, setMyQuestions] = useState<UserQuestion[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [question, setQuestion] = useState('');
  const [productId, setProductId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadQuestions = async () => {
    if (!user) { setMyQuestions([]); return; }
    const { data } = await supabase
      .from('user_questions')
      .select('id, question, answer, status, created_at, product_id, products(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyQuestions((data as any) || []);
  };

  useEffect(() => {
    supabase.from('products').select('id, name').order('name').then(({ data }) => {
      setProducts((data as ProductOpt[]) || []);
    });
  }, []);

  useEffect(() => { loadQuestions(); /* eslint-disable-next-line */ }, [user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please log in to ask a question'); return; }
    const trimmed = question.trim();
    if (trimmed.length < 5) { toast.error('Question must be at least 5 characters'); return; }
    if (trimmed.length > 1000) { toast.error('Question is too long'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('user_questions').insert({
      user_id: user.id,
      question: trimmed,
      product_id: productId || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Question submitted');
    setQuestion(''); setProductId('');
    loadQuestions();
  };

  return (
    <section className="py-20 bg-background">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Questions & Answers</h2>
          <p className="text-muted-foreground">Find quick answers or ask your own question.</p>
        </div>

        {/* Default FAQs */}
        <div className="space-y-3 mb-12">
          {DEFAULT_FAQS.map((f, i) => (
            <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
              >
                <span className="font-semibold text-card-foreground">{f.q}</span>
                <span className="text-muted-foreground text-xl">{openIdx === i ? '−' : '+'}</span>
              </button>
              {openIdx === i && (
                <div className="px-5 pb-4 text-muted-foreground text-sm leading-relaxed">{f.a}</div>
              )}
            </div>
          ))}
        </div>

        {/* Submit form */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-10">
          <h3 className="text-xl font-bold text-card-foreground mb-4">Ask a Question</h3>
          {user ? (
            <form onSubmit={submit} className="space-y-3">
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm"
              >
                <option value="">— No specific product (general) —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your question..."
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-primary text-primary-foreground rounded-md font-semibold hover:opacity-90 disabled:opacity-50 transition"
              >
                {submitting ? 'Submitting...' : 'Submit Question'}
              </button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Please <Link to="/login" className="text-primary font-semibold underline">log in</Link> to ask a question.
            </p>
          )}
        </div>

        {/* User's own questions */}
        {user && (
          <div>
            <h3 className="text-xl font-bold text-foreground mb-4">Your Questions</h3>
            {myQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">You haven't asked any questions yet.</p>
            ) : (
              <div className="space-y-3">
                {myQuestions.map((q) => (
                  <div key={q.id} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-semibold text-card-foreground">{q.question}</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold flex-shrink-0 ${
                        q.status === 'answered'
                          ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'
                      }`}>
                        {q.status === 'answered' ? 'Answered' : 'Pending'}
                      </span>
                    </div>
                    {q.products?.name && (
                      <p className="text-xs text-muted-foreground mb-2">Product: {q.products.name}</p>
                    )}
                    {q.answer ? (
                      <div className="mt-3 pl-3 border-l-2 border-primary">
                        <p className="text-xs font-bold text-primary mb-1">Admin Reply</p>
                        <p className="text-sm text-foreground/80">{q.answer}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Awaiting reply from our team.</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {new Date(q.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default QASection;
