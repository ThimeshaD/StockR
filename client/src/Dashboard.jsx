import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import { motion } from 'framer-motion';
import { PackageSearch, Boxes, AlertCircle, ShoppingCart, Wrench, Monitor } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 15 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -15 }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [builds, setBuilds] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [sumData, buildsData] = await Promise.all([
          api('/dashboard/summary'),
          api('/builds')
        ]);
        setSummary(sumData);
        setBuilds(buildsData);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  const handleDeleteBuild = async (id) => {
    if (!window.confirm("Are you sure you want to delete this build? The deducted components will be restocked to inventory.")) return;
    try {
      await api(`/builds/${id}`, { method: 'DELETE' });
      const [sumData, buildsData] = await Promise.all([
        api('/dashboard/summary'),
        api('/builds')
      ]);
      setSummary(sumData);
      setBuilds(buildsData);
      window.dispatchEvent(new Event('inventory-updated'));
    } catch (err) {
      alert(err.message || 'Failed to delete build');
    }
  };

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-full text-muted flex-col gap-4">
        <div className="w-8 h-8 border-4 border-teal/20 border-t-teal rounded-full animate-spin"></div>
        <div className="font-medium animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  const all = summary.all;
  const table = summary.table_unit;
  const counter = summary.counter_unit;

  return (
    <motion.section 
      initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.3 }}
      className="pb-20"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight mb-1 text-graphite">Dashboard</h1>
          <div className="text-[15px] text-muted">High-level overview of inventory and devices.</div>
        </div>
      </div>

      <h2 className="text-[18px] font-bold mb-4 text-graphite">Global Inventory Stats</h2>
      <div className="grid grid-cols-4 gap-5 mb-10">
        <motion.div onClick={() => navigate('/inventory')} whileHover={{ y: -4, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)" }} className="cursor-pointer bg-surface border border-border/60 rounded-2xl p-5 shadow-sm transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-graphite/5 transition-transform group-hover:scale-110 group-hover:-rotate-6 duration-500"><Boxes size={100} /></div>
          <div className="flex items-center gap-2 text-[12px] text-muted font-bold uppercase tracking-wider mb-2">
            <PackageSearch size={16} /> Total Unique Items
          </div>
          <div className="font-mono text-[32px] font-bold text-graphite">{all.totalItems}</div>
          <div className="text-[11px] text-teal font-semibold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View all components →</div>
        </motion.div>

        <motion.div onClick={() => navigate('/inventory')} whileHover={{ y: -4, boxShadow: "0 20px 40px -10px rgba(47,125,90,0.15)" }} className="cursor-pointer bg-gradient-to-br from-surface to-green-bg/30 border border-border/60 rounded-2xl p-5 shadow-sm transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center gap-2 text-[12px] text-green-700 font-bold uppercase tracking-wider mb-2">
            <Boxes size={16} /> Total Parts Available
          </div>
          <div className="font-mono text-[32px] font-bold text-green">{all.totalAvailability}</div>
          <div className="text-[11px] text-green-700 font-semibold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View all components →</div>
        </motion.div>

        <motion.div onClick={() => navigate('/inventory?filter=needing_order')} whileHover={{ y: -4, boxShadow: "0 20px 40px -10px rgba(201,122,12,0.15)" }} className="cursor-pointer bg-gradient-to-br from-surface to-amber-bg/50 border border-border/60 rounded-2xl p-5 shadow-sm transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center gap-2 text-[12px] text-amber-700 font-bold uppercase tracking-wider mb-2">
            <AlertCircle size={16} /> Items Needing Order
          </div>
          <div className="font-mono text-[32px] font-bold text-amber">{all.itemsNeedingOrder}</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">See what to order →</div>
        </motion.div>

        <motion.div onClick={() => navigate('/reports')} whileHover={{ y: -4, boxShadow: "0 20px 40px -10px rgba(79,70,229,0.15)" }} className="cursor-pointer bg-gradient-to-br from-surface to-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-sm transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center gap-2 text-[12px] text-indigo-700 font-bold uppercase tracking-wider mb-2">
            <Wrench size={16} /> Total Devices Built
          </div>
          <div className="font-mono text-[32px] font-bold text-indigo-600">{all.builtDevices}</div>
          <div className="text-[11px] text-indigo-700 font-semibold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Open reports →</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Table Unit Stats */}
        <div className="bg-surface border border-border/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
              <Monitor size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-graphite">Table Unit</h3>
              <div className="text-[13px] text-muted">Target: {table.target} unit(s) · <button onClick={() => navigate('/settings')} className="text-teal hover:underline font-medium">change</button></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-graphite/5 rounded-xl p-4">
              <div className="text-[12px] font-bold uppercase tracking-wider text-muted mb-1">Buildable</div>
              <div className="text-[28px] font-mono font-bold text-teal">{table.possibleDevices}</div>
            </div>
            <div className="bg-graphite/5 rounded-xl p-4">
              <div className="text-[12px] font-bold uppercase tracking-wider text-muted mb-1">Built</div>
              <div className="text-[28px] font-mono font-bold text-indigo-600">{table.builtDevices}</div>
            </div>
            <div onClick={() => navigate('/inventory?filter=table_items')} className="bg-graphite/5 hover:bg-teal/10 cursor-pointer rounded-xl p-4 transition-colors group">
              <div className="text-[12px] font-bold uppercase tracking-wider text-muted mb-1 group-hover:text-teal-dark">Items Included</div>
              <div className="text-[24px] font-mono font-bold text-graphite">{table.totalItems}</div>
            </div>
            <div onClick={() => navigate('/inventory?filter=table_needing_order')} className="bg-graphite/5 hover:bg-amber-bg cursor-pointer rounded-xl p-4 transition-colors group">
              <div className="text-[12px] font-bold uppercase tracking-wider text-muted mb-1 group-hover:text-amber-700">Total to Order</div>
              <div className="text-[24px] font-mono font-bold text-amber-600">{table.totalToOrder}</div>
            </div>
          </div>
        </div>

        {/* Counter Unit Stats */}
        <div className="bg-surface border border-border/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
              <Monitor size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-graphite">Counter Unit</h3>
              <div className="text-[13px] text-muted">Target: {counter.target} unit(s) · <button onClick={() => navigate('/settings')} className="text-teal hover:underline font-medium">change</button></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-graphite/5 rounded-xl p-4">
              <div className="text-[12px] font-bold uppercase tracking-wider text-muted mb-1">Buildable</div>
              <div className="text-[28px] font-mono font-bold text-teal">{counter.possibleDevices}</div>
            </div>
            <div className="bg-graphite/5 rounded-xl p-4">
              <div className="text-[12px] font-bold uppercase tracking-wider text-muted mb-1">Built</div>
              <div className="text-[28px] font-mono font-bold text-indigo-600">{counter.builtDevices}</div>
            </div>
            <div onClick={() => navigate('/inventory?filter=counter_items')} className="bg-graphite/5 hover:bg-teal/10 cursor-pointer rounded-xl p-4 transition-colors group">
              <div className="text-[12px] font-bold uppercase tracking-wider text-muted mb-1 group-hover:text-teal-dark">Items Included</div>
              <div className="text-[24px] font-mono font-bold text-graphite">{counter.totalItems}</div>
            </div>
            <div onClick={() => navigate('/inventory?filter=counter_needing_order')} className="bg-graphite/5 hover:bg-amber-bg cursor-pointer rounded-xl p-4 transition-colors group">
              <div className="text-[12px] font-bold uppercase tracking-wider text-muted mb-1 group-hover:text-amber-700">Total to Order</div>
              <div className="text-[24px] font-mono font-bold text-amber-600">{counter.totalToOrder}</div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-[18px] font-bold mt-12 mb-4 text-graphite">Build History</h2>
      <div className="bg-surface border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-graphite/5 border-b border-border/60 text-[11px] font-bold text-muted uppercase tracking-wider">
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Device Type</th>
              <th className="px-6 py-4">Count</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {builds.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-muted">No devices built yet.</td>
              </tr>
            ) : (
              builds.map(build => (
                <tr key={build.id} className="hover:bg-graphite/5 transition-colors">
                  <td className="px-6 py-4 text-[13px]">{new Date(build.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-6 py-4 font-medium text-graphite text-[13px]">{build.name}</td>
                  <td className="px-6 py-4 text-muted text-[13px]">{build.category === 'table_unit' ? 'Table Unit' : 'Counter Unit'}</td>
                  <td className="px-6 py-4 font-mono font-bold text-teal text-[13px]">{build.count}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDeleteBuild(build.id)}
                      className="text-red/70 hover:text-white hover:bg-red px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all shadow-sm"
                    >
                      Delete (Restock)
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}

