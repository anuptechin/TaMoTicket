import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Moon, Phone, Play, CheckCircle2, CalendarClock, ExternalLink, Languages, Sparkles, Clock, UserCheck } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { navigate, useRoute } from '../../store/router';
import { VOICEBOT_SCRIPTS, type VoiceBotScript } from '../../data/scripts';
import { Chip, PageHeader, Toggle, Waveform } from '../../components/ui';
import { cn, duration } from '../../lib/format';

let lastRun = '';

type Phase = 'idle' | 'ringing' | 'talking' | 'done';

export function VoiceBot() {
  const { query } = useRoute();
  const [scriptKey, setScriptKey] = useState<keyof typeof VOICEBOT_SCRIPTS>('self_resolved');
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [english, setEnglish] = useState(true);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timers = useRef<number[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const script = VOICEBOT_SCRIPTS[scriptKey];
  const customers = useStore((s) => s.customers);
  const heroes = useStore((s) => s.heroes);
  const caller = customers.find((c) => c.id === heroes[script.heroKey]);
  const callbacks = useStore((s) => s.tickets.filter((t) => t.tags.includes('Callback 09:30')));

  const clear = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clear, []);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' });
  }, [shown, english]);
  useEffect(() => {
    if (phase !== 'talking') return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const finish = (sc: VoiceBotScript) => {
    const s = useStore.getState();
    const customerId = s.heroes[sc.heroKey];
    const now = Date.now();
    const transcript = sc.lines.map((l) => ({ speaker: l.speaker === 'bot' ? ('bot' as const) : ('customer' as const), text: l.hi, translation: l.en }));
    const callBase = {
      type: 'call' as const,
      at: now - 95_000,
      direction: 'in' as const,
      author: s.customers.find((c) => c.id === customerId)?.name,
    };
    if (sc.outcome === 'resolved') {
      const t = s.createTicket({
        subject: 'Points balance enquiry (after-hours voice bot)',
        customerId,
        desk: 'loyalty',
        channel: 'phone',
        priority: 'P4',
        category: 'Loyalty points',
        intent: 'Points balance',
        status: 'resolved',
        aiResolved: true,
        region: 'Central',
        sentiment: 'positive',
        tags: ['Voice bot', 'Self-service'],
        ackSec: 1,
        interactions: [
          { type: 'event', at: now - 96_000, eventKind: 'created', body: 'After-hours call answered by AI voice bot (TTSL Smartflo) · language detected: Hindi', chip: 'Voice bot' },
          { ...callBase, call: { durationSec: 95, ivrPath: ['After hours', 'Voice bot', 'Hindi'], recording: true, transcript, language: 'Hindi', fromBot: true, summary: 'Member Ramesh Yadav (LYT-662913) asked for his points balance. Bot verified identity with the last four digits of the loyalty ID, shared balance 8,240 points, gap to Gold tier and last credit (420 points, 14 Oct). Details sent on WhatsApp.' } },
          { type: 'whatsapp', at: now - 2000, direction: 'out', author: 'BizSensAi', body: 'Your loyalty balance: 8,240 points. Last credit: 420 points on 14 Oct (INV-2026-43902). 1,760 points to Gold tier.' },
          { type: 'event', at: now, eventKind: 'resolved_ai', body: 'Resolved by AI voice bot without an agent · counted in AI resolution %', chip: 'AI resolved' },
        ],
      });
      s.updateTicket(t.id, { resolvedAt: now, fcr: true });
      setTicketId(t.id);
      s.toast({ tone: 'success', title: `Resolved by voice bot · ${t.id}`, body: 'No agent needed · AI resolution % updated' });
      s.pushIntegrationEvent('smartflo-bot', `Bot session ended: self-resolved (${t.id})`);
    } else {
      const farhan = s.agents.find((a) => a.name === 'Farhan Sheikh');
      const t = s.createTicket({
        subject: 'Wrong clutch plate for ICV on order ED-559034: truck waiting (callback 9:30 am)',
        customerId,
        desk: 'helpline',
        channel: 'phone',
        priority: 'P2',
        category: 'Wrong / damaged part',
        intent: 'Wrong part supplied',
        assigneeId: farhan?.id,
        region: 'East',
        sentiment: 'negative',
        tags: ['Voice bot', 'Callback 09:30'],
        entities: { orderId: 'ED-559034', partNo: 'PRT-31208-CLT' },
        ackSec: 1,
        interactions: [
          { type: 'event', at: now - 96_000, eventKind: 'created', body: 'After-hours call answered by AI voice bot · caller asked for a human', chip: 'Voice bot' },
          { ...callBase, call: { durationSec: 88, ivrPath: ['After hours', 'Voice bot', 'Hindi'], recording: true, transcript, language: 'Hindi', fromBot: true, summary: 'Garage owner Anil Mahato (Jamshedpur) received a wrong clutch plate for an ICV on order ED-559034; truck is off road in the workshop. Asked for a human. Bot logged a P2 ticket and scheduled a callback at 9:30 am.' } },
          { type: 'event', at: now - 1000, eventKind: 'assigned', body: 'Callback task scheduled for 9:30 am · assigned to Farhan S. (skill: Wrong part, Hindi)', chip: 'Callback 9:30' },
          { type: 'whatsapp', at: now, direction: 'out', author: 'BizSensAi', body: `We have registered your complaint. Our agent will call you at 9:30 am. Ticket: TM-${s.nextNo}` },
        ],
      });
      s.addInteraction(t.id, { type: 'note', at: now + 1, author: 'AI copilot', body: 'Vehicle off road: keep as P2. Check PLM for the correct ICV clutch plate before the callback.' });
      setTicketId(t.id);
      s.notify({ title: `Callback 9:30 am · ${t.id}`, body: 'Voice bot hand-off: wrong clutch plate, truck waiting', tone: 'warning', ticketId: t.id });
      s.toast({ tone: 'warning', title: `P2 ticket ${t.id} with 9:30 am callback`, body: 'Transcript attached, assigned to Farhan S.' });
      s.pushIntegrationEvent('smartflo-bot', `Callback 09:30 scheduled for ${t.id}`);
    }
  };

  const play = (key: keyof typeof VOICEBOT_SCRIPTS) => {
    clear();
    const sc = VOICEBOT_SCRIPTS[key];
    setScriptKey(key);
    setShown(0);
    setTicketId(null);
    setElapsed(0);
    setPhase('ringing');
    timers.current.push(window.setTimeout(() => setPhase('talking'), 1400));
    let t = 1600;
    sc.lines.forEach((_, i) => {
      t += i === 0 ? 300 : 2300;
      timers.current.push(window.setTimeout(() => setShown(i + 1), t));
    });
    timers.current.push(
      window.setTimeout(() => {
        setPhase('done');
        finish(sc);
      }, t + 1600),
    );
  };

  useEffect(() => {
    const run = query.get('run');
    const p = query.get('play') as keyof typeof VOICEBOT_SCRIPTS | null;
    if (p && VOICEBOT_SCRIPTS[p] && run && run !== lastRun) {
      lastRun = run;
      play(p);
      return () => {
        clear();
        lastRun = '';
      };
    }
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = script.lines.slice(0, shown);

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="p-5 xl:p-6 max-w-[1500px] mx-auto">
        <PageHeader
          title="After-hours AI voice bot"
          subtitle="Answers in Hindi and other Indian languages when the desks are closed (Mon–Sat 9:00–18:00), resolves simple requests and hands off the rest with a callback"
          actions={
            <>
              <button className="btn-secondary" onClick={() => play('self_resolved')} disabled={phase === 'ringing' || phase === 'talking'}>
                <Play size={15} /> Points balance (self-resolved)
              </button>
              <button className="btn-primary" onClick={() => play('handoff')} disabled={phase === 'ringing' || phase === 'talking'}>
                <Play size={15} /> Wants a human (hand-off)
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-3 px-4 h-16 bg-[#0B1220] text-white">
              <span className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0E7C86] to-[#4F46E5] flex items-center justify-center"><Bot size={20} /></span>
              <div className="leading-tight min-w-0">
                <div className="text-[14px] font-semibold flex items-center gap-2">
                  {phase === 'idle' ? 'Waiting for after-hours calls' : `${caller?.name} · ${caller?.city}`}
                </div>
                <div className="text-[13px] text-white/65 flex items-center gap-2">
                  <Moon size={12} /> {script.time} · After hours · {phase === 'idle' ? 'Bot on duty' : script.title}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-3">
                {phase !== 'idle' && <span className="mono text-[15px]">{duration(elapsed)}</span>}
                <Chip tone={phase === 'done' ? 'success' : phase === 'idle' ? 'neutral' : 'critical'} className={cn(phase === 'idle' && 'bg-white/10 text-white/80 border-white/10')}>
                  {phase === 'idle' ? 'Idle' : phase === 'ringing' ? 'Ringing…' : phase === 'talking' ? '● Live' : 'Call ended'}
                </Chip>
              </div>
            </div>
            <div className="px-4 pt-3 flex items-center gap-3 flex-wrap">
              {phase !== 'idle' && (
                <>
                  <Chip tone="info"><Phone size={11} /> {caller?.mobile}</Chip>
                  <Chip tone="primary"><Languages size={11} /> Detected: Hindi</Chip>
                  {shown >= 4 && script.outcome === 'resolved' && <Chip tone="success"><UserCheck size={11} /> Identity verified</Chip>}
                  {shown >= 2 && script.outcome === 'handoff' && <Chip tone="warning">Intent: talk to a human · urgent</Chip>}
                </>
              )}
              <label className="ml-auto flex items-center gap-2 text-[13px] text-muted">
                English translation <Toggle on={english} onChange={setEnglish} label="Show English translation" />
              </label>
            </div>
            <div className="px-4 pt-3">
              <Waveform seed={scriptKey} bars={110} height={34} live={phase === 'talking'} progress={phase === 'talking' ? 1 : 0} />
            </div>
            <div ref={box} className="h-[360px] overflow-y-auto scroll-thin p-4 flex flex-col gap-2.5">
              {phase === 'idle' && (
                <div className="m-auto text-center text-muted text-[13.5px] max-w-[380px]">
                  <Bot size={30} className="mx-auto text-primary mb-2" />
                  Choose a call above. The bot speaks Hindi with the caller; toggle the English translation for the audience.
                </div>
              )}
              {phase === 'ringing' && <div className="m-auto text-[14px] text-muted flex items-center gap-2"><Phone size={16} className="animate-bounce text-primary" /> Incoming call at {script.time}…</div>}
              <AnimatePresence initial={false}>
                {lines.map((l, i) => (
                  <motion.div key={`${scriptKey}-${i}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', l.speaker === 'bot' ? 'justify-start' : 'justify-end')}>
                    <div className={cn('max-w-[78%] rounded-2xl px-3.5 py-2 border', l.speaker === 'bot' ? 'bg-primary/[0.07] border-primary/20 rounded-bl-md' : 'bg-surface2 rounded-br-md')}>
                      <div className={cn('text-[13px] font-semibold uppercase tracking-wide', l.speaker === 'bot' ? 'text-primary' : 'text-[#4F46E5]')}>{l.speaker === 'bot' ? 'BizSensAi voice bot' : caller?.name}</div>
                      <div className="text-[14.5px] leading-relaxed" lang="hi">{l.hi}</div>
                      {english && <div className="text-[13px] text-muted italic mt-0.5">{l.en}</div>}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="card p-4">
              <div className="eyebrow">Outcome</div>
              {phase !== 'done' || !ticketId ? (
                <div className="text-[13.5px] text-muted mt-2">The outcome appears here when the call ends.</div>
              ) : script.outcome === 'resolved' ? (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                  <div className="flex items-center gap-2 text-success font-semibold text-[15px]"><CheckCircle2 size={18} /> Resolved by the bot</div>
                  <p className="text-[13.5px] text-muted mt-1">Ticket <span className="mono font-semibold text-ink">{ticketId}</span> was created and auto-resolved. It counts towards the AI / self-service resolution KPI.</p>
                  <div className="mt-3 flex gap-2">
                    <button className="btn-secondary btn-sm" onClick={() => navigate(`/ticket/${ticketId}`)}>Open ticket <ExternalLink size={13} /></button>
                    <button className="btn-ghost btn-sm" onClick={() => navigate('/command')}>See KPI</button>
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                  <div className="flex items-center gap-2 text-warning font-semibold text-[15px]"><CalendarClock size={18} /> Handed off with callback</div>
                  <ul className="text-[13.5px] mt-2 flex flex-col gap-1">
                    <li>· P2 ticket <span className="mono font-semibold">{ticketId}</span> on Parts Helpline</li>
                    <li>· Callback task at <span className="font-semibold">9:30 am</span>, Farhan S.</li>
                    <li>· Full Hindi transcript + English translation attached</li>
                    <li>· Customer got the ticket number by SMS / WhatsApp</li>
                  </ul>
                  <button className="btn-secondary btn-sm mt-3" onClick={() => navigate(`/ticket/${ticketId}`)}>Open ticket <ExternalLink size={13} /></button>
                </motion.div>
              )}
            </div>
            <div className="card p-4">
              <div className="eyebrow flex items-center gap-1"><Sparkles size={13} /> Last night</div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  ['212', 'Calls answered'],
                  ['61%', 'Resolved by bot'],
                  ['1:48', 'Avg. handle time'],
                  ['0', 'Missed calls'],
                ].map(([v, l]) => (
                  <div key={l}>
                    <div className="text-[20px] font-bold num">{v}</div>
                    <div className="text-[13px] text-subtle">{l}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {['Hindi', 'Marathi', 'Tamil', 'Bengali', 'Telugu', 'English'].map((l) => (
                  <Chip key={l}>{l}</Chip>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <div className="eyebrow flex items-center gap-1"><Clock size={13} /> 9:30 am callback queue</div>
              <div className="mt-2 flex flex-col gap-1.5">
                {callbacks.map((t) => (
                  <button key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="text-left rounded-lg border px-3 py-2 hover:border-primary/40">
                    <span className="mono text-[13px] font-semibold">{t.id}</span> <span className="text-[13px]">{t.subject}</span>
                  </button>
                ))}
                {callbacks.length === 0 && <div className="text-[13px] text-muted">No callbacks scheduled. Hand-offs from the bot land here with their transcript.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
