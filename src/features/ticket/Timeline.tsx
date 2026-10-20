import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Pause,
  Play,
  Sparkles,
  StickyNote,
  Zap,
  ArrowRightLeft,
  TrendingUp,
  Timer,
  CheckCircle2,
  UserPlus,
  Merge,
  Star,
  Bot,
  Database,
  FileText,
  Image as ImageIcon,
  Link2,
  Circle,
} from 'lucide-react';
import { CALL_SCRIPTS, SEED_TRANSCRIPTS } from '../../data/scripts';
import { CHANNELS, ink } from '../../lib/meta';
import { cn, dateTime, duration } from '../../lib/format';
import { Chip, Waveform } from '../../components/ui';
import type { Interaction, TranscriptLine } from '../../types';

const EVENT_ICONS: Record<string, typeof Zap> = {
  created: Zap,
  ack: CheckCircle2,
  assigned: UserPlus,
  transferred: ArrowRightLeft,
  escalated: TrendingUp,
  sla_paused: Pause,
  sla_resumed: Play,
  status: Circle,
  priority: TrendingUp,
  merged: Merge,
  linked: Link2,
  sla_warning: Timer,
  sla_breach: Timer,
  csat: Star,
  resolved_ai: Bot,
};

const EVENT_TONE: Record<string, string> = {
  escalated: 'text-critical bg-critical/10',
  sla_warning: 'text-warning bg-warning/10',
  sla_breach: 'text-critical bg-critical/10',
  transferred: 'text-violet-600 bg-violet-500/10 dark:text-violet-400',
  resolved_ai: 'text-primary bg-primary/10',
  created: 'text-info bg-info/10',
  ack: 'text-success bg-success/10',
  csat: 'text-warning bg-warning/10',
};

export function transcriptFor(key?: string): TranscriptLine[] {
  if (!key) return [];
  return CALL_SCRIPTS[key]?.lines ?? SEED_TRANSCRIPTS[key]?.lines ?? [];
}

function Media({ name }: { name: string }) {
  const isImg = /\.(jpg|png|jpeg)$/i.test(name);
  return (
    <span className="mt-1.5 inline-flex items-center gap-2 rounded-lg border bg-surface px-2.5 py-1.5 text-[13px]">
      {isImg ? <ImageIcon size={14} className="text-info" /> : <FileText size={14} className="text-critical" />}
      <span className="font-medium">{name}</span>
      <span className="text-subtle">{isImg ? '284 KB' : '118 KB'}</span>
    </span>
  );
}

