import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminUserQuestions from '@/components/qa/AdminUserQuestions';
import { supabase } from '@/integrations/supabase/client';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STORAGE_KEY = 'Incutech_Mgmt_v6';
const SITE_KEY = 'Incutech_Site_v1';

type TabKey = 'finance' | 'site' | 'announcements' | 'team' | 'faqs' | 'inventory';

interface SiteSettings {
  siteName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  whatsapp: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  businessHours: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}
interface Announcement { id: string; title: string; message: string; active: boolean; createdAt: string; }
interface TeamMember { id: string; name: string; role: string; email: string; photo: string; }
interface FAQ { id: string; question: string; answer: string; }
interface InventoryAlert { lowStockThreshold: number; reorderEmail: string; autoNotify: boolean; }

interface SiteData {
  settings: SiteSettings;
  announcements: Announcement[];
  team: TeamMember[];
  faqs: FAQ[];
  inventory: InventoryAlert;
}

const blankSite = (): SiteData => ({
  settings: {
    siteName: 'IncuTech Systems',
    tagline: '', contactEmail: '', contactPhone: '', address: '',
    whatsapp: '', facebook: '', instagram: '', linkedin: '', youtube: '',
    businessHours: 'Sat-Thu, 9:00 AM - 6:00 PM',
    metaTitle: '', metaDescription: '', metaKeywords: '',
  },
  announcements: [],
  team: [],
  faqs: [],
  inventory: { lowStockThreshold: 5, reorderEmail: '', autoNotify: false },
});

interface Item { id: string; reason: string; amount: number; }
interface MonthData {
  monthlyCosts: Item[];   // recurring fixed costs (rent, salary, internet...)
  expenses: Item[];       // variable monthly expenses
  revenue: number;        // total income earned this month
  marketing: number;      // marketing spend (kept separate to show in operational data)
}

const blankMonth = (): MonthData => ({
  monthlyCosts: [],
  expenses: [],
  revenue: 0,
  marketing: 0,
});

const fmt = (n: number) =>
  `৳ ${Math.max(0, n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- Reusable: Add Item Block ---------- */
const AddItemBlock = ({
  title, items, onAdd, onRemove, accent,
}: {
  title: string;
  items: Item[];
  onAdd: (it: Item) => void;
  onRemove: (id: string) => void;
  accent: string;
}) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');

  const handleOk = () => {
    if (!reason.trim() || !amount) return;
    onAdd({ id: uid(), reason: reason.trim(), amount: Number(amount) || 0 });
    setReason(''); setAmount(''); setOpen(false);
  };

  const total = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className={`rounded-2xl border-l-4 ${accent} bg-white p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800 text-base">{title}</h3>
        <div className="text-sm font-bold text-slate-700">{fmt(total)}</div>
      </div>

      {items.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between text-sm bg-slate-50 px-3 py-2 rounded-lg">
              <span className="text-slate-700">{it.reason}</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-800">{fmt(it.amount)}</span>
                <button
                  onClick={() => onRemove(it.id)}
                  className="text-red-500 hover:text-red-700 text-xs font-bold"
                >✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="bg-slate-50 rounded-xl p-3 space-y-2">
          <input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (e.g. Rent, Electricity, Material...)"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (BDT)"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleOk}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700"
            >OK</button>
            <button
              onClick={() => { setOpen(false); setReason(''); setAmount(''); }}
              className="px-4 bg-slate-200 text-slate-700 py-2 rounded-lg font-bold text-sm hover:bg-slate-300"
            >Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full border-2 border-dashed border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-400 py-2 rounded-xl text-sm font-bold transition"
        >+ Add</button>
      )}
    </div>
  );
};

