import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Pause, Play, PhoneOff, ArrowRightLeft, Sparkles, Loader2, Check } from 'lucide-react';
import { useStore, type ActiveCall } from '../../store/useStore';
import { useNow } from '../../store/clock';
import { CALL_SCRIPTS } from '../../data/scripts';
import { endCall } from '../../services/scenarios';
import { cn, duration } from '../../lib/format';
import { Chip, Waveform } from '../../components/ui';

export function LiveCallPanel({ call, onTransfer }: { call: ActiveCall; onTransfer: () => void }) {
  const patch = useStore((s) => s.patchActiveCall);
  const customer = useStore((s) => s.customers.find((c) => c.id === call.customerId));
  const now = useNow();
  const script = CALL_SCRIPTS[call.scriptKey];
  const lines = script.lines.slice(0, call.lineIndex);
  const done = call.lineIndex >= script.lines.length;
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' });
  }, [call.lineIndex]);
  const elapsed = call.acceptedAt ? (now - call.acceptedAt) / 1000 : 0;
  const summarising = call.phase === 'summarising';

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden border-[#4F46E5]/40 shadow-sm">
      <div className="flex items-center gap-3 px-4 h-14 bg-[#4F46E5] text-white">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
        </span>
        <div className="leading-tight min-w-0">
          <div className="text-[14px] font-semibold truncate">On call · {customer?.name}</div>
          <div className="text-[13px] text-white/75 truncate">{script.ivrPath.join(' → ')} · recording</div>
        </div>
        <span className="mono text-[17px] font-semibold ml-2">{duration(elapsed)}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => patch({ muted: !call.muted })} title={call.muted ? 'Unmute' : 'Mute'} aria-label={call.muted ? 'Unmute' : 'Mute'} className={cn('h-9 px-2.5 rounded-lg text-[13px] font-medium flex items-center gap-1.5', call.muted ? 'bg-white text-[#4F46E5]' : 'bg-white/15 hover:bg-white/25')} aria-pressed={call.muted}>
            {call.muted ? <MicOff size={15} /> : <Mic size={15} />} <span className="hidden 2xl:inline">{call.muted ? 'Muted' : 'Mute'}</span>
          </button>
          <button onClick={() => patch({ held: !call.held })} title={call.held ? 'Resume' : 'Hold'} aria-label={call.held ? 'Resume' : 'Hold'} className={cn('h-9 px-2.5 rounded-lg text-[13px] font-medium flex items-center gap-1.5', call.held ? 'bg-white text-[#4F46E5]' : 'bg-white/15 hover:bg-white/25')} aria-pressed={call.held}>
            {call.held ? <Play size={15} /> : <Pause size={15} />} <span className="hidden 2xl:inline">{call.held ? 'Resume' : 'Hold'}</span>
          </button>
          <button onClick={onTransfer} title="Transfer" aria-label="Transfer call" className="h-9 px-2.5 rounded-lg text-[13px] font-medium flex items-center gap-1.5 bg-white/15 hover:bg-white/25">
            <ArrowRightLeft size={15} /> <span className="hidden 2xl:inline">Transfer</span>
          </button>
          <button onClick={() => endCall()} disabled={summarising} className={cn('h-9 px-3.5 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 whitespace-nowrap bg-critical hover:bg-red-700', done && !summarising && 'ring-4 ring-white/40 animate-pulse')}>
            <PhoneOff size={15} /> End call
          </button>
        </div>
      </div>
      <div className="px-4 pt-3">
        <Waveform seed={call.ticketId} bars={90} height={26} live={!call.held && !summarising} progress={call.held ? 0 : 1} />
      </div>
      <div className="relative">
        <div ref={box} className="max-h-[240px] overflow-y-auto scroll-thin px-4 py-3 flex flex-col gap-2" aria-live="polite">
          <div className="flex items-center gap-2 text-[13px] text-subtle">
            <Sparkles size={13} className="text-primary" /> Live transcript · {script.language} · speaker-separated
          </div>
          <AnimatePresence initial={false}>
            {lines.map((l, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-2', l.speaker === 'agent' && 'flex-row-reverse')}>
                <div className={cn('max-w-[82%] rounded-2xl px-3 py-1.5 text-[13.5px]', l.speaker === 'agent' ? 'bg-primary/10 rounded-br-md' : 'bg-surface2 rounded-bl-md')}>
                  <div className={cn('text-[13px] font-semibold uppercase tracking-wide', l.speaker === 'agent' ? 'text-primary' : 'text-[#4F46E5]')}>
                    {l.speaker === 'agent' ? script.agentName : customer?.name}
                  </div>
                  {l.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {!done && !call.held && (
            <div className="flex gap-1 px-2 py-1">
              {[0, 1, 2].map((d) => (
                <span key={d} className="h-1.5 w-1.5 rounded-full bg-subtle animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </div>
          )}
          {call.held && <Chip tone="warning">On hold: customer hears music</Chip>}
        </div>
        <AnimatePresence>
          {summarising && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-surface/85 backdrop-blur-[2px] flex items-center justify-center">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-[15px] font-semibold text-primary">
                  <Loader2 size={18} className="animate-spin" /> AI is summarising…
                </div>
                <div className="mt-3 flex flex-col gap-1.5 text-[13px] text-muted items-start mx-auto w-fit">
                  {['Transcript finalised', 'Entities extracted: order, part number', 'Category, priority and next action', 'WhatsApp update to customer'].map((s, i) => (
                    <motion.div key={s} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.3 }} className="flex items-center gap-2">
                      <Check size={14} className="text-success" /> {s}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
