import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { ChevronDown, Search, MessageCircleQuestion, Send, Sparkles } from 'lucide-react';

const DEFAULT_FAQS = [
  { q: 'How long does delivery take?', a: 'Delivery usually takes 2–5 business days depending on your location. Express options may be available at checkout.' },
  { q: 'Can I return a product?', a: 'Yes, you can return products within 7 days of delivery. Items must be unused and in original packaging.' },
  { q: 'How can I contact support?', a: 'You can reach our team via the contact page, email, or by submitting a question below — we typically reply within 24 hours.' },
  { q: 'What payment methods are accepted?', a: 'We accept all major cards, mobile banking, and cash on delivery in selected regions.' },
  { q: 'Do you ship internationally?', a: 'International shipping is available for select destinations. Charges and delivery times vary.' },
];

interface FAQ { id: string; question: string; answer: string; sort_order?: number; }
interface UserQuestion {
  id: string; question: string; answer: string | null; status: string;
  created_at: string; answered_at: string | null; product_id: string | null;
  products?: { name: string } | null;
}
interface ProductOpt { id: string; name: string; }

const PAGE_SIZE = 5;

const QnATab = () => {
  const { user } = useAuthStore();

  // FAQ state
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [faqSearch, setFaqSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  // Ask form
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [question, setQuestion] = useState('');
  const [productId, setProductId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // My questions
  const [myQuestions, setMyQuestions] = useState<UserQuestion[]>([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [qSearch, setQSearch] = useState('');
  const [qFilter, setQFilter] = useState<'all' | 'pending' | 'answered'>('all');
  const [qSort, setQSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);

  // Notifications
  const seenKey = user ? `qa_last_seen_${user.id}` : '';
  const [lastSeen, setLastSeen] = useState<string>(() => (seenKey ? localStorage.getItem(seenKey) || '' : ''));

  const loadFaqs = async () => {
    const { data } = await supabase
      .from('faqs')
      .select('id, question, answer, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    const rows = (data as FAQ[]) || [];
    if (rows.length > 0) setFaqs(rows);
    else setFaqs(DEFAULT_FAQS.map((f, i) => ({ id: `d-${i}`, question: f.q, answer: f.a })));
  };

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('id, name').order('name');
    setProducts((data as ProductOpt[]) || []);
  };

  const loadMyQuestions = async () => {
    if (!user) { setMyQuestions([]); setLoadingQ(false); return; }
    setLoadingQ(true);
    const { data } = await supabase
      .from('user_questions')
      .select('id, question, answer, status, created_at, answered_at, product_id, products(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyQuestions((data as any) || []);
    setLoadingQ(false);
  };

  useEffect(() => { loadFaqs(); loadProducts(); }, []);
  useEffect(() => { loadMyQuestions(); /* eslint-disable-next-line */ }, [user?.id]);

  // Realtime updates for this user's questions
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`uq-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_questions', filter: `user_id=eq.${user.id}` }, () => loadMyQuestions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [user?.id]);

  const filteredFaqs = useMemo(() => {
    const s = faqSearch.trim().toLowerCase();
    if (!s) return faqs;
    return faqs.filter(f => f.question.toLowerCase().includes(s) || f.answer.toLowerCase().includes(s));
  }, [faqs, faqSearch]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please log in to ask a question'); return; }
    const t = question.trim();
    if (t.length < 5) { toast.error('Question must be at least 5 characters'); return; }
    if (t.length > 1000) { toast.error('Question is too long'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('user_questions').insert({
      user_id: user.id, question: t, product_id: productId || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Question submitted — we\'ll reply soon');
    setQuestion(''); setProductId('');
    loadMyQuestions();
  };

  const visible = useMemo(() => {
    let rows = [...myQuestions];
    if (qFilter !== 'all') rows = rows.filter(r => r.status === qFilter);
    const s = qSearch.trim().toLowerCase();
    if (s) rows = rows.filter(r => r.question.toLowerCase().includes(s) || (r.answer || '').toLowerCase().includes(s));
    rows.sort((a, b) => qSort === 'newest'
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return rows;
  }, [myQuestions, qFilter, qSearch, qSort]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageRows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);

  const isUnread = (q: UserQuestion) => !!q.answered_at && (!lastSeen || new Date(q.answered_at).getTime() > new Date(lastSeen).getTime());

  const markAllRead = () => {
    if (!seenKey) return;
    const now = new Date().toISOString();
    localStorage.setItem(seenKey, now);
    setLastSeen(now);
  };

  return (
    <div className="space-y-10">
      {/* SECTION 1: FAQs */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Sparkles className="text-primary" size={22} /> Frequently Asked Questions
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Quick answers to the most common questions.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              value={faqSearch} onChange={e => setFaqSearch(e.target.value)}
              placeholder="Search FAQs..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredFaqs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No FAQs match your search.</p>
          ) : filteredFaqs.map(f => {
            const open = openId === f.id;
            return (
              <div key={f.id} className="bg-card border border-border rounded-xl overflow-hidden transition-all">
                <button
                  onClick={() => setOpenId(open ? null : f.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-semibold text-foreground">{f.question}</span>
                  <ChevronDown size={18} className={`text-muted-foreground transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: Ask a Question */}
      <section className="bg-gradient-to-br from-primary/5 to-transparent border border-border rounded-2xl p-6">
        <h3 className="text-xl font-black text-foreground flex items-center gap-2 mb-1">
          <MessageCircleQuestion className="text-primary" size={22} /> Ask a Question
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Our team typically responds within 24 hours.</p>
        <form onSubmit={submit} className="space-y-3">
          <select
            value={productId} onChange={e => setProductId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">— General question (no specific product) —</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <textarea
            value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="Type your question here..." rows={4} maxLength={1000}
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{question.length}/1000</span>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50 transition">
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Question'}
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 3: My Questions */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-xl font-black text-foreground">My Questions</h3>
            <p className="text-sm text-muted-foreground mt-1">{visible.length} {visible.length === 1 ? 'question' : 'questions'}</p>
          </div>
          {myQuestions.some(isUnread) && (
            <button onClick={markAllRead} className="text-xs font-bold text-primary hover:underline">Mark all as read</button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              value={qSearch} onChange={e => setQSearch(e.target.value)}
              placeholder="Search your questions..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <select value={qFilter} onChange={e => setQFilter(e.target.value as any)} className="px-3 py-2 rounded-xl border border-input bg-background text-sm">
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="answered">Answered</option>
          </select>
          <select value={qSort} onChange={e => setQSort(e.target.value as any)} className="px-3 py-2 rounded-xl border border-input bg-background text-sm">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        {loadingQ ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />)}</div>
        ) : pageRows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
            <MessageCircleQuestion className="mx-auto text-muted-foreground mb-3" size={40} />
            <h4 className="font-bold text-foreground">No questions yet</h4>
            <p className="text-sm text-muted-foreground mt-1">Use the form above to ask your first question.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pageRows.map(q => {
              const unread = isUnread(q);
              return (
                <div key={q.id} className={`bg-card border rounded-2xl p-5 transition-all ${unread ? 'border-primary/60 ring-2 ring-primary/20' : 'border-border'}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-semibold text-foreground flex-1">{q.question}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {unread && <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" title="New reply" />}
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                        q.status === 'answered'
                          ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'
                      }`}>
                        {q.status === 'answered' ? 'Answered' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  {q.products?.name && (
                    <p className="text-xs text-muted-foreground mb-2">Product: <span className="font-semibold">{q.products.name}</span></p>
                  )}
                  {q.answer ? (
                    <div className="mt-3 pl-4 border-l-2 border-primary bg-primary/5 rounded-r-lg py-2 pr-3">
                      <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">Admin Reply</p>
                      <p className="text-sm text-foreground/90 leading-relaxed">{q.answer}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic mt-2">Awaiting reply from our team.</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-3">Asked {new Date(q.created_at).toLocaleDateString()}</p>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg border border-border text-sm font-semibold disabled:opacity-40">Prev</button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-lg border border-border text-sm font-semibold disabled:opacity-40">Next</button>
          </div>
        )}
      </section>
    </div>
  );
};

export default QnATab;

export const useUnreadQACount = () => {
  const { user } = useAuthStore();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) { setCount(0); return; }
    const seenKey = `qa_last_seen_${user.id}`;
    const compute = async () => {
      const { data } = await supabase
        .from('user_questions')
        .select('answered_at')
        .eq('user_id', user.id)
        .eq('status', 'answered')
        .not('answered_at', 'is', null);
      const lastSeen = localStorage.getItem(seenKey);
      const rows = (data as { answered_at: string }[]) || [];
      const n = rows.filter(r => !lastSeen || new Date(r.answered_at).getTime() > new Date(lastSeen).getTime()).length;
      setCount(n);
    };
    compute();
    const channel = supabase
      .channel(`uqc-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_questions', filter: `user_id=eq.${user.id}` }, () => compute())
      .subscribe();
    const onStorage = () => compute();
    window.addEventListener('storage', onStorage);
    return () => { supabase.removeChannel(channel); window.removeEventListener('storage', onStorage); };
  }, [user?.id]);

  return count;
};
