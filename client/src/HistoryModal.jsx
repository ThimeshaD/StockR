import { useState, useEffect } from 'react';
import { api } from './api';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUp, ArrowDown, Wrench, RotateCcw, PlusCircle } from 'lucide-react';

const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } },
};

const TYPE_META = {
  stock_in: { label: 'Stock In', color: 'text-green', bg: 'bg-green-bg', Icon: ArrowUp },
  stock_out: { label: 'Stock Out', color: 'text-red', bg: 'bg-red-bg', Icon: ArrowDown },
  set_count: { label: 'Recount', color: 'text-graphite', bg: 'bg-graphite/5', Icon: RotateCcw },
  build: { label: 'Build', color: 'text-indigo-600', bg: 'bg-indigo-50', Icon: Wrench },
  build_undo: { label: 'Build Undo', color: 'text-teal', bg: 'bg-teal/10', Icon: RotateCcw },
  item_create: { label: 'Created', color: 'text-muted', bg: 'bg-graphite/5', Icon: PlusCircle },
};

function fmtDate(s) {
  if (!s) return '—';
  const parts = s.split(/[- :]/);
  if (parts.length < 3) return s;
  const [y, m, d, h = '00', min = '00'] = parts;
  const dt = new Date(`${y}-${m}-${d}T${h.padStart(2, '0')}:${min.padStart(2, '0')}:00`);
  if (isNaN(dt)) return s;
  return dt.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function HistoryModal({ isOpen, onClose, item }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      api(`/items/${item.id}/history`)
        .then(setHistory)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setHistory([]);
    }
  }, [isOpen, item]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
          className="fixed inset-0 bg-graphite/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            className="bg-surface rounded-2xl w-[640px] max-w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-white/20">
            <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between bg-[#F9FAFB]">
              <div>
                <h2 className="text-[19px] font-bold tracking-tight text-graphite">Stock history</h2>
                <div className="text-[13px] text-muted mt-0.5">{item?.name}</div>
              </div>
              <button onClick={onClose} className="bg-transparent border-none text-muted hover:text-ink hover:bg-black/5 rounded-lg p-1.5 transition-colors cursor-pointer"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted flex-col gap-3">
                  <div className="w-6 h-6 border-4 border-teal/20 border-t-teal rounded-full animate-spin"></div>
                  Loading history…
                </div>
              ) : history.length === 0 ? (
                <div className="py-16 text-center text-muted text-[14px]">No stock movements recorded yet for this item.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-surface z-10">
                    <tr className="text-[11px] font-bold text-muted uppercase tracking-wider border-b border-border/60">
                      <th className="px-5 py-3">When</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3 text-center">Change</th>
                      <th className="px-5 py-3 text-center">Balance</th>
                      <th className="px-5 py-3">Reason</th>
                      <th className="px-5 py-3">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {history.map(m => {
                      const meta = TYPE_META[m.type] || TYPE_META.set_count;
                      const Icon = meta.Icon;
                      const positive = m.change > 0;
                      return (
                        <tr key={m.id} className="hover:bg-graphite/5 transition-colors">
                          <td className="px-5 py-3 text-[12.5px] text-muted whitespace-nowrap">{fmtDate(m.created_at)}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold ${meta.bg} ${meta.color}`}>
                              <Icon size={12} strokeWidth={2.5} /> {meta.label}
                            </span>
                          </td>
                          <td className={`px-5 py-3 text-center font-mono font-bold text-[13px] ${positive ? 'text-green' : m.change < 0 ? 'text-red' : 'text-muted'}`}>
                            {positive ? '+' : ''}{m.change}
                          </td>
                          <td className="px-5 py-3 text-center font-mono text-[12.5px] text-muted">
                            {m.before} → <span className="text-graphite font-bold">{m.after}</span>
                          </td>
                          <td className="px-5 py-3 text-[12.5px] text-ink">{m.reason || '—'}</td>
                          <td className="px-5 py-3 text-[12.5px] text-muted">{m.user || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-4 bg-[#F9FAFB] border-t border-border/60 flex justify-end mt-auto">
              <button onClick={onClose} className="border rounded-xl px-5 py-2.5 text-[14px] font-semibold cursor-pointer bg-surface border-border/80 text-ink hover:bg-black/5 transition-colors shadow-sm">Close</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