/* ---------- Reusable: Generic CRUD list ---------- */
type FieldDef = { key: string; label: string; textarea?: boolean };
function CrudList<T extends { id: string }>({
  title, description, items, fields, onAdd, onUpdate, onRemove, extra,
}: {
  title: string;
  description?: string;
  items: T[];
  fields: FieldDef[];
  onAdd: (data: Record<string, string>) => void;
  onUpdate: (id: string, patch: Partial<T>) => void;
  onRemove: (id: string) => void;
  extra?: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  const submit = () => {
    if (!fields.some(f => (draft[f.key] || '').trim())) return;
    onAdd(draft);
    setDraft({}); setOpen(false);
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      </div>

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((it) => {
            const update = (patch: Partial<T>) => onUpdate(it.id, patch);
            return (
              <li key={it.id} className="bg-slate-50 rounded-xl p-4 space-y-2">
                {fields.map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-bold uppercase text-slate-500">{f.label}</label>
                    {f.textarea ? (
                      <textarea
                        rows={2}
                        value={(it as any)[f.key] || ''}
                        onChange={e => update({ [f.key]: e.target.value } as any)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
                      />
                    ) : (
                      <input
                        value={(it as any)[f.key] || ''}
                        onChange={e => update({ [f.key]: e.target.value } as any)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
                      />
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  {extra ? extra(it, update) : <span />}
                  <button onClick={() => onRemove(it.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">✕ Remove</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open ? (
        <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-[10px] font-bold uppercase text-slate-500">{f.label}</label>
              {f.textarea ? (
                <textarea
                  rows={2}
                  value={draft[f.key] || ''}
                  onChange={e => setDraft({ ...draft, [f.key]: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
                />
              ) : (
                <input
                  value={draft[f.key] || ''}
                  onChange={e => setDraft({ ...draft, [f.key]: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
                />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={submit} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700">OK</button>
            <button onClick={() => { setOpen(false); setDraft({}); }} className="px-4 bg-slate-200 text-slate-700 py-2 rounded-lg font-bold text-sm hover:bg-slate-300">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full border-2 border-dashed border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-400 py-2 rounded-xl text-sm font-bold transition"
        >+ Add</button>
      )}
    </section>
  );
}


/* ---------- Site Settings Tab ---------- */
const SiteSettingsTab = ({
  site, inputCls, updateSettings, saveSite,
}: {
  site: SiteData;
  inputCls: string;
  updateSettings: (patch: Partial<SiteSettings>) => void;
  saveSite: (s: SiteData) => void;
}) => {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // saveSite already called on every keystroke via updateSettings,
    // but we call it once more explicitly to fire the storage event
    saveSite(site);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">

      {/* General */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">🏢 General</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-slate-500">Site Name</label><input className={inputCls} value={site.settings.siteName} onChange={e => updateSettings({ siteName: e.target.value })}/></div>
          <div><label className="text-xs font-bold text-slate-500">Tagline</label><input className={inputCls} value={site.settings.tagline} onChange={e => updateSettings({ tagline: e.target.value })}/></div>
          <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500">Business Hours</label><input className={inputCls} value={site.settings.businessHours} onChange={e => updateSettings({ businessHours: e.target.value })}/></div>
        </div>
      </div>

      {/* Contact */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">📞 Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-slate-500">Email</label><input className={inputCls} value={site.settings.contactEmail} onChange={e => updateSettings({ contactEmail: e.target.value })}/></div>
          <div><label className="text-xs font-bold text-slate-500">Phone</label><input className={inputCls} value={site.settings.contactPhone} onChange={e => updateSettings({ contactPhone: e.target.value })}/></div>
          <div><label className="text-xs font-bold text-slate-500">WhatsApp Number</label><input className={inputCls} placeholder="e.g. 8801917974820" value={site.settings.whatsapp} onChange={e => updateSettings({ whatsapp: e.target.value })}/></div>
          <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500">Address</label><input className={inputCls} value={site.settings.address} onChange={e => updateSettings({ address: e.target.value })}/></div>
        </div>
      </div>

      {/* Social Links */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">🔗 Social Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-slate-500">Facebook URL</label><input className={inputCls} placeholder="https://facebook.com/..." value={site.settings.facebook} onChange={e => updateSettings({ facebook: e.target.value })}/></div>
          <div><label className="text-xs font-bold text-slate-500">Instagram URL</label><input className={inputCls} placeholder="https://instagram.com/..." value={site.settings.instagram} onChange={e => updateSettings({ instagram: e.target.value })}/></div>
          <div><label className="text-xs font-bold text-slate-500">LinkedIn URL</label><input className={inputCls} placeholder="https://linkedin.com/..." value={site.settings.linkedin} onChange={e => updateSettings({ linkedin: e.target.value })}/></div>
          <div><label className="text-xs font-bold text-slate-500">YouTube URL</label><input className={inputCls} placeholder="https://youtube.com/..." value={site.settings.youtube} onChange={e => updateSettings({ youtube: e.target.value })}/></div>
        </div>
      </div>

      {/* SEO */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">🔍 SEO</h2>
        <div className="grid grid-cols-1 gap-4">
          <div><label className="text-xs font-bold text-slate-500">Meta Title</label><input className={inputCls} value={site.settings.metaTitle} onChange={e => updateSettings({ metaTitle: e.target.value })}/></div>
          <div><label className="text-xs font-bold text-slate-500">Meta Description</label><textarea className={inputCls} rows={2} value={site.settings.metaDescription} onChange={e => updateSettings({ metaDescription: e.target.value })}/></div>
          <div><label className="text-xs font-bold text-slate-500">Keywords (comma separated)</label><input className={inputCls} value={site.settings.metaKeywords} onChange={e => updateSettings({ metaKeywords: e.target.value })}/></div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
        <button
          onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold text-sm transition shadow"
        >
          💾 Save Changes
        </button>
        {saved && (
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
            ✅ Saved! Footer & Contact info updated.
          </div>
        )}
      </div>
    </section>
  );
};

/* ---------- Inventory Alerts Tab ---------- */
const InventoryAlertsTab = ({
  site, inputCls, updateInventory,
}: {
  site: SiteData;
  inputCls: string;
  updateInventory: (patch: Partial<InventoryAlert>) => void;
}) => {
  const [emailDraft, setEmailDraft] = useState(site.inventory.reorderEmail);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // keep draft in sync if parent changes
  useEffect(() => { setEmailDraft(site.inventory.reorderEmail); }, [site.inventory.reorderEmail]);

  const handleSave = async () => {
    if (!emailDraft.trim()) return;
    setSaving(true);
    setStatus('idle');

    // 1. Persist email to local storage via parent
    updateInventory({ reorderEmail: emailDraft.trim() });

    // 2. Send confirmation email via Supabase Edge Function
    try {
      const { error } = await supabase.functions.invoke('send-inventory-alert', {
        body: {
          to: emailDraft.trim(),
          subject: '✅ Inventory Alert Email Saved',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto">
              <h2 style="color:#4f46e5">📦 Inventory Alert Configured</h2>
              <p>Hi there,</p>
              <p>Your reorder notification email has been saved successfully.</p>
              <ul>
                <li><b>Email:</b> ${emailDraft.trim()}</li>
                <li><b>Low Stock Threshold:</b> ${site.inventory.lowStockThreshold} units</li>
                <li><b>Auto Notify:</b> ${site.inventory.autoNotify ? 'Yes' : 'No'}</li>
              </ul>
              <p>You will receive alerts at this address whenever stock drops below your threshold.</p>
              <p style="color:#888;font-size:12px">— IncuTech Systems</p>
            </div>
          `,
        },
      });

      if (error) throw error;
      setStatus('success');
    } catch (err) {
      console.error('Email send failed:', err);
      setStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">📦 Inventory Alerts</h2>
        <p className="text-xs text-slate-500 mt-1">Get notified when products run low so you can restock in time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500">Low Stock Threshold (units)</label>
          <input
            type="number"
            className={inputCls}
            value={site.inventory.lowStockThreshold || ''}
            onChange={e => updateInventory({ lowStockThreshold: Number(e.target.value) || 0 })}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500">Reorder Notification Email</label>
          <div className="flex gap-2 mt-1">
            <input
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
              type="email"
              placeholder="you@example.com"
              value={emailDraft}
              onChange={e => { setEmailDraft(e.target.value); setStatus('idle'); }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <button
              onClick={handleSave}
              disabled={saving || !emailDraft.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition whitespace-nowrap
                ${saving ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {saving ? '⏳ Saving…' : '💾 Save & Notify'}
            </button>
          </div>

          {/* Status message */}
          {status === 'success' && (
            <div className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              ✅ Saved! A confirmation email has been sent to <span className="underline">{emailDraft.trim()}</span>
            </div>
          )}
          {status === 'error' && (
            <div className="mt-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ⚠️ Email could not be sent. Check your Supabase Edge Function setup. Email was still saved locally.
            </div>
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <input
          type="checkbox"
          checked={site.inventory.autoNotify}
          onChange={e => updateInventory({ autoNotify: e.target.checked })}
        />
        Automatically email me when stock drops below threshold
      </label>
    </section>
  );
};

const Management = () => {
  // Initial investment line items
  const [initialInvestment, setInitialInvestment] = useState<Item[]>([]);
  const [months, setMonths] = useState<MonthData[]>(() =>
    Array.from({ length: 12 }, () => blankMonth())
  );
  const [currentMonth, setCurrentMonth] = useState(0);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [tab, setTab] = useState<TabKey>('finance');
  const [site, setSite] = useState<SiteData>(blankSite);

  // Persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.initialInvestment) setInitialInvestment(p.initialInvestment);
        if (p.months) {
          const arr: MonthData[] = Array.from({ length: 12 }, (_, i) => ({
            ...blankMonth(),
            ...(p.months[i] || {}),
            monthlyCosts: p.months[i]?.monthlyCosts || [],
            expenses: p.months[i]?.expenses || [],
          }));
          setMonths(arr);
        }
      }
      const savedSite = localStorage.getItem(SITE_KEY);
      if (savedSite) {
        const s = JSON.parse(savedSite);
        setSite({ ...blankSite(), ...s, settings: { ...blankSite().settings, ...(s.settings || {}) }, inventory: { ...blankSite().inventory, ...(s.inventory || {}) } });
      }
    } catch {}
  }, []);

  const saveSite = (s: SiteData) => {
    setSite(s);
    try {
      localStorage.setItem(SITE_KEY, JSON.stringify(s));
      // Notify Footer and other components in the same tab
      window.dispatchEvent(new StorageEvent('storage', { key: SITE_KEY, newValue: JSON.stringify(s) }));
    } catch {}
  };
  const updateSettings = (patch: Partial<SiteSettings>) => saveSite({ ...site, settings: { ...site.settings, ...patch } });
  const updateInventory = (patch: Partial<InventoryAlert>) => saveSite({ ...site, inventory: { ...site.inventory, ...patch } });

  const saveAll = (init: Item[], ms: MonthData[]) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ initialInvestment: init, months: ms })); } catch {}
  };

  /* ----- Mutators ----- */
  const addInitial = (it: Item) => {
    const next = [...initialInvestment, it];
    setInitialInvestment(next); saveAll(next, months);
  };
  const removeInitial = (id: string) => {
    const next = initialInvestment.filter(x => x.id !== id);
    setInitialInvestment(next); saveAll(next, months);
  };
  const updateMonth = (idx: number, patch: Partial<MonthData>) => {
    const next = months.map((m, i) => i === idx ? { ...m, ...patch } : m);
    setMonths(next); saveAll(initialInvestment, next);
  };
  const addCost = (it: Item) => updateMonth(currentMonth, { monthlyCosts: [...months[currentMonth].monthlyCosts, it] });
  const removeCost = (id: string) => updateMonth(currentMonth, { monthlyCosts: months[currentMonth].monthlyCosts.filter(x => x.id !== id) });
  const addExpense = (it: Item) => updateMonth(currentMonth, { expenses: [...months[currentMonth].expenses, it] });
  const removeExpense = (id: string) => updateMonth(currentMonth, { expenses: months[currentMonth].expenses.filter(x => x.id !== id) });

  /* ----- Calculations (simple, easy to read) ----- */
  const totalInitial = useMemo(() => initialInvestment.reduce((s, i) => s + i.amount, 0), [initialInvestment]);

  const calcMonth = (m: MonthData) => {
    const fixedCosts = m.monthlyCosts.reduce((s, i) => s + i.amount, 0);
    const otherExpenses = m.expenses.reduce((s, i) => s + i.amount, 0);
    const totalOutflow = fixedCosts + otherExpenses + m.marketing;
    const netProfit = m.revenue - totalOutflow;
    return { fixedCosts, otherExpenses, totalOutflow, netProfit };
  };

  const md = months[currentMonth];
  const calc = useMemo(() => calcMonth(md), [md]);

  // Profit distribution (new breakdown: 30 / 25 Marketing / 15 Technical / 25 Owners / 5 Reserve)
  const dist = useMemo(() => {
    const p = Math.max(0, calc.netProfit);
    return {
      // Reinvestment 30%
      reinvest: p * 0.30,

      // Marketing 25%
      hardMarketing: p * 0.10,
      sells:         p * 0.10,
      softMarketing: p * 0.05,

      // Technical 15%
      coreTech: p * 0.12,
      rnd:      p * 0.02,
      bonus:    p * 0.01,

      // Owners 25%
      osmani: p * 0.15,
      mobin:  p * 0.10,

      // Reserve 5%
      reserve: p * 0.05,
    };
  }, [calc.netProfit]);

  // Investment recovery: each month "reserve" pays back investment
  const recoveryRows = useMemo(() => {
    let recovered = 0;
    return months.map((m, i) => {
      const c = calcMonth(m);
      const distI = Math.max(0, c.netProfit) * 0.05;
      const need = Math.max(0, totalInitial - recovered);
      const paid = Math.min(distI, need);
      recovered += paid;
      return {
        month: SHORT[i],
        revenue: m.revenue,
        netProfit: c.netProfit,
        paidThisMonth: paid,
        cumulative: recovered,
        remaining: Math.max(0, totalInitial - recovered),
      };
    });
  }, [months, totalInitial]);

  const fullyRecoveredAt = recoveryRows.findIndex(r => r.remaining === 0 && totalInitial > 0);

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: 'finance',       label: 'Financial', icon: '💰' },
    { key: 'site',          label: 'Site Settings', icon: '⚙️' },
    { key: 'announcements', label: 'Announcements', icon: '📣' },
    { key: 'team',          label: 'Team', icon: '👥' },
    { key: 'faqs',          label: 'FAQs', icon: '❓' },
    { key: 'inventory',     label: 'Inventory Alerts', icon: '📦' },
  ];

  const inputCls = "w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900">Business Management</h1>
          <p className="text-sm text-slate-500">Manage finances, site content, team, and customer-facing info from one place.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === t.key ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-indigo-50'}`}
            >{t.icon} {t.label}</button>
          ))}
        </div>

        {tab === 'finance' && <>

        {/* STEP 1 — Initial Investment */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white grid place-items-center font-bold text-sm">1</div>
            <h2 className="text-lg font-bold text-slate-800">Initial Investment</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">One-time startup costs (machinery, setup, license, deposit, etc.)</p>
          <AddItemBlock
            title="Startup Cost Items"
            items={initialInvestment}
            onAdd={addInitial}
            onRemove={removeInitial}
            accent="border-l-indigo-500"
          />
        </section>

        {/* STEP 2 — Month Selector */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white grid place-items-center font-bold text-sm">2</div>
            <h2 className="text-lg font-bold text-slate-800">Select Month</h2>
          </div>
          <div className="relative inline-block">
            <button
              onClick={() => setShowMonthPicker(v => !v)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold inline-flex items-center gap-2"
            >
              📅 {MONTHS[currentMonth]} ▾
            </button>
            {showMonthPicker && (
              <div className="absolute z-20 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-2 grid grid-cols-3 gap-1 w-72">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => { setCurrentMonth(i); setShowMonthPicker(false); }}
                    className={`px-3 py-2 rounded-lg text-sm font-bold ${i === currentMonth ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-indigo-50'}`}
                  >{SHORT[i]}</button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-3">All inputs below belong to <b>{MONTHS[currentMonth]}</b>. Click the button to switch months — every month is saved separately.</p>
        </section>

        {/* STEP 3 — Monthly Cost (Fixed) */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white grid place-items-center font-bold text-sm">3</div>
            <h2 className="text-lg font-bold text-slate-800">Monthly Cost — {MONTHS[currentMonth]}</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Recurring fixed costs (rent, salary, internet, electricity, etc.)</p>
          <AddItemBlock
            title="Fixed Monthly Cost Items"
            items={md.monthlyCosts}
            onAdd={addCost}
            onRemove={removeCost}
            accent="border-l-purple-500"
          />
        </section>

        {/* STEP 4 — Expenses (Variable) + Marketing */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white grid place-items-center font-bold text-sm">4</div>
            <h2 className="text-lg font-bold text-slate-800">Expenses — {MONTHS[currentMonth]}</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">One-off or variable expenses for this month (repairs, materials, unexpected costs)</p>
          <AddItemBlock
            title="Expense Items"
            items={md.expenses}
            onAdd={addExpense}
            onRemove={removeExpense}
            accent="border-l-orange-500"
          />
          <div className="mt-5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">📢 Marketing Spend (BDT)</label>
            <input
              type="number" value={md.marketing || ''}
              onChange={(e) => updateMonth(currentMonth, { marketing: Number(e.target.value) || 0 })}
              placeholder="Ads, promotion, etc."
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </section>

        {/* STEP 5 — Income */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white grid place-items-center font-bold text-sm">5</div>
            <h2 className="text-lg font-bold text-slate-800">Income — {MONTHS[currentMonth]}</h2>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">💰 Total Revenue (BDT)</label>
            <input
              type="number" value={md.revenue || ''}
              onChange={(e) => updateMonth(currentMonth, { revenue: Number(e.target.value) || 0 })}
              placeholder="Total money earned this month"
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </section>

        {/* FINAL SUMMARY */}
        <section className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
          <h2 className="text-xl font-black mb-1">📊 Final Summary — {MONTHS[currentMonth]}</h2>
          <p className="text-xs opacity-80 mb-5">Initial Investment (Startup Cost · Recovery Setup) + 1 Month Operational Data</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-xs opacity-80">🏭 Initial Investment</div>
              <div className="text-2xl font-black mt-1">{fmt(totalInitial)}</div>
              <div className="text-[10px] opacity-70 mt-1">{initialInvestment.length} startup item(s)</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-xs opacity-80">🏢 Fixed Monthly Cost</div>
              <div className="text-2xl font-black mt-1">{fmt(calc.fixedCosts)}</div>
              <div className="text-[10px] opacity-70 mt-1">{md.monthlyCosts.length} recurring item(s)</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-xs opacity-80">📢 Marketing Spend</div>
              <div className="text-2xl font-black mt-1">{fmt(md.marketing)}</div>
              <div className="text-[10px] opacity-70 mt-1">Ads & promotion</div>
            </div>
          </div>

          {/* Plain-English calculation */}
          <div className="bg-black/20 rounded-xl p-5 space-y-2 text-sm">
            <div className="flex justify-between"><span>💰 Income (Revenue)</span><span className="font-bold">{fmt(md.revenue)}</span></div>
            <div className="flex justify-between"><span>− Fixed Monthly Cost</span><span>{fmt(calc.fixedCosts)}</span></div>
            <div className="flex justify-between"><span>− Other Expenses</span><span>{fmt(calc.otherExpenses)}</span></div>
            <div className="flex justify-between"><span>− Marketing</span><span>{fmt(md.marketing)}</span></div>
            <div className="border-t border-white/20 pt-2 flex justify-between font-black text-lg">
              <span>= Net Profit</span>
              <span className={calc.netProfit >= 0 ? 'text-green-300' : 'text-red-300'}>{fmt(calc.netProfit)}</span>
            </div>
          </div>
        </section>

        {/* Profit Distribution — Detailed */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">📌 Monthly Profit Distribution</h2>
            <p className="text-xs text-slate-500">
              Based on Operational Net Profit ({fmt(calc.netProfit)}).
              Reinvestment 30% · Marketing 25% · Technical 15% · Owners 25% · Reserve 5%.
            </p>
          </div>

          {/* Row 1: Reinvestment */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs opacity-80">30%</div>
                <div className="font-bold text-lg mt-0.5">🔄 Reinvestment in Business</div>
                <div className="text-[11px] opacity-80 mt-1">New stock, equipment, growth</div>
              </div>
              <div className="text-3xl font-black">{fmt(dist.reinvest)}</div>
            </div>
          </div>

          {/* Row 2: Marketing */}
          <div className="rounded-2xl border border-violet-200 overflow-hidden">
            <div className="bg-violet-600 text-white px-5 py-3 flex items-center justify-between">
              <span className="font-bold">📢 Marketing — 25%</span>
              <span className="font-black text-lg">{fmt(dist.hardMarketing + dist.sells + dist.softMarketing)}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-violet-100">
              {[
                { label: 'Hard Marketing', pct: '10%', amt: dist.hardMarketing, icon: '📣' },
                { label: 'Sells',          pct: '10%', amt: dist.sells,         icon: '💼' },
                { label: 'Soft Marketing', pct: '5%',  amt: dist.softMarketing, icon: '🌐' },
              ].map((d, i) => (
                <div key={i} className="px-5 py-4 bg-violet-50">
                  <div className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">{d.pct}</div>
                  <div className="font-bold text-violet-800 mt-0.5">{d.icon} {d.label}</div>
                  <div className="text-xl font-black text-violet-700 mt-1">{fmt(d.amt)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3: Technical */}
          <div className="rounded-2xl border border-cyan-200 overflow-hidden">
            <div className="bg-cyan-600 text-white px-5 py-3 flex items-center justify-between">
              <span className="font-bold">⚙️ Technical — 15%</span>
              <span className="font-black text-lg">{fmt(dist.coreTech + dist.rnd + dist.bonus)}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-cyan-100">
              {[
                { label: 'Core Tech Team', pct: '12%', amt: dist.coreTech, icon: '💻' },
                { label: 'R&D',            pct: '2%',  amt: dist.rnd,      icon: '🔬' },
                { label: 'Bonus',          pct: '1%',  amt: dist.bonus,    icon: '🎁' },
              ].map((d, i) => (
                <div key={i} className="px-5 py-4 bg-cyan-50">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{d.pct}</div>
                  <div className="font-bold text-cyan-800 mt-0.5">{d.icon} {d.label}</div>
                  <div className="text-xl font-black text-cyan-700 mt-1">{fmt(d.amt)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 4: Owners */}
          <div className="rounded-2xl border border-emerald-200 overflow-hidden">
            <div className="bg-emerald-600 text-white px-5 py-3 flex items-center justify-between">
              <span className="font-bold">🧑‍💼 Owners — 25%</span>
              <span className="font-black text-lg">{fmt(dist.osmani + dist.mobin)}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-emerald-100">
              {[
                { label: 'Osmani', pct: '15%', amt: dist.osmani, icon: '👤' },
                { label: 'Mobin',  pct: '10%', amt: dist.mobin,  icon: '👤' },
              ].map((d, i) => (
                <div key={i} className="px-5 py-4 bg-emerald-50">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{d.pct}</div>
                  <div className="font-bold text-emerald-800 mt-0.5">{d.icon} {d.label}</div>
                  <div className="text-xl font-black text-emerald-700 mt-1">{fmt(d.amt)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 5: Reserve */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs opacity-80">5%</div>
                <div className="font-bold text-lg mt-0.5">🛡️ Reserve (Recovery)</div>
                <div className="text-[11px] opacity-80 mt-1">Pays back the initial investment</div>
              </div>
              <div className="text-3xl font-black">{fmt(dist.reserve)}</div>
            </div>
          </div>

          {/* Total check */}
          <div className="bg-slate-900 text-white rounded-xl px-5 py-3 flex items-center justify-between text-sm">
            <span className="font-bold opacity-70">Total Distributed (= Net Profit if positive)</span>
            <span className="font-black text-base">{fmt(dist.reinvest + dist.hardMarketing + dist.sells + dist.softMarketing + dist.coreTech + dist.rnd + dist.bonus + dist.osmani + dist.mobin + dist.reserve)}</span>
          </div>
        </section>

        {/* Recovery toggle */}
        <div className="text-center">
          <button
            onClick={() => setShowRecovery(v => !v)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-full font-bold shadow-lg inline-flex items-center gap-2"
          >
            {showRecovery ? '🔼 Hide Investment Recovery' : '🔽 Show After Investment Recovery'}
          </button>
        </div>

        {showRecovery && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1">📉 After Investment Recovery</h2>
            <p className="text-xs text-slate-500 mb-4">
              Each month, 5% of net profit (the Reserve) pays back your initial investment of <b>{fmt(totalInitial)}</b>.
              {fullyRecoveredAt >= 0 && (
                <span className="text-emerald-600 font-bold"> ✅ Fully recovered by {MONTHS[fullyRecoveredAt]}.</span>
              )}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Month</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                    <th className="px-3 py-2 text-right">Net Profit</th>
                    <th className="px-3 py-2 text-right">Paid Back</th>
                    <th className="px-3 py-2 text-right">Cumulative</th>
                    <th className="px-3 py-2 text-right">Remaining</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recoveryRows.map((r, i) => (
                    <tr key={i} className={`border-b border-slate-100 dark:border-slate-700 ${i === currentMonth ? 'bg-indigo-50 dark:bg-indigo-500/20' : ''}`}>
                      <td className="px-3 py-2 font-bold">
                        <button onClick={() => setCurrentMonth(i)} className="hover:text-indigo-600">{r.month}</button>
                      </td>
                      <td className="px-3 py-2 text-right">{fmt(r.revenue)}</td>
                      <td className={`px-3 py-2 text-right ${r.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(r.netProfit)}</td>
                      <td className="px-3 py-2 text-right text-amber-600 font-bold">{fmt(r.paidThisMonth)}</td>
                      <td className="px-3 py-2 text-right">{fmt(r.cumulative)}</td>
                      <td className="px-3 py-2 text-right">{fmt(r.remaining)}</td>
                      <td className="px-3 py-2 text-center">
                        {totalInitial === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : r.remaining === 0 ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">RECOVERED</span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">RECOVERING</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        </>}

        {/* SITE SETTINGS */}
        {tab === 'site' && (
          <SiteSettingsTab
            site={site}
            inputCls={inputCls}
            updateSettings={updateSettings}
            saveSite={saveSite}
          />
        )}

        {tab === 'announcements' && (
          <CrudList
            title="📣 Announcements / Promo Banners"
            description="Show announcements or promotions to your customers."
            items={site.announcements}
            fields={[
              { key: 'title', label: 'Title' },
              { key: 'message', label: 'Message', textarea: true },
            ]}
            extra={(it, update) => (
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" checked={(it as Announcement).active} onChange={e => update({ active: e.target.checked })}/>
                Active
              </label>
            )}
            onAdd={(data) => saveSite({ ...site, announcements: [...site.announcements, { id: uid(), title: data.title || '', message: data.message || '', active: true, createdAt: new Date().toISOString() }] })}
            onUpdate={(id, patch) => saveSite({ ...site, announcements: site.announcements.map(a => a.id === id ? { ...a, ...patch } : a) })}
            onRemove={(id) => saveSite({ ...site, announcements: site.announcements.filter(a => a.id !== id) })}
          />
        )}

        {tab === 'team' && (
          <CrudList
            title="👥 Team Members"
            description="People shown on your About / Team page."
            items={site.team}
            fields={[
              { key: 'name', label: 'Name' },
              { key: 'role', label: 'Role / Position' },
              { key: 'email', label: 'Email' },
              { key: 'photo', label: 'Photo URL' },
            ]}
            onAdd={(data) => saveSite({ ...site, team: [...site.team, { id: uid(), name: data.name || '', role: data.role || '', email: data.email || '', photo: data.photo || '' }] })}
            onUpdate={(id, patch) => saveSite({ ...site, team: site.team.map(a => a.id === id ? { ...a, ...patch } : a) })}
            onRemove={(id) => saveSite({ ...site, team: site.team.filter(a => a.id !== id) })}
          />
        )}

        {tab === 'faqs' && (
          <div className="space-y-6">
            <CrudList
              title="❓ Frequently Asked Questions"
              description="Help customers by answering common questions."
              items={site.faqs}
              fields={[
                { key: 'question', label: 'Question' },
                { key: 'answer', label: 'Answer', textarea: true },
              ]}
              onAdd={(data) => saveSite({ ...site, faqs: [...site.faqs, { id: uid(), question: data.question || '', answer: data.answer || '' }] })}
              onUpdate={(id, patch) => saveSite({ ...site, faqs: site.faqs.map(a => a.id === id ? { ...a, ...patch } : a) })}
              onRemove={(id) => saveSite({ ...site, faqs: site.faqs.filter(a => a.id !== id) })}
            />
            <AdminUserQuestions />
          </div>
        )}

        {tab === 'inventory' && (
          <InventoryAlertsTab
            site={site}
            inputCls={inputCls}
            updateInventory={updateInventory}
          />
        )}
      </div>
    </AdminLayout>

  );
};

export default Management;