function CallCard({ i }: { i: Interaction }) {
  const call = i.call!;
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [showT, setShowT] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setPos((p) => {
      const n = p + 1;
      if (n >= call.durationSec) {
        setPlaying(false);
        return 0;
      }
      return n;
    }), 120);
    return () => clearInterval(id);
  }, [playing, call.durationSec]);
  const lines = call.transcript ?? transcriptFor(call.transcriptKey);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-4 h-11 border-b bg-surface2/60">
        <span className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: CHANNELS.phone.bg, color: CHANNELS.phone.color }}>
          <CHANNELS.phone.icon size={13} />
        </span>
        <span className="text-[13.5px] font-semibold">{call.fromBot ? 'Voice bot call' : `${i.direction === 'out' ? 'Outbound' : 'Inbound'} call`}</span>
        <span className="text-[13px] text-muted">· {i.author}</span>
        <span className="ml-auto text-[13px] text-subtle">{dateTime(i.at)}</span>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {call.ivrPath.map((p, idx) => (
            <Chip key={idx} tone="info">{idx === 0 ? `IVR: ${p}` : p}</Chip>
          ))}
          <Chip>{call.language}</Chip>
          {call.recording && <Chip tone="critical"><span className="h-1.5 w-1.5 rounded-full bg-critical" /> Recorded</Chip>}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={() => setPlaying((p) => !p)} className="h-9 w-9 shrink-0 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover" aria-label={playing ? 'Pause recording' : 'Play recording'}>
            {playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <Waveform seed={i.id} progress={pos / call.durationSec} bars={72} height={32} />
          </div>
          <span className="mono text-[13px] text-muted shrink-0">{duration(pos)} / {duration(call.durationSec)}</span>
        </div>
        {call.summary && (
          <div className="mt-3 rounded-lg bg-primary/[0.06] border border-primary/20 p-3">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-primary"><Sparkles size={13} /> AI summary</div>
            <p className="text-[13.5px] mt-1 leading-relaxed">{call.summary}</p>
          </div>
        )}
        {lines.length > 0 && (
          <div className="mt-3">
            <button onClick={() => setShowT((s) => !s)} className="text-[13px] font-semibold text-primary flex items-center gap-1">
              <ChevronDown size={15} className={cn('transition-transform', showT && 'rotate-180')} /> {showT ? 'Hide' : 'Show'} transcript · {lines.length} turns
            </button>
            {showT && (
              <div className="mt-2 flex flex-col gap-2 border-l-2 border-hairline pl-3">
                {lines.map((l, idx) => (
                  <div key={idx} className="text-[13.5px]">
                    <span className={cn('text-[13px] font-semibold uppercase tracking-wide mr-2', l.speaker === 'customer' ? 'text-info' : 'text-primary')}>
                      {l.speaker === 'customer' ? 'Customer' : l.speaker === 'bot' ? 'Voice bot' : 'Agent'}
                    </span>
                    {l.text}
                    {l.translation && <div className="text-[13px] text-subtle italic">{l.translation}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmailCard({ i, defaultOpen }: { i: Interaction; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const out = i.direction === 'out';
  return (
    <div className={cn('card overflow-hidden', out && 'border-primary/25')}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-4 h-11 text-left hover:bg-surface2/60" aria-expanded={open}>
        <span className="h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ background: CHANNELS.email.bg, color: CHANNELS.email.color }}>
          <CHANNELS.email.icon size={13} />
        </span>
        <span className="text-[13.5px] font-semibold shrink-0">{i.author}</span>
        <span className="text-[13px] text-muted truncate">{out ? '→ customer' : ''} {i.subject ? `· ${i.subject}` : ''}</span>
        {i.chip && <Chip tone="success" className="shrink-0">{i.chip}</Chip>}
        <span className="ml-auto text-[13px] text-subtle shrink-0">{dateTime(i.at)}</span>
        <ChevronDown size={15} className={cn('text-subtle transition-transform shrink-0', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="px-4 pb-4 text-[13.5px] whitespace-pre-line leading-relaxed border-t pt-3">
          {i.body}
          {i.media && <div><Media name={i.media} /></div>}
        </div>
      ) : (
        <div className="px-4 pb-3 -mt-1 text-[13px] text-muted truncate">{i.body?.replace(/\n+/g, ' ')}</div>
      )}
    </div>
  );
}

function Bubble({ i }: { i: Interaction }) {
  const out = i.direction === 'out';
  const ch = CHANNELS[(i.type === 'whatsapp' ? 'whatsapp' : i.type === 'teams' ? 'teams' : i.type === 'app' ? 'app' : 'webchat') as keyof typeof CHANNELS];
  const wa = i.type === 'whatsapp';
  return (
    <div className={cn('flex', out ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[78%] rounded-2xl px-3.5 py-2 text-[13.5px] shadow-sm border', out ? (wa ? 'bg-[#DCF8C6] text-[#0B1220] border-[#c5ecab] rounded-br-md dark:bg-[#1f4d36] dark:text-[#e7f8ec] dark:border-[#2a6146]' : 'bg-primary/10 border-primary/20 rounded-br-md') : 'bg-surface rounded-bl-md')}>
        <div className="flex items-center gap-1.5 text-[13px] font-semibold mb-0.5" style={{ color: ink(ch.color) }}>
          <ch.icon size={12} /> {ch.label} · <span className="text-muted font-medium">{i.author}</span>
          {i.chip && <Chip tone="neutral" className="h-5 text-[13px]">{i.chip}</Chip>}
        </div>
        <div className="whitespace-pre-line">{i.body}</div>
        {i.media && <Media name={i.media} />}
        <div className="text-[13px] text-muted text-right mt-0.5">{dateTime(i.at)} {out && wa && <span className="text-info">✓✓</span>}</div>
      </div>
    </div>
  );
}

function LookupCard({ i }: { i: Interaction }) {
  const l = i.lookup!;
  const tone = l.tone === 'success' ? 'border-success/30' : l.tone === 'warning' ? 'border-warning/40' : 'border-info/30';
  return (
    <div className={cn('card border-l-4 p-3.5', tone)}>
      <div className="flex items-center gap-2">
        <Database size={14} className="text-primary" />
        <span className="text-[13.5px] font-semibold">{l.title}</span>
        <Chip tone="info" className="ml-auto">{l.source}</Chip>
      </div>
      <dl className="mt-2 grid grid-cols-[minmax(110px,auto)_1fr] gap-x-4 gap-y-1 text-[13px]">
        {l.rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-subtle">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="text-[13px] text-subtle mt-2">{i.author} · {dateTime(i.at)}</div>
    </div>
  );
}

export function Timeline({ items, live }: { items: Interaction[]; live?: React.ReactNode }) {
  const end = useRef<HTMLDivElement>(null);
  const sorted = [...items].sort((a, b) => a.at - b.at);
  const lastEmail = [...sorted].reverse().find((x) => x.type === 'email');
  const count = items.length;
  const first = useRef(true);
  useEffect(() => {
    // Scroll only the conversation pane; scrollIntoView would also scroll the app shell.
    const pane = end.current?.closest('[data-scroll-pane]');
    if (!pane) return;
    pane.scrollTo({ top: pane.scrollHeight, behavior: first.current ? 'auto' : 'smooth' });
    first.current = false;
    // Back-to-back additions can cancel a smooth scroll; make sure we settle on the newest item.
    const id = setTimeout(() => (pane.scrollTop = pane.scrollHeight), 500);
    return () => clearTimeout(id);
  }, [count]);
  return (
    <div className="flex flex-col gap-3">
      {sorted.map((i) => {
        switch (i.type) {
          case 'event': {
            const Icon = EVENT_ICONS[i.eventKind ?? 'status'] ?? Circle;
            return (
              <div key={i.id} className="flex items-center gap-2.5 px-1">
                <span className={cn('h-6 w-6 rounded-full flex items-center justify-center shrink-0', EVENT_TONE[i.eventKind ?? ''] ?? 'text-subtle bg-surface2')}>
                  <Icon size={12} />
                </span>
                <span className="text-[13px] text-muted flex-1 min-w-0">{i.body}</span>
                {i.chip && <Chip tone={i.eventKind === 'escalated' ? 'critical' : i.eventKind === 'transferred' ? 'violet' : i.eventKind === 'sla_warning' ? 'warning' : 'primary'}>{i.chip}</Chip>}
                <span className="text-[13px] text-subtle shrink-0">{dateTime(i.at)}</span>
              </div>
            );
          }
          case 'email':
            return <EmailCard key={i.id} i={i} defaultOpen={i === lastEmail || sorted.filter((x) => x.type === 'email').length <= 2} />;
          case 'call':
            return <CallCard key={i.id} i={i} />;
          case 'note':
            return (
              <div key={i.id} className="rounded-xl border border-amber-300/60 bg-note p-3.5 dark:border-amber-500/30">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-700 dark:text-amber-400">
                  <StickyNote size={13} /> Internal note · {i.author}
                  <span className="ml-auto text-[13px] font-normal text-subtle">{dateTime(i.at)}</span>
                </div>
                <div className="text-[13.5px] mt-1 whitespace-pre-line">{i.body}</div>
              </div>
            );
          case 'lookup':
            return <LookupCard key={i.id} i={i} />;
          default:
            return <Bubble key={i.id} i={i} />;
        }
      })}
      {live}
      <div ref={end} />
    </div>
  );
}
