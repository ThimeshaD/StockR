import { useState, useEffect } from 'react';
import { api } from './api';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, ShoppingCart, History, Mail, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 15 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -15 },
};

function ExportCard({ icon: Icon, title, desc, filename, href }) {
  return (
    <div className="bg-surface border border-border/60 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-teal/10 flex items-center justify-center text-teal shrink-0"><Icon size={20} strokeWidth={2.2} /></div>
        <div className="min-w-0">
          <div className="text-[15px] font-bold text-graphite">{title}</div>
          <div className="text-[13px] text-muted truncate">{desc}</div>
        </div>
      </div>
      <a href={href} download={filename}
        className="flex items-center gap-1.5 bg-graphite text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-graphite-2 transition-colors shadow-sm shrink-0">
        <Download size={15} /> CSV
      </a>
    </div>
  );
}

export default function Reports() {
  const [settings, setSettings] = useState(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api('/settings').then(setSettings).catch(console.error);
  }, []);

  const sendLowStock = async () => {
    setSending(true);
    setMsg(null);
    try {
      const res = await api('/reports/send-low-stock', { method: 'POST' });
      const note = res.email_configured
        ? `Low-stock report sent to ${res.recipients.length} reporter(s): ${res.recipients.join(', ')}.`
        : `Email isn't configured on the server, so the report (${res.count} item(s)) was logged to the server console instead of delivered. Configure SMTP in .env to send for real.`;
      setMsg({ error: !res.email_configured, text: note });
    } catch (err) {
      setMsg({ error: true, text: err.message });
    } finally {
      setSending(false);
    }
  };

  const reporters = settings?.reporter_emails || [];

  return (
    <motion.section initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.3 }} className="pb-20 max-w-[820px]">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight mb-1 text-graphite">Reports</h1>
        <div className="text-[15px] text-muted">Export data and send the low-stock alert to your reporters.</div>
      </div>

      <h2 className="text-[16px] font-bold mb-4 text-graphite">Exports</h2>
      <div className="grid gap-4 mb-10">
        <ExportCard icon={FileSpreadsheet} title="Full inventory" desc="Every item with stock, targets, location, supplier and order figures."
          filename="inventory.csv" href="/api/reports/inventory.csv" />
        <ExportCard icon={ShoppingCart} title="Purchase order list" desc="Only items that need ordering, grouped for buying."
          filename="purchase-order.csv" href="/api/reports/order.csv" />
        <ExportCard icon={History} title="Stock movement history" desc="The full audit trail of every stock change."
          filename="stock-movements.csv" href="/api/reports/movements.csv" />
      </div>

      <h2 className="text-[16px] font-bold mb-4 text-graphite">Low-stock email</h2>
      <div className="bg-surface border border-border/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber/10 flex items-center justify-center text-amber shrink-0"><Mail size={20} strokeWidth={2.2} /></div>
          <div>
            <div className="text-[15px] font-bold text-graphite">Send low-stock report</div>
            <div className="text-[13px] text-muted">Emails everything currently below its order target to your reporters.</div>
          </div>
        </div>

        {reporters.length === 0 ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-bg text-amber-700 text-[12.5px] border border-amber/20 mb-4">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>No reporters configured. Add recipient emails on the Settings page first.</span>
          </div>
        ) : (
          <div className="text-[13px] text-muted mb-4">
            Will send to: {reporters.map(r => (
              <span key={r} className="inline-block bg-teal/10 text-teal-dark px-2 py-0.5 rounded-md text-[12px] font-medium border border-teal/20 mr-1.5 mb-1.5">{r}</span>
            ))}
          </div>
        )}

        {msg && (
          <div className={`flex items-start gap-2 p-3 rounded-xl mb-4 text-[13px] font-medium border ${msg.error ? 'bg-amber-bg text-amber-700 border-amber/20' : 'bg-green-bg text-green border-green/20'}`}>
            {msg.error ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />} {msg.text}
          </div>
        )}

        <button onClick={sendLowStock} disabled={sending || reporters.length === 0}
          className="flex items-center gap-2 bg-teal text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold hover:bg-teal-dark active:scale-[0.98] transition-all shadow-md shadow-teal/20 disabled:opacity-60 disabled:cursor-not-allowed">
          <Send size={16} /> {sending ? 'Sending…' : 'Send low-stock report'}
        </button>
      </div>
    </motion.section>
  );
}
