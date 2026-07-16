import { useState, useEffect, useMemo } from 'react';
import { api } from './api';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 300 }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -20,
    transition: { duration: 0.2 }
  }
};

export default function BuildDeviceModal({ isOpen, onClose, onConfirm }) {
  const [category, setCategory] = useState('table_unit');
  const [buildName, setBuildName] = useState('');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [fetchingItems, setFetchingItems] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCount(1);
      setBuildName('');
      setError('');
      setLoading(false);
      setFetchingItems(true);
      api('/items').then(data => {
        setItems(data);
      }).catch(err => {
        setError('Failed to load components: ' + err.message);
      }).finally(() => {
        setFetchingItems(false);
      });
    }
  }, [isOpen]);

  const categoryItems = useMemo(() => {
    const isTable = category === 'table_unit';
    return items.filter(i => isTable ? (i.table_unit_qty > 0) : (i.counter_unit_qty > 0));
  }, [items, category]);

  const groupedItems = useMemo(() => {
    const groupMap = new Map();
    categoryItems.forEach(item => {
      const sub = item.subcategory || 'Uncategorized';
      if (!groupMap.has(sub)) {
        groupMap.set(sub, []);
      }
      groupMap.get(sub).push(item);
    });
    return Array.from(groupMap.entries());
  }, [categoryItems]);

  useEffect(() => {
    if (isOpen && categoryItems.length > 0) {
      const ignoredStr = localStorage.getItem('ignoredBuildComponents');
      let ignoredIds = new Set();
      try {
        ignoredIds = new Set(ignoredStr ? JSON.parse(ignoredStr) : []);
      } catch (e) {
        ignoredIds = new Set();
      }
      
      const initialSelected = new Set();
      categoryItems.forEach(item => {
        if (!ignoredIds.has(item.id)) {
          initialSelected.add(item.id);
        }
      });
      setSelectedItemIds(initialSelected);
    }
  }, [isOpen, categoryItems]);

  const toggleItem = (id) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      const ignoredStr = localStorage.getItem('ignoredBuildComponents');
      let globalIgnored = new Set();
      try {
        globalIgnored = new Set(ignoredStr ? JSON.parse(ignoredStr) : []);
      } catch (e) {}

      if (next.has(id)) {
        next.delete(id);
        globalIgnored.add(id);
      } else {
        next.add(id);
        globalIgnored.delete(id);
      }
      
      localStorage.setItem('ignoredBuildComponents', JSON.stringify(Array.from(globalIgnored)));
      return next;
    });
  };

  const toggleSubcategory = (subItems) => {
    const allSelected = subItems.every(i => selectedItemIds.has(i.id));
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      const ignoredStr = localStorage.getItem('ignoredBuildComponents');
      let globalIgnored = new Set();
      try {
        globalIgnored = new Set(ignoredStr ? JSON.parse(ignoredStr) : []);
      } catch (e) {}

      subItems.forEach(item => {
        if (allSelected) {
          next.delete(item.id);
          globalIgnored.add(item.id);
        } else {
          next.add(item.id);
          globalIgnored.delete(item.id);
        }
      });
      
      localStorage.setItem('ignoredBuildComponents', JSON.stringify(Array.from(globalIgnored)));
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (count < 1) return;
    if (!buildName.trim()) {
      setError('Please provide a name for this build.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onConfirm(category, count, Array.from(selectedItemIds), buildName.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 bg-graphite/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-surface rounded-2xl w-[460px] max-w-full shadow-2xl overflow-hidden flex flex-col border border-white/20"
          >
            <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between bg-[#F9FAFB]">
              <h2 className="text-[19px] font-bold tracking-tight text-graphite">🏭 Build Device</h2>
              <button onClick={onClose} className="bg-transparent border-none text-muted hover:text-ink hover:bg-black/5 rounded-lg p-1.5 transition-colors cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <p className="text-[14px] text-muted mb-5">
                  This will <strong className="text-ink">deduct components</strong> from inventory based on the quantities required for the selected device.
                </p>

                {error && (
                  <div className="bg-red-bg text-red p-3.5 rounded-xl mb-5 text-[13px] border border-red/20 leading-relaxed">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[13px] font-semibold text-graphite">Build Name</label>
                  <input 
                    type="text" 
                    value={buildName} 
                    onChange={(e) => setBuildName(e.target.value)}
                    placeholder="e.g. Test Unit 1, KCC_bar_Unit..."
                    required
                    autoFocus
                    className="px-3.5 py-3 text-[14px] font-semibold border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-graphite">Select Device</label>
                    <select 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)}
                      className="px-3.5 py-3 text-[14px] font-semibold border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm"
                    >
                      <option value="table_unit">Table Unit</option>
                      <option value="counter_unit">Counter Unit</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-graphite">How many devices?</label>
                    <input 
                      type="number" 
                      min="1" 
                      step="1"
                      value={count} 
                      onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="px-3.5 py-3 text-[16px] font-semibold border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm text-center" 
                    />
                  </div>
                </div>

                <div className="mt-2 bg-amber-bg/40 border border-amber/20 rounded-xl px-4 py-3 text-[12.5px] text-amber-700 flex items-start gap-2.5">
                  <span className="text-[16px] mt-[-1px]">⚠️</span>
                  <span>This action will reduce stock for <strong>all ticked components</strong>. Make sure you have enough stock before proceeding.</span>
                </div>

                {fetchingItems ? (
                  <div className="flex justify-center p-4 mt-4"><div className="w-5 h-5 border-2 border-teal/30 border-t-teal rounded-full animate-spin"></div></div>
                ) : categoryItems.length > 0 ? (
                  <div className="mt-4 border border-border/80 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto bg-surface shadow-inner">
                    <div className="px-3.5 py-2 bg-[#F9FAFB] border-b border-border/60 text-[11px] font-bold tracking-wide uppercase text-muted flex justify-between sticky top-0 z-10 backdrop-blur-md">
                      <span>Essential Components</span>
                      <span>Requirement</span>
                    </div>
                    <div className="flex flex-col">
                      {groupedItems.map(([subcategory, subItems]) => {
                        const allSelected = subItems.every(i => selectedItemIds.has(i.id));
                        const someSelected = !allSelected && subItems.some(i => selectedItemIds.has(i.id));
                        
                        return (
                          <div key={subcategory} className="flex flex-col border-b border-border/40 last:border-b-0">
                            <label className="flex items-center gap-2 px-3.5 py-1.5 bg-graphite/5 cursor-pointer hover:bg-graphite/10 transition-colors border-b border-border/20">
                              <input 
                                type="checkbox" 
                                checked={allSelected} 
                                ref={input => { if (input) input.indeterminate = someSelected; }}
                                onChange={() => toggleSubcategory(subItems)}
                                className="w-[13px] h-[13px] rounded border-border/80 text-teal focus:ring-teal/20 cursor-pointer accent-teal"
                              />
                              <span className="text-[11px] font-bold text-graphite uppercase tracking-wide">{subcategory}</span>
                            </label>
                            <div className="flex flex-col divide-y divide-border/20">
                              {subItems.map(item => {
                                const qtyPerDevice = category === 'table_unit' ? item.table_unit_qty : item.counter_unit_qty;
                                const needed = qtyPerDevice * count;
                                const isSelected = selectedItemIds.has(item.id);
                                const hasShortage = isSelected && needed > item.availability;
                                
                                return (
                                  <label key={item.id} className={`flex items-center justify-between px-3.5 py-2 cursor-pointer transition-colors hover:bg-black/5 ${!isSelected ? 'opacity-50 grayscale' : ''} ${hasShortage ? 'bg-red-bg/30' : ''}`}>
                                    <div className="flex items-center gap-3">
                                      <input 
                                        type="checkbox" 
                                        checked={isSelected} 
                                        onChange={() => toggleItem(item.id)}
                                        className="w-[14px] h-[14px] rounded border-border/80 text-teal focus:ring-teal/20 cursor-pointer accent-teal ml-4"
                                      />
                                      <span className="text-[12.5px] font-medium text-graphite">{item.name}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <span className={`text-[12.5px] font-mono font-bold ${hasShortage ? 'text-red' : 'text-teal'}`}>{needed}</span>
                                      <span className="text-[9px] text-muted">Stock: {item.availability}</span>
                                    </div>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-4 text-center text-muted text-[13px] border border-border/50 rounded-xl bg-graphite/5">
                    No components mapped to this device.
                  </div>
                )}
              </div>
              <div className="px-6 py-5 bg-[#F9FAFB] border-t border-border/60 flex justify-end gap-3">
                <button type="button" onClick={onClose} disabled={loading} className="border rounded-xl px-5 py-2.5 text-[14px] font-semibold cursor-pointer bg-surface border-border/80 text-ink hover:bg-black/5 transition-colors shadow-sm disabled:opacity-50">Cancel</button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="border border-transparent rounded-xl px-5 py-2.5 text-[14px] font-semibold cursor-pointer bg-graphite text-white hover:bg-[#1a1f26] active:scale-[0.98] transition-all shadow-md shadow-graphite/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Building...
                    </>
                  ) : (
                    `Build ${count} device${count > 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
