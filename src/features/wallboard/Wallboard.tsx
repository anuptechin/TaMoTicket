import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Pause, Play } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useNow } from '../../store/clock';
import { navigate } from '../../store/router';
import { atRiskList, computeKpis, slaByDesk } from '../../lib/metrics';
import { CHANNEL_KEYS, CHANNELS, DESK_KEYS, DESKS, isOpen } from '../../lib/meta';
import { slaConsumed } from '../../lib/sla';
import { countdown, startOfDay } from '../../lib/format';
import { Logo, CountUp } from '../../components/ui';
import { CLIENT_LABEL } from '../../config';

const PANELS = ['Today at a glance', 'Desk queues', 'SLA at risk', 'Channels today'];

function Big({ label, value, suffix = '', decimals = 0, color = '#5EEAD4' }: { label: string; value: number; suffix?: string; decimals?: number; color?: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 flex flex-col justify-between">
      <div className="text-[18px] text-white/60">{label}</div>
      <div className="text-[64px] xl:text-[80px] font-bold leading-none num" style={{ color }}>
        <CountUp value={value} suffix={suffix} decimals={decimals} />
      </div>
    </div>
  );
}

export function Wallboard() {
  const tickets = useStore((s) => s.tickets);
  const customers = useStore((s) => s.customers);
  const agents = useStore((s) => s.agents);
  const now = useNow();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const k = useMemo(() => computeKpis(tickets, Date.now()), [tickets]);
  const risk = useMemo(() => atRiskList(tickets, Date.now()).slice(0, 6), [tickets, Math.floor(now / 30000)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((x) => (x + 1) % PANELS.length), 8000);
    return () => clearInterval(id);
  }, [paused]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !useStore.getState().directorOpen) navigate('/command');
      if (e.key === 'ArrowRight') setI((x) => (x + 1) % PANELS.length);
      if (e.key === 'ArrowLeft') setI((x) => (x + PANELS.length - 1) % PANELS.length);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const today = tickets.filter((t) => t.createdAt >= startOfDay(now));

  return (
    <div className="dark fixed inset-0 bg-[#060A12] text-white flex flex-col">
      <header className="flex items-center gap-4 px-8 h-20 border-b border-white/10">
        <Logo withText={false} size={36} />
        <div>
          <div className="text-[22px] font-bold">{CLIENT_LABEL} · Support floor</div>
          <div className="text-[15px] text-white/50">{PANELS[i]}</div>
        </div>
        <div className="ml-auto flex items-center gap-6">
          <div className="flex gap-1.5">
            {PANELS.map((p, j) => (
              <button key={p} onClick={() => setI(j)} aria-label={p} className={`h-2 rounded-full transition-all ${j === i ? 'w-8 bg-[#5EEAD4]' : 'w-2 bg-white/25'}`} />
            ))}
          </div>
          <div className="mono text-[28px] font-semibold">{new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
          <button onClick={() => setPaused((p) => !p)} className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label={paused ? 'Resume rotation' : 'Pause rotation'}>
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button onClick={() => navigate('/command')} className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label="Exit wallboard">
            <X size={18} />
          </button>
        </div>
      </header>
      <div className="flex-1 p-8 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4 }} className="h-full">
            {i === 0 && (
              <div className="grid grid-cols-4 grid-rows-2 gap-5 h-full">
                <Big label="Open tickets" value={k.open} />
                <Big label="New today" value={today.length} color="#93C5FD" />
                <Big label="SLA compliance" value={k.slaCompliance} suffix="%" decimals={1} color={k.slaCompliance >= 95 ? '#86EFAC' : '#FCD34D'} />
                <Big label="AI / self-service" value={k.aiResolution} suffix="%" color="#C4B5FD" />
                <Big label="Ack time (median)" value={k.ackMedian} suffix=" s" color="#5EEAD4" />
                <Big label="At risk now" value={k.atRisk} color="#FCD34D" />
                <Big label="Breached (open)" value={k.breachedOpen} color="#FCA5A5" />
                <Big label="Missed requests" value={0} color="#86EFAC" />
              </div>
            )}
            {i === 1 && (
              <div className="grid grid-cols-3 gap-5 h-full">
                {DESK_KEYS.map((d) => {
                  const open = tickets.filter((t) => t.desk === d && isOpen(t.status));
                  const sla = slaByDesk(tickets, now).find((x) => x.desk === d)!;
                  const deskAgents = agents.filter((a) => a.desk === d && a.role === 'agent');
                  return (
                    <div key={d} className="rounded-2xl bg-white/[0.04] border border-white/10 p-7 flex flex-col">
                      <div className="flex items-center gap-3 text-[26px] font-bold"><span className="h-4 w-4 rounded" style={{ background: DESKS[d].color }} />{DESKS[d].label}</div>
                      <div className="text-[96px] font-bold leading-none num mt-6">{open.length}</div>
                      <div className="text-[18px] text-white/60">open tickets</div>
                      <div className="mt-auto grid grid-cols-2 gap-4 text-[18px]">
                        <div><div className="text-white/50">SLA</div><div className="text-[32px] font-bold num text-[#86EFAC]">{sla.compliance.toFixed(1)}%</div></div>
                        <div><div className="text-white/50">Agents online</div><div className="text-[32px] font-bold num">{deskAgents.filter((a) => a.status !== 'offline').length}/{deskAgents.length}</div></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {i === 2 && (
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 h-full overflow-hidden">
                {risk.map((t) => {
                  const c = slaConsumed(t.sla, now);
                  const left = t.sla.resolutionDueAt - now;
                  return (
                    <div key={t.id} className="flex items-center gap-6 px-8 py-5 border-b border-white/10 text-[22px]">
                      <span className="mono font-semibold w-[150px]">{t.id}</span>
                      <span className="flex-1 truncate">{t.subject}</span>
                      <span className="text-white/50 w-[220px] truncate">{customers.find((x) => x.id === t.customerId)?.city}</span>
                      <span className="mono font-bold w-[200px] text-right" style={{ color: c >= 1 ? '#FCA5A5' : '#FCD34D' }}>{left < 0 ? `-${countdown(-left)}` : countdown(left)}</span>
                    </div>
                  );
                })}
                {risk.length === 0 && <div className="h-full flex items-center justify-center text-[32px] text-white/60">Nothing at risk 🎉</div>}
              </div>
            )}
            {i === 3 && (
              <div className="grid grid-cols-3 grid-rows-2 gap-5 h-full">
                {CHANNEL_KEYS.map((c) => {
                  const Icon = CHANNELS[c].icon;
                  return (
                    <div key={c} className="rounded-2xl bg-white/[0.04] border border-white/10 p-7 flex flex-col justify-between">
                      <div className="flex items-center gap-3 text-[24px] text-white/70"><Icon size={28} style={{ color: CHANNELS[c].color }} /> {CHANNELS[c].label}</div>
                      <div className="text-[88px] font-bold leading-none num">{today.filter((t) => t.channel === c).length}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
