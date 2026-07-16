import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from './api';
import InventoryTable from './InventoryTable';
import HistoryModal from './HistoryModal';
import { motion } from 'framer-motion';
import { Plus, Search, X, Wrench, Filter, Target } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 15 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -15 }
};

// Filters available via ?filter= query param (clicked from the dashboard).
const FILTERS = {
  needing_order: {
    label: 'Items needing order',
    test: (i) => i.total_to_order > 0,
  },
  table_needing_order: {
    label: 'Table Unit — items needing order',
    test: (i) => i.table_unit_qty > 0 && i.table_to_order > 0,
  },
  counter_needing_order: {
    label: 'Counter Unit — items needing order',
    test: (i) => i.counter_unit_qty > 0 && i.counter_to_order > 0,
  },
  table_items: {
    label: 'Table Unit components',
    test: (i) => i.table_unit_qty > 0,
  },
  counter_items: {
    label: 'Counter Unit components',
    test: (i) => i.counter_unit_qty > 0,
  },
};

export default function Inventory({ onAdd, onEdit, onDelete, onBuildDevice }) {
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyItem, setHistoryItem] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const filterKey = searchParams.get('filter');
  const activeFilter = filterKey && FILTERS[filterKey] ? FILTERS[filterKey] : null;

  const fetchItems = async () => {
    try {
      const [itemsData, settingsData] = await Promise.all([
        api('/items'),
        api('/settings')
      ]);
      setItems(itemsData);
      setSettings(settingsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 30000);
    const handleUpdate = () => fetchItems();
    window.addEventListener('inventory-updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('inventory-updated', handleUpdate);
    };
  }, []);

  const filteredItems = useMemo(() => {
    let list = items;
    if (activeFilter) list = list.filter(activeFilter.test);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.subcategory && item.subcategory.toLowerCase().includes(q)) ||
        (item.supplier && item.supplier.toLowerCase().includes(q)) ||
        (item.stock_location && item.stock_location.toLowerCase().includes(q)) ||
        (item.link && item.link.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, searchQuery, activeFilter]);

  const clearFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('filter');
    setSearchParams(next, { replace: true });
  };

  const handleReceive = async (item) => {
    if (!item || item.pending_receive <= 0) return;
    if (!window.confirm(`Receive ${item.pending_receive} unit(s) of ${item.name}? This will add them to your available stock.`)) return;

    try {
      const updatedItem = {
        ...item,
        availability: item.availability + item.pending_receive,
        pending_receive: 0,
        is_restock_action: true,
        movement_reason: `Received pending order of ${item.pending_receive}`
      };
      const data = await api(`/items/${item.id}`, { method: 'PUT', body: JSON.stringify(updatedItem) });
      setItems(prev => prev.map(i => i.id === data.id ? data : i));
      window.dispatchEvent(new Event('inventory-updated'));
    } catch (err) {
      alert(err.message || 'Failed to receive item.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted flex-col gap-4">
        <div className="w-8 h-8 border-4 border-teal/20 border-t-teal rounded-full animate-spin"></div>
        <div className="font-medium animate-pulse">Loading Inventory...</div>
      </div>
    );
  }

  return (
    <motion.section
      initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.3 }}
      className="pb-20"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight mb-1 text-graphite">All Components</h1>
          <div className="text-[15px] text-muted">Complete inventory of all available parts and components.</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onBuildDevice()}
            className="flex items-center gap-2 bg-graphite hover:bg-[#1a1f26] active:scale-[0.98] transition-all text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-graphite/20 border border-transparent"
          >
            <Wrench size={16} strokeWidth={2.5} />
            Build Device
          </button>
          <button
            onClick={() => onAdd()}
            className="flex items-center gap-2 bg-teal hover:bg-teal-dark active:scale-[0.98] transition-all text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-teal/20 border border-transparent hover:shadow-teal/40"
          >
            <Plus size={18} strokeWidth={2.5} />
            Add Item
          </button>
        </div>
      </div>

      {/* Order targets */}
      {settings && (
        <div className="flex gap-3 mb-5">
          <div className="flex items-center gap-2 bg-surface border border-border/60 px-4 py-2.5 rounded-xl text-[13px] font-medium text-graphite shadow-sm">
            <Target size={16} className="text-teal" />
            <span className="text-muted">Table Unit Target:</span>
            <span className="text-teal font-bold">{settings.table_unit_target}</span>
          </div>
          <div className="flex items-center gap-2 bg-surface border border-border/60 px-4 py-2.5 rounded-xl text-[13px] font-medium text-graphite shadow-sm">
            <Target size={16} className="text-teal" />
            <span className="text-muted">Counter Unit Target:</span>
            <span className="text-teal font-bold">{settings.counter_unit_target}</span>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/60 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search by name, sub-category, supplier or location...`}
            className="w-full pl-11 pr-10 py-3 rounded-xl border border-border/60 bg-surface text-ink text-[14px] placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/50 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted hover:text-ink hover:bg-graphite/10 transition-colors cursor-pointer bg-transparent border-none"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-[260px]">
          <select 
            value={filterKey || ''} 
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value) {
                next.set('filter', e.target.value);
              } else {
                next.delete('filter');
              }
              setSearchParams(next, { replace: true });
            }}
            className="w-full appearance-none pl-11 pr-10 py-3 rounded-xl border border-border/60 bg-surface text-ink text-[14px] focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/50 transition-all shadow-sm cursor-pointer font-medium"
          >
            <option value="">All Components</option>
            <option value="table_items">Table Unit Components</option>
            <option value="counter_items">Counter Unit Components</option>
            <option value="needing_order">Items Needing Order</option>
          </select>
          <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-teal pointer-events-none" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
      </div>

      <div className="mb-3 text-[13px] text-muted flex items-center gap-2">
        <span>Showing <strong className="text-ink font-semibold">{filteredItems.length}</strong> {filteredItems.length === 1 ? 'item' : 'items'}</span>
        {searchQuery.trim() && <span>matching "<span className="text-teal font-medium">{searchQuery.trim()}</span>"</span>}
      </div>

      <div className="bg-surface border border-border/60 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <InventoryTable
          items={filteredItems}
          emptyMessage={searchQuery.trim() ? `No items matching "${searchQuery.trim()}".` : (activeFilter ? `No items match this filter.` : `No items found in inventory.`)}
          showActions={true}
          onEdit={onEdit}
          onDelete={onDelete}
          onHistory={(item) => setHistoryItem(item)}
          onReceive={handleReceive}
        />
      </div>

      <HistoryModal isOpen={!!historyItem} onClose={() => setHistoryItem(null)} item={historyItem} />
    </motion.section>
  );
}

