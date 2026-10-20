import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Play, Check, ShieldCheck, Sparkles, Zap, Link2, Merge, ExternalLink, Inbox, Loader2, Paperclip } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { navigate, useRoute } from '../../store/router';
import { Avatar, Chip, PageHeader, PriorityChip } from '../../components/ui';
import { cn, clockTime } from '../../lib/format';
import { isOpen } from '../../lib/meta';

let lastRun = '';

const EMAIL_1 = {
  from: 'Suresh Iyer',
  addr: 'suresh@kovaimotors.in',
  subject: 'Warranty claim status for alternator PRT-44102-ALT – claim WC-20931',
  body: 'Dear Parts Team,\n\nOur warranty claim WC-20931 for alternator PRT-44102-ALT (bus, M&HCV) has been pending for three weeks. The operator is asking daily as the vehicle is idle.\n\nPlease share the status and expected credit note date.\n\nRegards,\nSuresh Iyer\nKovai Motors, Coimbatore · DLR-TN-0087',
};
const EMAIL_2 = {
  from: 'Suresh Iyer',
  addr: 'suresh@kovaimotors.in',
  subject: 'Re: Warranty claim status for alternator PRT-44102-ALT – claim WC-20931',
  body: 'Adding the job card and failure photos for the claim. Please expedite.\n\nSuresh',
  media: 'JobCard_WC-20931.pdf',
};

type StepState = 'pending' | 'running' | 'done';

