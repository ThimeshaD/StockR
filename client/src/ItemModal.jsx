import { useState, useEffect } from 'react';
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

export default function ItemModal({ isOpen, onClose, onSubmit, initialData, defaultCategory }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subcategory: '',
    table_unit_qty: 0,
    counter_unit_qty: 0,
    availability: 0,
    link: '',
    stock_location: '',
    supplier: '',
    pending_receive: 0
  });
  const [error, setError] = useState('');
  const [subcategories, setSubcategories] = useState([]);
  const [isAddingNewSub, setIsAddingNewSub] = useState(false);
  const [restockMode, setRestockMode] = useState(false);
  const [restockAmount, setRestockAmount] = useState('');
  const [originalAvailability, setOriginalAvailability] = useState(0);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setOriginalAvailability(Number(initialData.availability) || 0);
    } else {
      setFormData({
        name: '',
        description: '',
        subcategory: '',
        table_unit_qty: 0,
        counter_unit_qty: 0,
        availability: 0,
        link: '',
        stock_location: '',
        supplier: '',
        pending_receive: 0
      });
      setOriginalAvailability(0);
    }
    setError('');
    setRestockMode(false);
    setRestockAmount('');

    if (isOpen) {
      api('/items').then(data => {
        const uniqueSubs = [...new Set(data.map(i => i.subcategory).filter(Boolean))].sort();
        setSubcategories(uniqueSubs);
        
        if (initialData && initialData.subcategory && !uniqueSubs.includes(initialData.subcategory)) {
          setIsAddingNewSub(true);
        } else {
          setIsAddingNewSub(false);
        }
      }).catch(console.error);
    } else {
      setIsAddingNewSub(false);
    }
  }, [initialData, defaultCategory, isOpen]);

  // When restock mode changes, sync availability
  useEffect(() => {
    if (restockMode) {
      // Switching to restock mode: set availability to original + restockAmount
      const add = Number(restockAmount) || 0;
      setFormData(prev => ({ ...prev, availability: originalAvailability + add }));
    }
  }, [restockMode, restockAmount, originalAvailability]);

  const handleRestockChange = (value) => {
    setRestockAmount(value);
    const add = Number(value) || 0;
    setFormData(prev => ({ ...prev, availability: originalAvailability + add }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSubmit({ ...formData, is_restock_action: restockMode });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? Number(value) : '') : value
    }));
  };

  const newTotal = originalAvailability + (Number(restockAmount) || 0);

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
            className="bg-surface rounded-2xl w-[540px] max-w-full shadow-2xl overflow-hidden flex flex-col max-h-full border border-white/20"
          >
            <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between bg-[#F9FAFB]">
              <h2 className="text-[19px] font-bold tracking-tight text-graphite">{initialData ? 'Edit item' : 'Add new item'}</h2>
              <button onClick={onClose} className="bg-transparent border-none text-muted hover:text-ink hover:bg-black/5 rounded-lg p-1.5 transition-colors cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto">
              <div className="p-6">
                {error && <div className="bg-red-bg text-red p-3 rounded-md mb-5 text-[13.5px] block border border-red/20">{error}</div>}

                <div className="mb-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-graphite">Item name</label>
                    <input name="name" value={formData.name} onChange={handleChange} required className="px-3.5 py-2.5 text-[14px] border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm" />
                  </div>
                  <div className="flex flex-col gap-1.5 mt-5">
                    <label className="text-[13px] font-semibold text-graphite">Description <span className="font-normal text-muted">(optional)</span></label>
                    <input name="description" value={formData.description} onChange={handleChange} placeholder="Brief description..." className="px-3.5 py-2.5 text-[14px] border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mb-5">
                  <label className="text-[13px] font-semibold text-graphite">Sub-category</label>
                  {!isAddingNewSub ? (
                    <select 
                      value={subcategories.includes(formData.subcategory) || !formData.subcategory ? formData.subcategory : '___add_new___'} 
                      onChange={(e) => {
                        if (e.target.value === '___add_new___') {
                          setIsAddingNewSub(true);
                          setFormData(prev => ({ ...prev, subcategory: '' }));
                        } else {
                          handleChange(e);
                        }
                      }} 
                      name="subcategory"
                      required 
                      className="px-3.5 py-2.5 text-[14px] border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm"
                    >
                      <option value="" disabled>Select a sub-category...</option>
                      {subcategories.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="___add_new___">+ Add new category</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        name="subcategory" 
                        value={formData.subcategory} 
                        onChange={handleChange} 
                        placeholder="New category name" 
                        required 
                        autoFocus
                        className="flex-1 px-3.5 py-2.5 text-[14px] border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm" 
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsAddingNewSub(false);
                          setFormData(prev => ({ ...prev, subcategory: subcategories[0] || '' }));
                        }}
                        className="px-4 py-2 border border-border/80 rounded-xl bg-surface text-muted hover:text-ink font-semibold text-[13px] transition-colors hover:bg-black/5"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-5 mb-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-graphite">Qty for Table Unit</label>
                    <input name="table_unit_qty" value={formData.table_unit_qty} onChange={handleChange} type="number" step="any" min="0" required className="px-3.5 py-2.5 text-[14px] border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-graphite">Qty for Counter Unit</label>
                    <input name="counter_unit_qty" value={formData.counter_unit_qty} onChange={handleChange} type="number" step="any" min="0" required className="px-3.5 py-2.5 text-[14px] border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm" />
                  </div>
                </div>
                
                <div className="mb-5">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-semibold text-graphite">Availability</label>
                      {initialData && (
                        <button
                          type="button"
                          onClick={() => {
                            setRestockMode(!restockMode);
                            if (!restockMode) {
                              setRestockAmount('');
                              setFormData(prev => ({ ...prev, availability: originalAvailability }));
                            }
                          }}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                            restockMode 
                              ? 'bg-teal/10 text-teal border-teal/30 shadow-sm' 
                              : 'bg-transparent text-muted border-border/60 hover:text-ink hover:border-border'
                          }`}
                        >
                          {restockMode ? '✚ Restock mode' : '✚ Restock'}
                        </button>
                      )}
                    </div>
                    {!restockMode ? (
                      <input name="availability" value={formData.availability} onChange={handleChange} type="number" step="any" min="0" required className="px-3.5 py-2.5 text-[14px] border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm" />
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal font-bold text-[14px] pointer-events-none">+</span>
                            <input 
                              type="number" 
                              step="any" 
                              min="0" 
                              value={restockAmount} 
                              onChange={(e) => handleRestockChange(e.target.value)}
                              placeholder="0"
                              autoFocus
                              className="w-full pl-7 pr-3 py-2.5 text-[14px] border border-teal/40 rounded-xl bg-teal/5 focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm font-semibold" 
                            />
                          </div>
                        </div>
                        <div className="bg-[#F0F7F4] border border-teal/15 rounded-lg px-3 py-2 text-[12px] flex items-center gap-2">
                          <span className="text-muted">Current:</span>
                          <span className="font-mono font-semibold text-graphite">{originalAvailability}</span>
                          <span className="text-muted mx-0.5">→</span>
                          <span className="text-muted">New:</span>
                          <span className="font-mono font-bold text-teal">{newTotal}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex flex-col gap-1.5 bg-blue-bg/30 p-4 rounded-xl border border-blue/20">
                    <label className="text-[13px] font-semibold text-graphite flex items-center gap-2">
                      Pending Receive
                      <span className="text-[11px] font-normal text-muted bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/40">Ordered, but not received</span>
                    </label>
                    <input name="pending_receive" value={formData.pending_receive} onChange={handleChange} type="number" step="any" min="0" className="px-3.5 py-2.5 text-[14px] border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5 mb-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-graphite">Stock location <span className="font-normal text-muted">(optional)</span></label>
                    <input name="stock_location" value={formData.stock_location} onChange={handleChange} placeholder="e.g. Shelf A3, Bin 12" className="px-3.5 py-2.5 text-[14px] border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-graphite">Supplier <span className="font-normal text-muted">(optional)</span></label>
                    <input name="supplier" value={formData.supplier} onChange={handleChange} placeholder="e.g. Mouser, DigiKey" className="px-3.5 py-2.5 text-[14px] border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5 mb-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-graphite">Link <span className="font-normal text-muted">(optional)</span></label>
                    <input name="link" value={formData.link} onChange={handleChange} type="url" placeholder="https://…" className="px-3.5 py-2.5 text-[14px] border border-border/80 rounded-xl bg-surface focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all shadow-sm" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-5 bg-[#F9FAFB] border-t border-border/60 flex justify-end gap-3 mt-auto">
                <button type="button" onClick={onClose} className="border rounded-xl px-5 py-2.5 text-[14px] font-semibold cursor-pointer bg-surface border-border/80 text-ink hover:bg-black/5 transition-colors shadow-sm">Cancel</button>
                <button type="submit" className="border border-transparent rounded-xl px-5 py-2.5 text-[14px] font-semibold cursor-pointer bg-teal text-white hover:bg-teal-dark active:scale-[0.98] transition-all shadow-md shadow-teal/20">{initialData ? 'Update item' : 'Add item'}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
