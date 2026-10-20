import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cn, countdown } from '../lib/format';
import { CHANNELS, DESKS, PRIORITIES, SLA_STATES, STATUSES, ink, slaColor } from '../lib/meta';
import { slaConsumed, slaState } from '../lib/sla';
import { useNow } from '../store/clock';
import type { Agent, Channel, Desk, Priority, Status, Ticket } from '../types';

export function Logo({ size = 28, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#0E7C86" />
        <path d="M9 9h8.5a4 4 0 0 1 0 8H9z" fill="#fff" opacity="0.95" />
        <path d="M9 17h9.5a4 4 0 0 1 0 8H9z" fill="#fff" opacity="0.7" />
        <circle cx="24" cy="9" r="2.4" fill="#5EEAD4" />
      </svg>
      {withText && (
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight">
            BizSens<span className="text-primary">Ai</span>
          </div>
          <div className="text-[13px] text-subtle -mt-0.5">Support Hub</div>
        </div>
      )}
    </div>
  );
}

export function Avatar({ agent, name, size = 28, ring }: { agent?: Agent; name?: string; size?: number; ring?: boolean }) {
  const label = agent?.name ?? name ?? '?';
  const initials = agent?.initials ?? label.split(' ').map((p) => p[0]).slice(0, 2).join('');
  const hue = agent?.hue ?? [...label].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  return (
    <span
      title={label}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', ring && 'ring-2 ring-surface')}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.4), background: `hsl(${hue} 50% 30%)` }}
    >
      {initials}
    </span>
  );
}

export function PriorityChip({ p, size = 'sm' }: { p: Priority; size?: 'sm' | 'md' }) {
  const m = PRIORITIES[p];
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-md font-semibold mono', size === 'sm' ? 'px-1.5 h-6 text-[13px]' : 'px-2 h-7 text-[13px]')}
      style={{ color: ink(m.color), background: m.bg }}
      title={`${p} · ${m.label}`}
    >
      {p}
      {size === 'md' && <span className="font-sans font-medium">{m.label}</span>}
    </span>
  );
}

export function ChannelIcon({ c, size = 30 }: { c: Channel; size?: number }) {
  const m = CHANNELS[c];
  const Icon = m.icon;
  return (
    <span title={m.label} className="inline-flex shrink-0 items-center justify-center rounded-lg" style={{ width: size, height: size, background: m.bg, color: m.color }}>
      <Icon size={size * 0.5} strokeWidth={2.2} />
    </span>
  );
}

export function StatusBadge({ s }: { s: Status }) {
  const m = STATUSES[s];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 h-6 text-[13px] font-medium" style={{ color: ink(m.color), background: `${m.color}1a` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

export function DeskBadge({ d }: { d: Desk }) {
  const m = DESKS[d];
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted whitespace-nowrap">
      <span className="h-2 w-2 rounded-sm" style={{ background: m.color }} />
      {m.short}
    </span>
  );
}

export function Chip({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'critical' | 'info' | 'violet'; className?: string }) {
  const tones: Record<string, string> = {
    neutral: 'bg-surface2 text-muted border border-hairline',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    critical: 'bg-critical/10 text-critical',
    info: 'bg-info/10 text-info',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 h-6 text-[13px] font-medium whitespace-nowrap', tones[tone], className)}>{children}</span>;
}

/** Live SLA timer bar for list rows. */
export function SlaBar({ t, compact }: { t: Ticket; compact?: boolean }) {
  const now = useNow();
  const state = slaState(t.sla, t.status, now, t.resolvedAt);
  const c = slaConsumed(t.sla, now);
  if (state === 'met' || state === 'breached') {
    if (t.status === 'resolved' || t.status === 'closed') {
      return <span className="text-[13px] font-medium" style={{ color: ink(SLA_STATES[state].color) }}>{state === 'met' ? 'SLA met' : 'Missed'}</span>;
    }
  }
  if (state === 'paused') return <span className="text-[13px] text-subtle">Paused</span>;
  const color = slaColor(c);
  const left = t.sla.resolutionDueAt - now;
  return (
    <div className={cn('flex flex-col gap-1', compact ? 'w-24' : 'w-28')}>
      <div className={cn('mono text-[13px] font-medium', state === 'at_risk' && 'animate-pulse-ring rounded px-0.5 -mx-0.5', state === 'breached' && 'animate-pulse-red rounded px-0.5 -mx-0.5')} style={{ color: ink(color) }}>
        {state === 'breached' ? `Over ${countdown(-left)}` : countdown(left)}
      </div>
      <div className="h-1.5 w-full rounded-full bg-hairline overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, c * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

export function SlaRing({ label, start, due, paused, done, size = 54 }: { label: string; start: number; due: number; paused?: number; done?: boolean; size?: number }) {
  const now = useNow();
  const effective = paused ?? now;
  const c = Math.max(0, (effective - start) / Math.max(1, due - start));
  const color = done ? '#16A34A' : slaColor(c);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const left = due - effective;
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} className={cn(!done && c >= 0.75 && c < 1 && 'animate-pulse-ring rounded-full')} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--hairline))" strokeWidth="5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - Math.min(1, done ? 1 : c))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" className="num" fontSize="13" fontWeight="700" fill="currentColor">
          {done ? '✓' : `${Math.min(999, Math.round(c * 100))}%`}
        </text>
      </svg>
      <div className="leading-tight">
        <div className="text-[13px] text-subtle">{label}</div>
        <div className="mono text-[13px] font-semibold" style={{ color: ink(color) }}>
          {done ? 'Met' : paused ? 'Paused' : left < 0 ? `Over ${countdown(-left)}` : countdown(left)}
        </div>
      </div>
    </div>
  );
}

