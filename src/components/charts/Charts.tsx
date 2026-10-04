import { useId, useState } from 'react';
import { cn } from '../../lib/cn';
import { money, number } from '../../lib/format';

interface Point { date: string; revenue: number; orders: number }

/** Daily revenue bars + order-count line, optional dashed previous-period revenue line, hover tooltip. */
export function RevenueChart({ data, previous, height = 230 }: { data: Point[]; previous?: Point[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const W = 900;
  const H = height;
  const padL = 46;
  const padR = 12;
  const padT = 14;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(1, ...data.map((d) => d.revenue), ...(previous ?? []).map((d) => d.revenue));
  const step = max > 20000 ? 5000 : max > 8000 ? 2000 : max > 3000 ? 1000 : 500;
  const nice = Math.ceil(max / step) * step || step;
  const maxOrders = Math.max(1, ...data.map((d) => d.orders));
  const n = data.length;
  const slot = innerW / n;
  const barW = Math.max(3, Math.min(22, slot * 0.6));
  const x = (i: number) => padL + i * slot + slot / 2;
  const y = (v: number) => padT + innerH - (v / nice) * innerH;
  const yo = (v: number) => padT + innerH - (v / maxOrders) * innerH * 0.85;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * nice);
  const labelEvery = n > 45 ? 15 : n > 20 ? 5 : 1;
  const fmtDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${yo(d.orders).toFixed(1)}`).join(' ');
  const prevLine = previous ? previous.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.revenue).toFixed(1)}`).join(' ') : '';
  const h = hover !== null ? data[hover] : null;
  const hp = hover !== null && previous ? previous[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Revenue by day" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0B0C10" /><stop offset="1" stopColor="#3A3F47" /></linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#F0EDE7" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#A2A6AD" fontFamily="inherit">{t >= 1000 ? `£${t / 1000}k` : `£${t}`}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <g key={d.date}>
            <rect x={x(i) - slot / 2} y={padT} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
            <rect x={x(i) - barW / 2} y={y(d.revenue)} width={barW} height={Math.max(0, innerH + padT - y(d.revenue))} rx={Math.min(5, barW / 2)} fill={hover === i ? '#D01A2A' : `url(#${id}-bar)`} opacity={hover === null || hover === i ? 1 : 0.5} className="transition-opacity" />
            {i % labelEvery === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#A2A6AD" fontFamily="inherit">{fmtDay(d.date)}</text>}
          </g>
        ))}
        {previous && <path d={prevLine} fill="none" stroke="#A2A6AD" strokeWidth="1.5" strokeDasharray="4 4" strokeLinejoin="round" />}
        <path d={line} fill="none" stroke="#1D5FB4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
        {hover !== null && <circle cx={x(hover)} cy={yo(data[hover].orders)} r="4" fill="#1D5FB4" stroke="#fff" strokeWidth="2" />}
      </svg>
      {h && hover !== null && (
        <div className="pointer-events-none absolute top-1 z-10 rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-float" style={{ left: `${((x(hover) / W) * 100).toFixed(2)}%`, transform: hover > n * 0.65 ? 'translateX(-105%)' : 'translateX(8px)' }}>
          <p className="font-bold">{fmtDay(h.date)}</p>
          <p className="mt-0.5 text-ink-2"><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-ink" />Revenue <b className="tabular">{money(h.revenue)}</b>{hp && <span className="ml-1 text-ink-4">vs {money(hp.revenue)}</span>}</p>
          <p className="text-ink-2"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-info" />Orders <b className="tabular">{number(h.orders)}</b></p>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-ink-3">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-ink align-middle" />Revenue</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-info align-middle" />Orders</span>
        {previous && <span><span className="mr-1 inline-block w-3 border-t border-dashed border-ink-4 align-middle" />Previous period revenue</span>}
      </div>
    </div>
  );
}

export function Sparkline({ values, className, stroke = '#0B0C10', fill }: { values: number[]; className?: string; stroke?: string; fill?: boolean }) {
  const W = 120;
  const H = 32;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(H - ((v - min) / (max - min || 1)) * (H - 4) - 2).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-8 w-28', className)} preserveAspectRatio="none" aria-hidden>
      {fill && <polygon points={`0,${H} ${pts.join(' ')} ${W},${H}`} fill={stroke} opacity="0.08" />}
      <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export const PALETTE = ['#0B0C10', '#D01A2A', '#1D5FB4', '#5B3FA6', '#127A4A', '#8A5A00', '#6E737C'];

export function Donut({ data, size = 132, thickness = 16, centre, format = number }: { data: Array<{ label: string; value: number; color?: string; sub?: string }>; size?: number; thickness?: number; centre?: { value: string; label: string }; format?: (n: number) => string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label="Breakdown">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F0EDE7" strokeWidth={thickness} />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color ?? PALETTE[i % PALETTE.length]} strokeWidth={thickness} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          offset += len;
          return el;
        })}
        {centre && (
          <>
            <text x="50%" y="48%" textAnchor="middle" fontSize="17" fontWeight="700" fill="#0B0C10" fontFamily="inherit" letterSpacing="-0.02em">{centre.value}</text>
            <text x="50%" y="62%" textAnchor="middle" fontSize="10" fill="#6E737C" fontFamily="inherit">{centre.label}</text>
          </>
        )}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-[12.5px]">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color ?? PALETTE[i % PALETTE.length] }} />
            <span className="truncate text-ink-2">{d.label}</span>
            <span className="ml-auto shrink-0 pl-3 font-semibold tabular">{format(d.value)}<span className="ml-1 text-[11px] font-normal text-ink-3">{Math.round((d.value / total) * 100)}%</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBars({ data, format = number, color = '#0B0C10', showPct }: { data: Array<{ label: string; value: number; sub?: string }>; format?: (n: number) => string; color?: string; showPct?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="truncate font-semibold">{d.label}</span>
            <span className="shrink-0 tabular text-ink-2">{format(d.value)}{showPct && <span className="ml-1 text-[11px] text-ink-3">{Math.round((d.value / total) * 100)}%</span>}{d.sub && <span className="ml-1.5 text-[11px] text-ink-3">{d.sub}</span>}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-cream-3"><div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} /></div>
        </li>
      ))}
      {data.length === 0 && <li className="text-xs text-ink-3">No data in this range.</li>}
    </ul>
  );
}

/** Weekday × hour grid, darker = more orders. */
export function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(1, ...grid.flat());
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[520px] grid-cols-[32px_repeat(24,1fr)] gap-[3px]">
        <span />
        {Array.from({ length: 24 }).map((_, h) => <span key={h} className="text-center text-[9px] text-ink-4">{h % 3 === 0 ? `${h}` : ''}</span>)}
        {grid.map((row, d) => (
          <div key={d} className="contents">
            <span className="pr-1 text-right text-[10px] font-semibold text-ink-3">{days[d]}</span>
            {row.map((v, h) => (
              <span key={h} title={`${days[d]} ${h}:00 · ${v} ${v === 1 ? 'order' : 'orders'}`} className="aspect-square rounded-[3px]" style={{ background: v === 0 ? '#F0EDE7' : `rgba(11,12,16,${0.15 + (v / max) * 0.85})` }} />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-3">Hour of day across the week. Darker means more orders placed.</p>
    </div>
  );
}
