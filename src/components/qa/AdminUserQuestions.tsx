import { Fragment, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Row {
  id: string;
  user_id: string;
  question: string;
  answer: string | null;
  status: string;
  created_at: string;
  products?: { name: string } | null;
}

const AdminUserQuestions = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_questions')
      .select('id, user_id, question, answer, status, created_at, products(name)')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startReply = (r: Row) => {
    setReplyId(r.id);
    setReplyText(r.answer || '');
  };

  const saveReply = async (id: string) => {
    if (!replyText.trim()) { toast.error('Answer cannot be empty'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('user_questions')
      .update({
        answer: replyText.trim(),
        status: 'answered',
        answered_at: new Date().toISOString(),
      })
      .eq('id', id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Reply saved');
    setReplyId(null); setReplyText('');
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    const { error } = await supabase.from('user_questions').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted');
    load();
  };

  return (
    <section className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-border p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-foreground">💬 User Submitted Questions</h2>
        <p className="text-xs text-slate-500 dark:text-muted-foreground">Reply to questions submitted by users. Replies are visible only to the asker.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">No user questions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-border text-left text-xs font-bold text-slate-500 uppercase">
                <th className="py-2 pr-3">User ID</th>
                <th className="py-2 pr-3">Question</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-b border-slate-100 dark:border-border/50 align-top">
                    <td className="py-3 pr-3 font-mono text-xs text-slate-600 dark:text-muted-foreground break-all max-w-[140px]">{r.user_id.slice(0, 8)}…</td>
                    <td className="py-3 pr-3 text-slate-800 dark:text-foreground max-w-md">
                      {r.question}
                      {r.products?.name && <div className="text-xs text-slate-500 mt-1">Product: {r.products.name}</div>}
                      {r.answer && <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Reply: {r.answer}</div>}
                    </td>
                    <td className="py-3 pr-3 text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="py-3 pr-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                        r.status === 'answered'
                          ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'
                      }`}>{r.status}</span>
                    </td>
                    <td className="py-3 space-x-2 whitespace-nowrap">
                      <button onClick={() => startReply(r)} className="text-xs font-bold text-indigo-600 hover:underline">
                        {r.answer ? 'Edit Reply' : 'Reply'}
                      </button>
                      <button onClick={() => remove(r.id)} className="text-xs font-bold text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                  {replyId === r.id && (
                    <tr>
                      <td colSpan={5} className="py-3 pr-3">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                          placeholder="Type your reply..."
                          className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-border bg-white dark:bg-background text-sm"
                        />
                        <div className="mt-2 space-x-2">
                          <button
                            onClick={() => saveReply(r.id)}
                            disabled={saving}
                            className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-md hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save Reply'}
                          </button>
                          <button
                            onClick={() => { setReplyId(null); setReplyText(''); }}
                            className="px-4 py-1.5 bg-slate-200 dark:bg-muted text-slate-700 dark:text-foreground text-xs font-bold rounded-md"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AdminUserQuestions;
