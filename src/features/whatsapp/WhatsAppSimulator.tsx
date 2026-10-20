import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Bot, CheckCheck, ChevronLeft, Phone, Video, MoreVertical, Smile, Paperclip, Mic, ExternalLink, MessageCircle, Zap, Signal, Wifi, BatteryFull } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { navigate, useRoute } from '../../store/router';
import { WHATSAPP_JOURNEY, type WaStep } from '../../data/scripts';
import { Avatar, Chip, PageHeader } from '../../components/ui';
import { cn, clockTime } from '../../lib/format';

interface Msg extends WaStep {
  at: number;
  id: number;
}

let lastRun = '';

export function WhatsAppSimulator() {
  const { query } = useRoute();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [playing, setPlaying] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [typing, setTyping] = useState<WaStep['from'] | null>(null);
  const timers = useRef<number[]>([]);
  const ticketRef = useRef<string | null>(null);
  const phoneBody = useRef<HTMLDivElement>(null);
  const agentBody = useRef<HTMLDivElement>(null);

  const clear = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clear, []);
  useEffect(() => {
    phoneBody.current?.scrollTo({ top: phoneBody.current.scrollHeight, behavior: 'smooth' });
    agentBody.current?.scrollTo({ top: agentBody.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing]);

  const play = () => {
    clear();
    setMsgs([]);
    setTicketId(null);
    ticketRef.current = null;
    setPlaying(true);
    const s0 = useStore.getState();
    const gurpreet = s0.heroes.gurpreet;
    s0.pushIntegrationEvent('smartflo-wa', 'Inbound message: Hi (Gurpreet Singh)');
    let t = 300;
    WHATSAPP_JOURNEY.forEach((step, i) => {
      t += step.delay;
      timers.current.push(window.setTimeout(() => setTyping(step.from === 'customer' ? 'customer' : step.from), t - Math.min(900, step.delay * 0.6)));
      timers.current.push(
        window.setTimeout(() => {
          setTyping(null);
          const s = useStore.getState();
          let text = step.text;
          if (step.action === 'create_ticket') {
            const now = Date.now();
            const history = WHATSAPP_JOURNEY.slice(0, i).map((m, j) => ({
              type: 'whatsapp' as const,
              at: now - (i - j) * 4000,
              direction: m.from === 'customer' ? ('in' as const) : ('out' as const),
              author: m.from === 'customer' ? 'Gurpreet Singh' : 'WhatsApp bot',
              body: m.card ? `${m.text}\n${m.card.title}: ${m.card.rows.map((r) => r.join(' ')).join(' · ')}` : m.text,
            }));
            const tk = s.createTicket({
              subject: 'Order ED-558774 delivery late, trucks waiting: customer asked for an agent',
              customerId: gurpreet,
              desk: 'edukaan',
              channel: 'whatsapp',
              priority: 'P2',
              category: 'Order & dispatch',
              intent: 'Delivery delay',
              entities: { orderId: 'ED-558774', partNo: 'PRT-38811-SHK' },
              sentiment: 'negative',
              region: 'North',
              ackSec: 1,
              interactions: [
                { type: 'event', at: now - i * 4000, eventKind: 'created', body: 'Conversation started on WhatsApp (TTSL Smartflo): bot handling', chip: 'Bot' },
                ...history,
                { type: 'event', at: now, eventKind: 'created', body: 'Hand-off requested: ticket auto-created with full chat history', chip: 'Auto-created' },
              ],
            });
            ticketRef.current = tk.id;
            setTicketId(tk.id);
            text = text.replace('{id}', tk.id);
            s.notify({ title: `New WhatsApp hand-off · ${tk.id}`, body: 'Gurpreet Singh · order ED-558774 delivery late', tone: 'info', ticketId: tk.id });
            s.toast({ tone: 'info', title: `Ticket ${tk.id} created from WhatsApp`, body: 'Bot hand-off to eDukaan desk with full history' });
          } else if (ticketRef.current) {
            if (step.action === 'assign') {
              const aditi = s.agents.find((a) => a.name === 'Aditi Sharma');
              if (aditi) s.assign(ticketRef.current, aditi.id);
            }
            s.addInteraction(ticketRef.current, {
              type: 'whatsapp',
              at: Date.now(),
              direction: step.from === 'customer' ? 'in' : 'out',
              author: step.from === 'customer' ? 'Gurpreet Singh' : step.from === 'agent' ? 'Aditi S.' : 'BizSensAi',
              body: text,
            });
          }
          setMsgs((m) => [...m, { ...step, text, at: Date.now(), id: i }]);
          if (i === WHATSAPP_JOURNEY.length - 1) setPlaying(false);
        }, t),
      );
    });
  };

  useEffect(() => {
    const run = query.get('run');
    if (query.get('play') && run && run !== lastRun) {
      lastRun = run;
      play();
      // Allows a clean replay if React re-mounts (StrictMode) before the journey ran.
      return () => {
        clear();
        lastRun = '';
      };
    }
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const handedOff = !!ticketId;

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="p-5 xl:p-6 max-w-[1500px] mx-auto">
        <PageHeader
          title="WhatsApp journey"
          subtitle="Customer self-service on WhatsApp, with hand-off to a human that keeps the whole conversation"
          actions={
            <>
              <button className="btn-secondary" onClick={() => { clear(); setMsgs([]); setTicketId(null); setPlaying(false); }}>
                <RotateCcw size={15} /> Reset
              </button>
              <button className="btn-primary" onClick={play} disabled={playing}>
                <Play size={15} /> {playing ? 'Playing…' : 'Play track-order journey'}
              </button>
            </>
          }
        />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
          {/* Agent view */}
          <div className="card overflow-hidden flex flex-col h-[590px]">
            <div className="flex items-center gap-2 px-4 h-12 border-b">
              <MessageCircle size={16} className="text-success" />
              <span className="font-semibold text-[14px]">Agent inbox · eDukaan</span>
              <Chip tone="success" className="ml-2">Live</Chip>
              {ticketId && (
                <button className="btn-primary btn-sm ml-auto" onClick={() => navigate(`/ticket/${ticketId}`)}>
                  Open {ticketId} <ExternalLink size={13} />
                </button>
              )}
            </div>
            <div className="flex-1 min-h-0 grid grid-cols-[250px_minmax(0,1fr)]">
              <div className="border-r overflow-y-auto scroll-thin">
                <AnimatePresence>
                  {msgs.length > 0 && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={cn('px-3 py-3 border-b', handedOff ? 'bg-primary/[0.07]' : 'bg-surface2')}>
                      <div className="flex items-center gap-2">
                        <Avatar name="Gurpreet Singh" size={30} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13.5px] font-semibold flex items-center gap-1.5">
                            Gurpreet Singh {handedOff && <span className="h-2 w-2 rounded-full bg-critical animate-pulse" />}
                          </div>
                          <div className="text-[13px] text-subtle truncate">{msgs[msgs.length - 1].text}</div>
                        </div>
                      </div>
                      <div className="mt-1.5 flex gap-1">
                        {handedOff ? <Chip tone="critical">Needs agent · {ticketId}</Chip> : <Chip tone="primary"><Bot size={11} /> Bot handling</Chip>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {[
                  ['Lakshmi Pillai', 'Invoice copy sent ✓', 'AI resolved'],
                  ['Bikash Das', 'Points balance: 6,320', 'AI resolved'],
                  ['Harish Rathore', 'Thanks, received the part', 'Closed'],
                ].map(([n, m, s]) => (
                  <div key={n} className="px-3 py-3 border-b">
                    <div className="flex items-center gap-2">
                      <Avatar name={n} size={30} />
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-medium">{n}</div>
                        <div className="text-[13px] text-subtle truncate">{m}</div>
                      </div>
                    </div>
                    <div className="mt-1.5"><Chip>{s}</Chip></div>
                  </div>
                ))}
              </div>
              <div ref={agentBody} className="overflow-y-auto scroll-thin p-4 flex flex-col gap-2 bg-canvas">
                {msgs.length === 0 ? (
                  <div className="m-auto text-center text-muted text-[13.5px] max-w-[320px]">
                    <MessageCircle size={28} className="mx-auto text-success mb-2" />
                    Press <span className="font-semibold">Play</span> to watch a customer track an order on WhatsApp. The conversation appears here live, and becomes a ticket the moment they ask for a person.
                  </div>
                ) : (
                  msgs.map((m) =>
                    m.from === 'system' ? (
                      <div key={m.id} className="self-center flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 h-7 text-[13px] font-semibold">
                        <Zap size={12} /> Ticket {ticketId} created · handed to eDukaan desk
                      </div>
                    ) : (
                      <div key={m.id} className={cn('max-w-[80%] rounded-2xl px-3 py-2 text-[13.5px] border', m.from === 'customer' ? 'self-start bg-surface rounded-bl-md' : m.from === 'agent' ? 'self-end bg-primary/10 border-primary/20 rounded-br-md' : 'self-end bg-surface2 rounded-br-md')}>
                        <div className="text-[13px] font-semibold uppercase tracking-wide text-subtle">{m.from === 'customer' ? 'Customer' : m.from === 'agent' ? 'Aditi S. (agent)' : 'Bot'}</div>
                        {m.text}
                        {m.card && (
                          <div className="mt-1.5 rounded-lg border bg-surface p-2 text-[13px]">
                            <div className="font-semibold mono">{m.card.title}</div>
                            {m.card.rows.map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-3"><span className="text-subtle">{k}</span><span className="font-medium">{v}</span></div>
                            ))}
                          </div>
                        )}
                      </div>
                    ),
                  )
                )}
                {typing === 'agent' && <div className="self-end text-[13px] text-subtle">Aditi is typing…</div>}
              </div>
            </div>
          </div>

          {/* Phone */}
          <div className="mx-auto">
            <div className="w-[320px] h-[590px] rounded-[42px] bg-[#111] p-[10px] shadow-pop">
              <div className="w-full h-full rounded-[34px] overflow-hidden flex flex-col bg-[#ECE5DD] dark:bg-[#0b141a] relative">
                <div className="h-7 bg-[#075E54] text-white text-[13px] flex items-center justify-between px-5 shrink-0">
                  <span className="num">{clockTime(Date.now()).replace(' ', '')}</span>
                  <span className="flex items-center gap-1"><Signal size={11} /><Wifi size={11} /><BatteryFull size={13} /></span>
                </div>
                <div className="h-12 bg-[#075E54] text-white flex items-center gap-2 px-2 shrink-0">
                  <ChevronLeft size={20} />
                  <span className="h-8 w-8 rounded-full bg-white text-[#0E7C86] font-bold text-[13px] flex items-center justify-center">Bz</span>
                  <div className="leading-tight flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold truncate flex items-center gap-1">BizSensAi Parts Support <span className="text-[#25D366]">✔</span></div>
                    <div className="text-[13px] text-white/75">{typing && typing !== 'customer' ? 'typing…' : 'Business account'}</div>
                  </div>
                  <Video size={17} />
                  <Phone size={16} className="ml-2" />
                  <MoreVertical size={17} className="ml-1" />
                </div>
                <div ref={phoneBody} className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-1.5" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
                  <div className="self-center text-[13px] bg-[#E1F3FB] text-[#4a5a63] rounded-md px-2 py-0.5 mb-1 dark:bg-[#182229] dark:text-[#8696a0]">Today</div>
                  <AnimatePresence initial={false}>
                    {msgs.map((m) =>
                      m.from === 'system' ? (
                        <motion.div key={m.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="self-center text-center text-[13px] bg-[#FFF3C4] text-[#5b4b00] rounded-md px-2.5 py-1 my-1 max-w-[92%] dark:bg-[#3b3415] dark:text-[#f5e6a8]">
                          {m.text}
                        </motion.div>
                      ) : (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn('max-w-[84%] rounded-lg px-2 py-1 text-[13px] shadow-sm text-[#111b21] dark:text-[#e9edef]', m.from === 'customer' ? 'self-end bg-[#DCF8C6] rounded-tr-none dark:bg-[#005c4b]' : 'self-start bg-white rounded-tl-none dark:bg-[#202c33]')}
                        >
                          {m.from === 'agent' && <div className="text-[13px] font-semibold text-[#0E7C86] dark:text-[#5EEAD4]">Aditi · eDukaan</div>}
                          <div className="whitespace-pre-line">{m.text}</div>
                          {m.card && (
                            <div className="mt-1 rounded-md bg-[#f0f2f5] p-1.5 text-[13px] dark:bg-[#111b21]">
                              <div className="font-semibold">{m.card.title}</div>
                              {m.card.rows.map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-2"><span className="opacity-60">{k}</span><span>{v}</span></div>
                              ))}
                            </div>
                          )}
                          <div className="text-[13px] opacity-50 text-right flex items-center justify-end gap-0.5">
                            {clockTime(m.at)} {m.from === 'customer' && <CheckCheck size={12} className="text-[#34B7F1] opacity-100" />}
                          </div>
                          {m.buttons && (
                            <div className="mt-1 -mx-2 -mb-1 border-t border-black/5 dark:border-white/10">
                              {m.buttons.map((b) => (
                                <div key={b} className="text-center text-[13px] text-[#0b8fd1] dark:text-[#53bdeb] py-1.5 border-b border-black/5 dark:border-white/10 last:border-0">{b}</div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      ),
                    )}
                  </AnimatePresence>
                  {typing && typing !== 'system' && (
                    <div className={cn('rounded-lg px-3 py-2 shadow-sm flex gap-1', typing === 'customer' ? 'self-end bg-[#DCF8C6] dark:bg-[#005c4b]' : 'self-start bg-white dark:bg-[#202c33]')}>
                      {[0, 1, 2].map((d) => (
                        <span key={d} className="h-1.5 w-1.5 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="h-12 flex items-center gap-1.5 px-2 shrink-0">
                  <div className="flex-1 h-9 rounded-full bg-white dark:bg-[#202c33] flex items-center gap-2 px-3 text-[#54656f] dark:text-[#aebac1] text-[13px]">
                    <Smile size={17} /> <span className="flex-1">Message</span> <Paperclip size={16} />
                  </div>
                  <span className="h-9 w-9 rounded-full bg-[#00A884] text-white flex items-center justify-center"><Mic size={16} /></span>
                </div>
              </div>
            </div>
            <p className="text-center text-[13px] text-subtle mt-2">Simulated customer phone · TTSL Smartflo WhatsApp</p>
          </div>
        </div>
      </div>
    </div>
  );
}
