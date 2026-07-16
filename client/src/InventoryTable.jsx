import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Edit2, Trash2, History } from 'lucide-react';

function formatQty(n, blankZero = false) {
  const num = Number(n);
  if (blankZero && num === 0) return ' ';
  return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, '');
}

function OrderBadge({ qtyToOrder }) {
  if (qtyToOrder > 0) {
    return <span className="bg-amber-bg text-amber-700 px-2.5 py-1 rounded-md text-[12px] font-bold border border-amber/20 shadow-sm">{formatQty(qtyToOrder)}</span>;
  }
  return <span className="bg-green-bg/60 text-green-700 px-2.5 py-1 rounded-md text-[12px] font-bold border border-green/10">None</span>;
}

function formatDate(dateString) {
  if (!dateString) return <span className="text-muted/40">—</span>;

  // Google Sheets might return "2026-07-03 9:21:50" (single digit hour)
  // We need to parse it cleanly into a valid ISO string
  const parts = dateString.split(/[- :]/);
  if (parts.length < 3) return <span className="text-muted/40">—</span>;

  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  const hour = (parts[3] || '00').padStart(2, '0');
  const minute = (parts[4] || '00').padStart(2, '0');
  const second = (parts[5] || '00').padStart(2, '0');

  const d = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);

  if (isNaN(d)) return <span className="text-muted/40">—</span>;
  return <span className="text-muted font-medium" title={d.toLocaleString()}>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: '2-digit' }).format(d)}</span>;
}

function LinkDisplay({ url }) {
  if (!url) return <span className="text-muted/50">—</span>;

  let href = url.trim();
  const isWebLink = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('www.');

  if (isWebLink) {
    if (href.startsWith('www.')) href = 'https://' + href;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-teal hover:text-teal-dark font-medium transition-colors hover:underline" title={url}>
        Link <ExternalLink size={13} strokeWidth={2.5} />
      </a>
    );
  }

  return <span title={url} className="text-[12px] text-muted max-w-[140px] inline-block whitespace-nowrap overflow-hidden text-ellipsis align-middle">{url}</span>;
}

const tableVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03
    }
  }
};

const rowVariants = {
  hidden: { opacity: 0, y: 5 },
  show: { opacity: 1, y: 0 }
};

const TableSpacer = React.memo(({ showActions }) => (
  <tr className="bg-graphite/5">
    <td colSpan={showActions ? "12" : "11"} style={{ height: '4px', padding: 0, border: 'none' }}></td>
  </tr>
));

const TableRow = React.memo(({ item, showActions, onEdit, onDelete, onHistory, onReceive }) => (
  <motion.tr variants={rowVariants} className="hover:bg-teal/25 hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:z-10 relative transition-all duration-200 group">
    <td className="py-3.5 px-3 border-b border-border/50 text-muted text-[13px] font-semibold">{item.subcategory}</td>
    <td className="py-3.5 px-3 border-b border-border/50">
      <div className="font-medium text-ink">{item.name}</div>
      {item.description && <div className="text-[11px] text-muted/70 mt-0.5 leading-tight">{item.description}</div>}
    </td>
    <td className="py-3.5 px-3 border-b border-border/50 text-[13.5px] font-mono text-center font-bold text-teal">{formatQty(item.availability)}</td>
    <td className="py-3.5 px-3 border-b border-border/50 text-[12px] text-center">{formatDate(item.restocked_date)}</td>

    <td className="py-3.5 px-3 border-b border-border/50 text-[13.5px] font-mono text-center">{formatQty(item.table_unit_qty, true)}</td>

    <td className="py-3.5 px-3 border-b border-border/50 text-[13.5px] font-mono text-center">{formatQty(item.counter_unit_qty, true)}</td>

    <td className="py-3.5 px-3 border-b border-border/50 text-center"><OrderBadge qtyToOrder={item.total_to_order} /></td>
    <td className="py-3.5 px-3 border-b border-border/50 text-center">
      {item.pending_receive > 0 ? (
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-teal font-bold text-[13px]">{formatQty(item.pending_receive)}</span>
          {showActions && (
            <button
              onClick={() => onReceive(item)}
              className="text-[10px] bg-teal/10 hover:bg-teal hover:text-white text-teal px-1.5 py-0.5 rounded transition-colors font-bold uppercase tracking-wider"
              title="Mark as received and add to availability"
            >
              Receive
            </button>
          )}
        </div>
      ) : (
        <span className="text-muted/30 text-[12px]">—</span>
      )}
    </td>

    <td className="py-3.5 px-3 border-b border-border/50 text-[12.5px] text-muted">{item.stock_location ? <span className="inline-block bg-graphite/5 px-2 py-0.5 rounded-md font-medium text-ink/80">{item.stock_location}</span> : <span className="text-muted/40">—</span>}</td>
    <td className="py-3.5 px-3 border-b border-border/50 text-[12.5px] text-muted">{item.supplier || <span className="text-muted/40">—</span>}</td>

    <td className="py-3.5 px-3 border-b border-border/50"><LinkDisplay url={item.link} /></td>
    {showActions && (
      <td className="py-3.5 px-3 border-b border-border/50 text-right w-[120px]">
        <div className="flex gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onHistory(item)}
            className="p-1.5 rounded-md text-muted hover:text-graphite hover:bg-graphite/10 transition-colors cursor-pointer"
            title="Stock history"
          >
            <History size={16} />
          </button>
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-md text-muted hover:text-teal hover:bg-teal/10 transition-colors cursor-pointer"
            title="Edit item"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-1.5 rounded-md text-muted hover:text-red hover:bg-red/10 transition-colors cursor-pointer"
            title="Delete item"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    )}
  </motion.tr>
));

