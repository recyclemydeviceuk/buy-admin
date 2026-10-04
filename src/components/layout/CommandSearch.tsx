import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Package, Search, Smartphone, User, MessageSquare } from 'lucide-react';
import { api } from '../../api';
import { useDebounce } from '../../hooks/useDebounce';
import type { SearchHit } from '../../types';
import { cn } from '../../lib/cn';

const ICONS = { order: Package, product: Smartphone, customer: User, enquiry: MessageSquare };
const LABELS = { order: 'Order', product: 'Product', customer: 'Customer', enquiry: 'Enquiry' };

export function CommandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const q = useDebounce(term, 180);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTerm('');
      setHits([]);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    let alive = true;
    setLoading(true);
    api.search(q).then((r) => {
      if (!alive) return;
      setHits(r);
      setActive(0);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
      if (e.key === 'Enter' && hits[active]) { navigate(hits[active].to); onClose(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, hits, active, navigate, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-pop overflow-hidden rounded-3xl border border-line bg-white shadow-float">
        <div className="flex items-center gap-3 border-b border-line px-5">
          {loading ? <Loader2 size={18} className="animate-spin text-ink-3" /> : <Search size={18} className="text-ink-3" />}
          <input ref={inputRef} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search orders, products, customers, enquiries…" className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-4" />
          <span className="kbd">esc</span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {!q.trim() ? (
            <p className="px-4 py-8 text-center text-sm text-ink-3">Try an order number, a customer name or email, or a phone model.</p>
          ) : hits.length === 0 && !loading ? (
            <p className="px-4 py-8 text-center text-sm text-ink-3">No matches for “{q}”.</p>
          ) : (
            hits.map((h, i) => {
              const Icon = ICONS[h.type];
              return (
                <button key={`${h.type}-${h.id}`} onMouseEnter={() => setActive(i)} onClick={() => { navigate(h.to); onClose(); }} className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors', i === active ? 'bg-cream' : 'hover:bg-cream-2')}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-ink-2 shadow-ring"><Icon size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{h.title}</span>
                    <span className="block truncate text-xs text-ink-3">{h.subtitle}</span>
                  </span>
                  <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-wider text-ink-4">{LABELS[h.type]}</span>
                  <ArrowRight size={14} className={cn('shrink-0 text-ink-3', i === active ? 'opacity-100' : 'opacity-0')} />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
