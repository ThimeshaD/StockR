import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from './api';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import Inventory from './Inventory';
import Settings from './Settings';
import Reports from './Reports';
import ItemModal from './ItemModal';
import ConfirmModal from './ConfirmModal';
import BuildDeviceModal from './BuildDeviceModal';
import { Undo2 } from 'lucide-react';

function AnimatedRoutes({ user, summary, handleAdd, handleEdit, handleDeletePrompt, handleBuildDevice }) {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route 
          path="/inventory" 
          element={
            <Inventory 
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDeletePrompt}
              onBuildDevice={handleBuildDevice}
            />
          } 
        />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  
  const [isItemModalOpen, setItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [isBuildModalOpen, setBuildModalOpen] = useState(false);
  
  const [toast, setToast] = useState({ message: '', error: false, visible: false, onUndo: null, undoSeconds: 0 });
  const toastTimerRef = useRef(null);
  const undoIntervalRef = useRef(null);

  const fetchSessionAndStats = async () => {
    try {
      const u = await api('/auth/me');
      setUser(u);
      const sum = await api('/dashboard/summary');
      setSummary(sum);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSessionAndStats();
  }, []);

  const clearToastTimers = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
  }, []);

  const showToast = useCallback((message, error = false, onUndo = null, undoDuration = 0) => {
    clearToastTimers();
    
    const duration = onUndo ? (undoDuration || 15) : 4;
    setToast({ message, error, visible: true, onUndo, undoSeconds: onUndo ? duration : 0 });

    if (onUndo) {
      // Countdown timer for undo
      undoIntervalRef.current = setInterval(() => {
        setToast(prev => {
          const newSeconds = prev.undoSeconds - 1;
          if (newSeconds <= 0) {
            clearToastTimers();
            return { ...prev, visible: false, onUndo: null, undoSeconds: 0 };
          }
          return { ...prev, undoSeconds: newSeconds };
        });
      }, 1000);
    } else {
      toastTimerRef.current = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, duration * 1000);
    }
  }, [clearToastTimers]);

  const dismissToast = useCallback(() => {
    clearToastTimers();
    setToast(prev => ({ ...prev, visible: false, onUndo: null }));
  }, [clearToastTimers]);

  const handleAdd = useCallback(() => {
    setItemToEdit(null);
    setItemModalOpen(true);
  }, []);

  const handleEdit = useCallback((item) => {
    setItemToEdit(item);
    setItemModalOpen(true);
  }, []);

  const handleDeletePrompt = useCallback((item) => {
    setItemToDelete(item);
    setConfirmModalOpen(true);
  }, []);

  const handleBuildDevice = useCallback(() => {
    setBuildModalOpen(true);
  }, []);

  const confirmBuildDevice = async (category, count, selectedItemIds, buildName) => {
    const res = await fetch('/api/items/build-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, count, selectedItemIds, buildName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Build failed.');
    
    // Show toast with undo option (15 second window)
    const undoFn = async () => {
      dismissToast();
      try {
        const undoRes = await fetch('/api/items/undo-build-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, count, selectedItemIds, buildName })
        });
        const undoData = await undoRes.json();
        if (!undoRes.ok) throw new Error(undoData.error || 'Undo failed.');
        showToast(`Undo successful — ${count} device build${count > 1 ? 's' : ''} reversed.`);
        window.location.reload();
      } catch (err) {
        showToast(err.message, true);
      }
    };

    showToast(
      `Built ${count} device${count > 1 ? 's' : ''}! Stock deducted.`,
      false,
      undoFn,
      15
    );
    // Reload the data without full page reload so the toast persists
    fetchSessionAndStats();
    // Trigger DeviceView re-fetch by dispatching a custom event
    window.dispatchEvent(new Event('inventory-updated'));
  };

  const handleSubmitItem = async (formData) => {
    if (itemToEdit) {
      await api(`/items/${itemToEdit.id}`, { method: 'PUT', body: JSON.stringify(formData) });
      showToast('Item updated successfully.');
    } else {
      await api('/items', { method: 'POST', body: JSON.stringify(formData) });
      showToast('Item added successfully.');
    }
    fetchSessionAndStats();
    window.dispatchEvent(new Event('inventory-updated'));
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        await api(`/items/${itemToDelete.id}`, { method: 'DELETE' });
        showToast('Item removed.');
        fetchSessionAndStats();
        window.dispatchEvent(new Event('inventory-updated'));
      } catch (err) {
        showToast(err.message, true);
      }
    }
    setConfirmModalOpen(false);
  };

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden text-[14px] antialiased bg-[#F9FAFB]">
        <Sidebar 
          user={user} 
          totalItemsCount={summary?.all?.totalItems || 0} 
        />
        <main className="flex-1 overflow-y-auto p-12 relative bg-[#F9FAFB]">
          <AnimatedRoutes 
            user={user}
            summary={summary}
            handleAdd={handleAdd}
            handleEdit={handleEdit}
            handleDeletePrompt={handleDeletePrompt}
            handleBuildDevice={handleBuildDevice}
          />
        </main>

        <ItemModal 
          isOpen={isItemModalOpen} 
          onClose={() => setItemModalOpen(false)} 
          onSubmit={handleSubmitItem} 
          initialData={itemToEdit}
        />

        <ConfirmModal 
          isOpen={isConfirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={confirmDelete}
          itemName={itemToDelete?.name}
        />

        <BuildDeviceModal
          isOpen={isBuildModalOpen}
          onClose={() => setBuildModalOpen(false)}
          onConfirm={confirmBuildDevice}
        />

        <AnimatePresence>
          {toast.visible && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`fixed bottom-8 right-8 px-5 py-4 rounded-xl text-[14px] font-semibold shadow-2xl z-[100] border border-white/20 backdrop-blur-md flex items-center gap-3 ${toast.error ? 'bg-red/90 text-white shadow-red/20' : 'bg-graphite/90 text-white shadow-graphite/20'}`}
            >
              <div className={`w-2 h-2 rounded-full ${toast.error ? 'bg-white' : 'bg-teal-400'}`} />
              {toast.message}
              {toast.onUndo && (
                <button
                  onClick={toast.onUndo}
                  className="ml-2 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:scale-[0.96] text-white px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer border border-white/20"
                >
                  <Undo2 size={14} strokeWidth={2.5} />
                  Undo ({toast.undoSeconds}s)
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BrowserRouter>
  );
}