export default function InventoryTable({ items, emptyMessage, onEdit, onDelete, onHistory, onReceive, showActions = false }) {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center text-muted">
        <div className="bg-graphite/5 p-4 rounded-full mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted/50"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        </div>
        {emptyMessage}
      </div>
    );
  }

  let prevSub = null;
  const rows = [];

  items.forEach((item, index) => {
    const isNewGroup = prevSub !== null && prevSub !== item.subcategory;
    prevSub = item.subcategory;

    if (isNewGroup) {
      rows.push(<TableSpacer key={`spacer-${index}`} showActions={showActions} />);
    }

    rows.push(
      <TableRow
        key={item.id}
        item={item}
        showActions={showActions}
        onEdit={onEdit}
        onDelete={onDelete}
        onHistory={onHistory}
        onReceive={onReceive}
      />
    );
  });

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)] relative rounded-b-2xl">
      <motion.table
        initial="hidden"
        animate="show"
        variants={tableVariants}
        className="w-full border-collapse"
      >
        <thead className="sticky top-0 z-10 shadow-sm">
          <tr>
            <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted py-3.5 px-3 border-b border-border/80 bg-surface">Sub-category</th>
            <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted py-3.5 px-3 border-b border-border/80 bg-surface">Item</th>
            <th className="text-center text-[11px] font-bold uppercase tracking-[0.06em] text-muted py-3.5 px-3 border-b border-border/80 bg-surface">Available</th>
            <th className="text-center text-[11px] font-bold uppercase tracking-[0.06em] text-muted py-3.5 px-3 border-b border-border/80 bg-surface">Restocked</th>

            <th className="text-center text-[11px] font-bold uppercase tracking-[0.06em] text-muted py-3.5 px-3 border-b border-border/80 bg-surface" title="Table Unit Quantity">TABLE QTY</th>

            <th className="text-center text-[11px] font-bold uppercase tracking-[0.06em] text-muted py-3.5 px-3 border-b border-border/80 bg-surface" title="Counter Unit Quantity">COUNTER QTY</th>

            <th className="text-center text-[11px] font-bold uppercase tracking-[0.06em] text-muted py-3.5 px-3 border-b border-border/80 bg-surface" title="Total Order">TOTAL ORDER</th>
            <th className="text-center text-[11px] font-bold uppercase tracking-[0.06em] text-muted py-3.5 px-3 border-b border-border/80 bg-surface" title="Pending Receive">PENDING</th>

            <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted py-3.5 px-3 border-b border-border/80 bg-surface">Location</th>
            <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted py-3.5 px-3 border-b border-border/80 bg-surface">Supplier</th>

            <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted py-3.5 px-3 border-b border-border/80 bg-surface">Link</th>
            {showActions && <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted py-3.5 px-3 border-b border-border/80 bg-surface"></th>}
          </tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </motion.table>
    </div>
  );
}
