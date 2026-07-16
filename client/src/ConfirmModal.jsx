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

export default function ConfirmModal({ isOpen, onClose, onConfirm, itemName }) {
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
            className="bg-surface rounded-2xl w-[420px] max-w-full shadow-2xl overflow-hidden flex flex-col border border-white/20"
          >
            <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between bg-[#F9FAFB]">
              <h2 className="text-[19px] font-bold tracking-tight text-graphite">Remove item</h2>
              <button onClick={onClose} className="bg-transparent border-none text-muted hover:text-ink hover:bg-black/5 rounded-lg p-1.5 transition-colors cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-6">
              <p className="text-[15px] text-ink">Are you sure you want to remove <strong className="font-semibold">"{itemName}"</strong>? This action cannot be undone.</p>
            </div>
            <div className="px-6 py-5 bg-[#F9FAFB] border-t border-border/60 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="border rounded-xl px-5 py-2.5 text-[14px] font-semibold cursor-pointer bg-surface border-border/80 text-ink hover:bg-black/5 transition-colors shadow-sm">Cancel</button>
              <button type="button" onClick={onConfirm} className="border border-transparent rounded-xl px-5 py-2.5 text-[14px] font-semibold cursor-pointer bg-red text-white hover:bg-[#991B16] active:scale-[0.98] transition-all shadow-md shadow-red/20">Remove item</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