export function EmailDedupe() {
  const { query } = useRoute();
  const store = useStore();
  const [mails, setMails] = useState<{ n: 1 | 2; at: number }[]>([]);
  const [steps1, setSteps1] = useState<StepState[]>(Array(6).fill('pending'));
  const [steps2, setSteps2] = useState<StepState[]>(Array(4).fill('pending'));
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const tRef = useRef<string | null>(null);

  const kA = store.tickets.find((t) => t.id === store.heroTickets.kavita_a);
  const kB = store.tickets.find((t) => t.id === store.heroTickets.kavita_b);
  const mergeAvailable = kA && kB && isOpen(kA.status) && isOpen(kB.status) && !kB.mergedInto;

  const clear = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clear, []);
  const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  const mark = (set: typeof setSteps1, i: number, s: StepState) => set((arr) => arr.map((x, j) => (j === i ? s : x)));

  const play = () => {
    clear();
    setMails([]);
    setSteps1(Array(6).fill('pending'));
    setSteps2(Array(4).fill('pending'));
    setTicketId(null);
    tRef.current = null;
    setPlaying(true);
    at(500, () => {
      setMails([{ n: 1, at: Date.now() }]);
      useStore.getState().pushIntegrationEvent('m365-mail', 'Email received: Warranty claim status for alternator');
    });
    const s1 = [900, 1600, 2400, 3100, 3800, 4500];
    s1.forEach((ms, i) => {
      at(ms, () => mark(setSteps1, i, 'running'));
      at(ms + 600, () => {
        mark(setSteps1, i, 'done');
        if (i === 4) {
          const s = useStore.getState();
          const now = Date.now();
          const tk = s.createTicket({
            subject: EMAIL_1.subject,
            customerId: s.heroes.suresh,
            desk: 'helpline',
            channel: 'email',
            priority: 'P3',
            category: 'Warranty',
            intent: 'Warranty claim status',
            region: 'South',
            entities: { partNo: 'PRT-44102-ALT' },
            ackSec: 41,
            interactions: [
              { type: 'event', at: now, eventKind: 'created', body: 'Ticket auto-created from Email (Microsoft 365) · AI: Warranty, P3, Helpline (92%)', chip: 'Auto-created' },
              { type: 'email', at: now - 4000, direction: 'in', author: EMAIL_1.from, subject: EMAIL_1.subject, body: EMAIL_1.body },
            ],
          });
          tRef.current = tk.id;
          setTicketId(tk.id);
          s.toast({ tone: 'success', title: `Ticket ${tk.id} created from email`, body: 'Classified as Warranty · P3 · Parts Helpline' });
        }
        if (i === 5 && tRef.current) {
          useStore.getState().addInteraction(tRef.current, { type: 'email', at: Date.now(), direction: 'out', author: 'BizSensAi', subject: `[${tRef.current}] We have received your request`, body: `Dear Suresh ji,\n\nThank you for writing to us. Your request is logged as ${tRef.current}. Our warranty team will update you within 12 working hours.\n\nParts Support` });
          useStore.getState().addInteraction(tRef.current, { type: 'event', at: Date.now() + 1, eventKind: 'ack', body: 'Acknowledgement email sent in 41 s', chip: '< 1 min' });
        }
      });
    });
    at(6900, () => {
      setMails((m) => [{ n: 2, at: Date.now() }, ...m]);
      useStore.getState().pushIntegrationEvent('m365-mail', 'Email received: Re: Warranty claim status…');
    });
    [7400, 8100, 8800, 9500].forEach((ms, i) => {
      at(ms, () => mark(setSteps2, i, 'running'));
      at(ms + 600, () => {
        mark(setSteps2, i, 'done');
        if (i === 2 && tRef.current) {
          const s = useStore.getState();
          s.addInteraction(tRef.current, { type: 'email', at: Date.now(), direction: 'in', author: EMAIL_2.from, subject: EMAIL_2.subject, body: EMAIL_2.body, media: EMAIL_2.media, chip: 'Duplicate prevented' });
          s.addInteraction(tRef.current, { type: 'event', at: Date.now() + 1, eventKind: 'linked', body: 'Follow-up email matched by thread (In-Reply-To), sender and claim number: added to this ticket instead of creating a new one', chip: 'Duplicate prevented' });
          s.toast({ tone: 'info', title: 'Duplicate prevented', body: `Follow-up linked to ${tRef.current}; no new ticket` });
          s.pushIntegrationEvent('m365-mail', `Thread matched by In-Reply-To: duplicate prevented (${tRef.current})`);
        }
        if (i === 3) setPlaying(false);
      });
    });
  };

  useEffect(() => {
    const run = query.get('run');
    if (query.get('play') && run && run !== lastRun) {
      lastRun = run;
      play();
      return () => {
        clear();
        lastRun = '';
      };
    }
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const S1 = ['Received in shared mailbox', 'Parsed: sender, dealer code, part and claim numbers', 'AI classified: Warranty · P3 · Parts Helpline (92%)', 'Duplicate check: no open ticket for this thread', 'Ticket created and routed', 'Acknowledgement sent (41 s)'];
  const S2 = ['Received: “Re:” reply with attachment', 'Thread match: In-Reply-To + sender + claim WC-20931', 'Linked to the existing ticket', 'No new ticket created'];

  const Step = ({ label, state, icon }: { label: string; state: StepState; icon?: React.ReactNode }) => (
    <div className={cn('flex items-center gap-2.5 text-[13.5px] transition-opacity', state === 'pending' && 'text-subtle')}>
      <span className={cn('h-6 w-6 rounded-full flex items-center justify-center shrink-0', state === 'done' ? 'bg-success text-white' : state === 'running' ? 'bg-primary/15 text-primary' : 'bg-surface2 text-subtle border')}>
        {state === 'done' ? <Check size={13} /> : state === 'running' ? <Loader2 size={13} className="animate-spin" /> : icon}
      </span>
      {label}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="p-5 xl:p-6 max-w-[1500px] mx-auto">
        <PageHeader
          title="Email to ticket"
          subtitle="Every email becomes a ticket within a minute; replies and follow-ups are linked automatically so nothing is duplicated"
          actions={
            <button className="btn-primary" onClick={play} disabled={playing}>
              <Play size={15} /> {playing ? 'Processing…' : 'Simulate warranty email + follow-up'}
            </button>
          }
        />

        {mergeAvailable && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-xl border border-info/30 bg-info/[0.06] p-3.5 flex items-center gap-3 flex-wrap">
            <Merge size={18} className="text-info shrink-0" />
            <div className="text-[13.5px] flex-1 min-w-[260px]">
              <span className="font-semibold">Merge suggestion:</span> two similar tickets from <span className="font-semibold">Mahalaxmi Automobiles (DLR-MH-0142)</span>:{' '}
              <button className="mono font-semibold text-primary" onClick={() => navigate(`/ticket/${kA!.id}`)}>{kA!.id}</button> (email) and{' '}
              <button className="mono font-semibold text-primary" onClick={() => navigate(`/ticket/${kB!.id}`)}>{kB!.id}</button> (Teams), both asking for invoice INV-2026-44310. Similarity 94%.
            </div>
            <button
              className="btn-primary btn-sm"
              onClick={() => {
                store.merge(kB!.id, kA!.id);
                store.toast({ tone: 'success', title: `${kB!.id} merged into ${kA!.id}`, body: 'One ticket, one reply to the dealer' });
              }}
            >
              <Merge size={14} /> Merge into {kA!.id}
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-4">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-4 h-12 border-b">
              <Inbox size={16} className="text-[#0284C7]" />
              <span className="font-semibold text-[14px]">parts.support shared mailbox</span>
              <Chip tone="info" className="ml-auto">Microsoft 365</Chip>
            </div>
            <div className="min-h-[420px]">
              <AnimatePresence initial={false}>
                {mails.map((m) => {
                  const e = m.n === 1 ? EMAIL_1 : EMAIL_2;
                  return (
                    <motion.div key={m.n} initial={{ opacity: 0, x: -14, backgroundColor: 'rgba(14,124,134,0.12)' }} animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(14,124,134,0)' }} transition={{ duration: 0.6 }} className="px-4 py-3 border-b">
                      <div className="flex items-center gap-2">
                        <Avatar name={e.from} size={28} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13.5px] font-semibold flex items-center gap-2">{e.from} <span className="text-[13px] text-subtle font-normal ml-auto">{clockTime(m.at)}</span></div>
                          <div className="text-[13px] text-subtle">{e.addr}</div>
                        </div>
                      </div>
                      <div className="text-[13.5px] font-medium mt-1.5 leading-snug">{e.subject}</div>
                      <div className="text-[13px] text-muted mt-0.5 line-clamp-2">{e.body}</div>
                      <div className="flex gap-1.5 mt-2">
                        {m.n === 2 && <Chip><Paperclip size={11} /> {EMAIL_2.media}</Chip>}
                        {m.n === 1 && ticketId && <Chip tone="primary"><Zap size={11} /> {ticketId}</Chip>}
                        {m.n === 2 && steps2[2] === 'done' && <Chip tone="success"><ShieldCheck size={11} /> Duplicate prevented</Chip>}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {mails.length === 0 && (
                <div className="p-10 text-center text-muted text-[13.5px]">
                  <Mail size={26} className="mx-auto mb-2 text-[#0284C7]" />
                  Waiting for new mail. Press <span className="font-semibold">Simulate</span> to send a warranty query and its follow-up.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                <span className="font-semibold text-[14px]">Email 1 · new request</span>
                {ticketId && (
                  <button className="btn-secondary btn-sm ml-auto" onClick={() => navigate(`/ticket/${ticketId}`)}>
                    Open {ticketId} <ExternalLink size={13} />
                  </button>
                )}
              </div>
              <div className="mt-3 grid gap-2.5">
                {S1.map((l, i) => (
                  <Step key={l} label={l} state={steps1[i]} icon={<span className="text-[13px] num">{i + 1}</span>} />
                ))}
              </div>
              {ticketId && (
                <div className="mt-3 rounded-lg bg-surface2 p-3 flex items-center gap-3 flex-wrap">
                  <span className="mono font-semibold">{ticketId}</span>
                  <PriorityChip p="P3" />
                  <Chip>Warranty</Chip>
                  <Chip>Parts Helpline</Chip>
                  <span className="text-[13px] text-muted">Kovai Motors, Coimbatore · DLR-TN-0087</span>
                </div>
              )}
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-primary" />
                <span className="font-semibold text-[14px]">Email 2 · follow-up</span>
                {steps2[2] === 'done' && <Chip tone="success" className="ml-auto"><ShieldCheck size={12} /> Duplicate prevented</Chip>}
              </div>
              <div className="mt-3 grid gap-2.5">
                {S2.map((l, i) => (
                  <Step key={l} label={l} state={steps2[i]} icon={<span className="text-[13px] num">{i + 1}</span>} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ['540', 'Emails parsed today'],
                ['38 s', 'Median acknowledgement'],
                ['61', 'Duplicates prevented this week'],
              ].map(([v, l]) => (
                <div key={l} className="card p-3">
                  <div className="text-[20px] font-bold num">{v}</div>
                  <div className="text-[13px] text-subtle">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
