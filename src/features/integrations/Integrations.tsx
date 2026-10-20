import { useState } from 'react';
import { Activity, ChevronDown, Loader2, Plug, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useNow } from '../../store/clock';
import { Chip, PageHeader } from '../../components/ui';
import { latency } from '../../services/ai';
import { cn, timeAgo } from '../../lib/format';

const GROUP_ORDER = ['Telephony', 'Messaging', 'Microsoft', 'Enterprise', 'Commerce', 'Legacy ticketing'];
const MONO: Record<string, string> = {
  Telephony: '#4F46E5',
  Messaging: '#15803D',
  Microsoft: '#0284C7',
  Enterprise: '#0E7C86',
  Commerce: '#7C3AED',
  'Legacy ticketing': '#64748B',
};

export function Integrations() {
  const integrations = useStore((s) => s.integrations);
  const push = useStore((s) => s.pushIntegrationEvent);
  const toast = useStore((s) => s.toast);
  const now = useNow();
  const [open, setOpen] = useState<string | null>('smartflo-voice');
  const [testing, setTesting] = useState<string | null>(null);

  const test = async (id: string, name: string) => {
    setTesting(id);
    await latency(500, 1000);
    push(id, 'Health check passed · round trip 182 ms');
    toast({ tone: 'success', title: `${name}: connection healthy`, body: 'Round trip 182 ms' });
    setTesting(null);
  };

  const healthy = integrations.filter((i) => i.status === 'connected').length;

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="p-5 xl:p-6 max-w-[1500px] mx-auto">
        <PageHeader
          title="Integrations"
          subtitle="Telephony, messaging, Microsoft 365 and enterprise systems connected to one ticket"
          actions={
            <Chip tone="success" className="h-8 px-3 text-[13px]">
              <Activity size={13} /> {healthy}/{integrations.length} healthy
            </Chip>
          }
        />
        {GROUP_ORDER.map((g) => {
          const items = integrations.filter((i) => i.group === g);
          if (!items.length) return null;
          return (
            <section key={g} className="mb-5">
              <h2 className="eyebrow mb-2">{g}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                {items.map((i) => (
                  <div key={i.id} className="card overflow-hidden">
                    <div className="p-4 flex items-start gap-3">
                      <span className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-[13px] shrink-0" style={{ background: MONO[g] }}>
                        {i.name.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold leading-tight">{i.name}</div>
                        <div className="text-[13px] text-muted mt-0.5 leading-snug">{i.description}</div>
                      </div>
                      <Chip tone={i.status === 'connected' ? 'success' : 'warning'}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', i.status === 'connected' ? 'bg-success' : 'bg-warning')} />
                        {i.status === 'connected' ? 'Connected' : 'Degraded'}
                      </Chip>
                    </div>
                    <div className="grid grid-cols-3 border-t text-[13px]">
                      <div className="px-4 py-2 border-r">
                        <div className="text-subtle">Last sync</div>
                        <div className="font-semibold num">{timeAgo(i.lastSync, now)}</div>
                      </div>
                      <div className="px-4 py-2 border-r">
                        <div className="text-subtle">Health · 30 d</div>
                        <div className={cn('font-semibold num', i.health < 99.5 ? 'text-warning' : 'text-success')}>{i.health}%</div>
                      </div>
                      <div className="px-4 py-2">
                        <div className="text-subtle">Volume</div>
                        <div className="font-semibold truncate">{i.throughput}</div>
                      </div>
                    </div>
                    <div className="border-t flex items-center">
                      <button onClick={() => setOpen(open === i.id ? null : i.id)} className="flex-1 flex items-center gap-1.5 px-4 h-10 text-[13px] font-medium text-muted hover:text-ink" aria-expanded={open === i.id}>
                        <ChevronDown size={15} className={cn('transition-transform', open === i.id && 'rotate-180')} /> Event log ({i.events.length})
                      </button>
                      <button onClick={() => test(i.id, i.name)} disabled={testing === i.id} className="flex items-center gap-1.5 px-4 h-10 text-[13px] font-medium text-primary border-l hover:bg-primary/5">
                        {testing === i.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Test
                      </button>
                    </div>
                    {open === i.id && (
                      <ul className="border-t bg-surface2/60 max-h-[180px] overflow-y-auto scroll-thin">
                        {i.events.map((e, j) => (
                          <li key={j} className="flex items-start gap-2 px-4 py-1.5 text-[13px] border-b last:border-0">
                            <Plug size={12} className="text-subtle mt-0.5 shrink-0" />
                            <span className="flex-1">{e.text}</span>
                            <span className="text-subtle shrink-0 num">{timeAgo(e.at, now)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
