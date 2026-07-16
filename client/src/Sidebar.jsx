import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Monitor, Package, LogOut, FileBarChart, Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar({ user, totalItemsCount }) {
  return (
    <motion.aside 
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-[260px] bg-gradient-to-b from-[#1C2128] to-[#14181D] shrink-0 flex flex-col justify-between text-white shadow-[4px_0_24px_rgba(0,0,0,0.15)] z-10 p-[22px] border-r border-[#ffffff10]"
    >
      <div>
        <div className="font-bold text-[20px] tracking-wide mb-[36px] flex items-center gap-2 pr-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center shadow-lg shadow-teal/20">
            <Package size={18} strokeWidth={2.5} className="text-white" />
          </div>
          Stockroom
        </div>
        <nav className="flex flex-col gap-2">
          <NavLink 
            to="/" 
            end
            className={({isActive}) => 
              `flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer text-[14px] w-full text-left transition-all duration-200 ${isActive ? 'bg-[#ffffff15] text-white font-semibold shadow-inner' : 'text-[#8A909B] hover:bg-[#ffffff0a] hover:text-[#C7CBD1]'}`
            }
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          
          <div className="text-[11px] uppercase tracking-[0.15em] text-[#5C6370] font-bold mt-6 mb-2 px-3">Inventory</div>
          
          <NavLink 
            to="/inventory" 
            className={({isActive}) => 
              `flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer text-[14px] w-full text-left transition-all duration-200 ${isActive ? 'bg-[#ffffff15] text-white font-semibold shadow-inner' : 'text-[#8A909B] hover:bg-[#ffffff0a] hover:text-[#C7CBD1]'}`
            }
          >
            <div className="flex items-center gap-3">
              <Monitor size={18} />
              <span>All Components</span>
            </div>
            <span className={`font-bold rounded-full px-2 py-0.5 min-w-[20px] flex items-center justify-center text-[11px] transition-colors ${totalItemsCount === 0 ? 'bg-[#ffffff10] text-[#5C6370]' : 'bg-teal/20 text-teal-300'}`}>
              {totalItemsCount}
            </span>
          </NavLink>

          <div className="text-[11px] uppercase tracking-[0.15em] text-[#5C6370] font-bold mt-6 mb-2 px-3">Manage</div>

          <NavLink
            to="/reports"
            className={({isActive}) =>
              `flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer text-[14px] w-full text-left transition-all duration-200 ${isActive ? 'bg-[#ffffff15] text-white font-semibold shadow-inner' : 'text-[#8A909B] hover:bg-[#ffffff0a] hover:text-[#C7CBD1]'}`
            }
          >
            <FileBarChart size={18} />
            Reports
          </NavLink>

          <NavLink
            to="/settings"
            className={({isActive}) =>
              `flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer text-[14px] w-full text-left transition-all duration-200 ${isActive ? 'bg-[#ffffff15] text-white font-semibold shadow-inner' : 'text-[#8A909B] hover:bg-[#ffffff0a] hover:text-[#C7CBD1]'}`
            }
          >
            <SettingsIcon size={18} />
            Settings
          </NavLink>
        </nav>
      </div>
      <div className="border-t border-[#ffffff10] pt-5 mt-5 flex items-center justify-between bg-[#ffffff05] -mx-5 px-5 -mb-5 pb-5 rounded-b-xl">
        <div>
          <div className="text-white font-semibold text-[13px] mb-0.5">{user?.displayName || user?.username || '—'}</div>
          <div className="text-[#5C6370] capitalize text-[12px]">{user?.role || '—'}</div>
        </div>
        <button 
          onClick={async () => {
            await fetch('/auth/logout', { method: 'POST' });
            window.location.href = '/login.html';
          }}
          className="text-[#5C6370] hover:text-white transition-colors cursor-pointer p-2 bg-transparent border-none rounded-lg hover:bg-[#ffffff10]"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </motion.aside>
  );
}
