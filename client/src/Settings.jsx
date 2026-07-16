import { useState, useEffect } from 'react';
import { api } from './api';
import { motion } from 'framer-motion';
import { Save, Target, Mail, Plus, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 15 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -15 },
};

const DOMAIN = 'attune-integrations.com';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [tableTarget, setTableTarget] = useState(10);
  const [counterTarget, setCounterTarget] = useState(10);
  const [reporters, setReporters] = useState([]);
  const [newReporter, setNewReporter] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    try {
      const s = await api('/settings');
      setSettings(s);
      setTableTarget(s.table_unit_target);
      setCounterTarget(s.counter_unit_target);
      setReporters(s.reporter_emails || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, []);

  const addReporter = () => {
    let v = newReporter.trim().toLowerCase();
    if (!v) return;
    if (!v.includes('@')) v = `${v}@${DOMAIN}`;
    if (!v.endsWith(`@${DOMAIN}`)) {
      setMsg({ error: true, text: `Reporter emails must be @${DOMAIN} addresses.` });
      return;
    }
    if (reporters.includes(v)) { setNewReporter(''); return; }
    setReporters([...reporters, v]);
    setNewReporter('');
    setMsg(null);
  };

  const removeReporter = (email) => setReporters(reporters.filter(r => r !== email));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const updated = await api('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          table_unit_target: Number(tableTarget),
          counter_unit_target: Number(counterTarget),
          reporter_emails: reporters,
        }),
      });
      setSettings(updated);
      setReporters(updated.reporter_emails || []);
      setMsg({ error: false, text: 'Settings saved.' });
      window.dispatchEvent(new Event('inventory-updated'));
    } catch (err) {
      setMsg({ error: true, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full text-muted flex-col gap-4">
        <div className="w-8 h-8 border-4 border-teal/20 border-t-teal rounded-full animate-spin"></div>
        <div className="font-medium animate-pulse">Loading settings…</div>
      </div>
    );
  }

  return (
    <motion.section initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.3 }} className="pb-20 max-w-[760px]">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight mb-1 text-graphite">Settings</h1>
        <div className="text-[15px] text-muted">Order targets and low-stock report recipients.</div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-xl mb-6 text-[13.5px] font-medium border ${msg.error ? 'bg-red-bg text-red border-red/20' : 'bg-green-bg text-green border-green/20'}`}>
          {msg.error ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />} {msg.text}
        </div>
      )}

      {/* Order targets */}
      <div className="bg-surface border border-border/60 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center text-teal"><Target size={20} strokeWidth={2.5} /></div>
          <div>
            <h3 className="text-[17px] font-bold text-graphite">Order targets</h3>
            <div className="text-[13px] text-muted">How many devices' worth of stock to keep on hand. Drives the "to order" figures.</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-graphite">Table Unit target</label>
            <input type="number" min="0" step="1" value={tableTarget} onChange={e => setTableTarget(e.target.value)}
              className="px-3.5 py-2.5 text-[14px] border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm font-mono" />
            <span className="text-[12px] text-muted">Keep enough parts to build {tableTarget || 0} table unit(s).</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-graphite">Counter Unit target</label>
            <input type="number" min="0" step="1" value={counterTarget} onChange={e => setCounterTarget(e.target.value)}
              className="px-3.5 py-2.5 text-[14px] border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm font-mono" />
            <span className="text-[12px] text-muted">Keep enough parts to build {counterTarget || 0} counter unit(s).</span>
          </div>
        </div>
      </div>

      {/* Reporter emails */}
      <div className="bg-surface border border-border/60 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center text-amber"><Mail size={20} strokeWidth={2.5} /></div>
          <div>
            <h3 className="text-[17px] font-bold text-graphite">Low-stock reporters</h3>
            <div className="text-[13px] text-muted">People who receive the low-stock email from the Reports page.</div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              value={newReporter}
              onChange={e => setNewReporter(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addReporter(); } }}
              placeholder={`name or name@${DOMAIN}`}
              className="w-full px-3.5 py-2.5 text-[14px] border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm"
            />
          </div>
          <button onClick={addReporter} className="flex items-center gap-1.5 bg-graphite text-white px-4 py-2.5 rounded-xl text-[13.5px] font-semibold hover:bg-graphite-2 transition-colors shadow-sm">
            <Plus size={16} /> Add
          </button>
        </div>

        {reporters.length === 0 ? (
          <div className="text-[13px] text-muted italic">No reporters yet. Add at least one to enable low-stock emails.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {reporters.map(email => (
              <span key={email} className="inline-flex items-center gap-2 bg-teal/10 text-teal-dark px-3 py-1.5 rounded-lg text-[13px] font-medium border border-teal/20">
                {email}
                <button onClick={() => removeReporter(email)} className="hover:text-red transition-colors"><X size={14} strokeWidth={2.5} /></button>
              </span>
            ))}
          </div>
        )}

        {!settings.email_configured && (
          <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-amber-bg text-amber-700 text-[12.5px] border border-amber/20">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>Email sending isn't configured on the server yet. Set <code className="font-mono">SMTP_USER</code> and <code className="font-mono">SMTP_PASS</code> in <code className="font-mono">.env</code> to actually deliver emails. Until then, emails are logged to the server console.</span>
          </div>
        )}
      </div>

      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 bg-teal text-white px-6 py-3 rounded-xl text-[14px] font-semibold hover:bg-teal-dark active:scale-[0.98] transition-all shadow-md shadow-teal/20 disabled:opacity-60">
        <Save size={17} /> {saving ? 'Saving…' : 'Save settings'}
      </button>
    </motion.section>
  );
}