export function CountUp({ value, decimals = 0, suffix = '', prefix = '' }: { value: number; decimals?: number; suffix?: string; prefix?: string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(a + (value - a) * e);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className="num">
      {prefix}
      {shown.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

export function Sparkline({ data, color = '#0E7C86', height = 34 }: { data: { v: number }[]; color?: string; height?: number }) {
  const id = useRef(`g${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = 520, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  return (
    <>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[#0B1220]/45 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative card shadow-pop w-full max-h-[90vh] flex flex-col"
            style={{ maxWidth: width }}
            initial={{ y: 12, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-center justify-between px-5 h-14 border-b">
              <div className="font-semibold text-[15px]">{title}</div>
              <button className="btn-ghost btn-sm" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto scroll-thin">{children}</div>
            {footer && <div className="px-5 py-3 border-t flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

export function Tip({ label, children, side = 'top' }: { label: string; children: ReactNode; side?: 'top' | 'bottom' | 'right' }) {
  const pos = side === 'top' ? 'bottom-full mb-1.5 left-1/2 -translate-x-1/2' : side === 'bottom' ? 'top-full mt-1.5 left-1/2 -translate-x-1/2' : 'left-full ml-2 top-1/2 -translate-y-1/2';
  return (
    <span className="relative inline-flex group">
      {children}
      <span role="tooltip" className={cn('pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-[#0B1220] px-2 py-1 text-[13px] font-medium text-white opacity-0 shadow-pop transition-opacity group-hover:opacity-100 group-focus-within:opacity-100', pos)}>
        {label}
      </span>
    </span>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">{icon}</div>
      <div className="font-semibold">{title}</div>
      <p className="text-muted text-[13px] mt-1 max-w-sm">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn('relative h-5 w-9 rounded-full transition-colors shrink-0', on ? 'bg-primary' : 'bg-hairline')}
    >
      <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', on ? 'left-[18px]' : 'left-0.5')} />
    </button>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="inline-flex rounded-lg bg-surface2 border border-hairline p-0.5" role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn('h-8 px-3 rounded-md text-[13px] font-medium transition-colors', value === it.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted text-[13.5px] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

/** Shows skeletons for a short, realistic load the first time a screen mounts. */
export function useFakeLoad(ms = 380) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return ready;
}

export function Waveform({ seed, progress = 0, bars = 64, height = 36, live }: { seed: string; progress?: number; bars?: number; height?: number; live?: boolean }) {
  const heights = useRef<number[]>([]);
  if (heights.current.length !== bars) {
    let h = [...seed].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0;
    heights.current = Array.from({ length: bars }, (_, i) => {
      h = (h * 1103515245 + 12345) >>> 0;
      const base = 0.25 + ((h >>> 8) % 1000) / 1000 * 0.75;
      return Math.max(0.12, base * (0.6 + 0.4 * Math.sin(i / 3)));
    });
  }
  return (
    <div className="flex items-center gap-[2px] w-full" style={{ height }} aria-hidden>
      {heights.current.map((v, i) => (
        <span
          key={i}
          className={cn('flex-1 rounded-full', live && 'animate-bar')}
          style={{
            height: `${v * 100}%`,
            background: i / bars <= progress ? 'rgb(var(--primary))' : 'rgb(var(--hairline))',
            animationDelay: live ? `${(i % 9) * 0.08}s` : undefined,
            transformOrigin: 'center',
          }}
        />
      ))}
    </div>
  );
}
