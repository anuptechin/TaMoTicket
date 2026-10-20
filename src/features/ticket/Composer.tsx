import { useEffect, useState } from 'react';
import { Mail, MessageCircle, PhoneOutgoing, StickyNote, Paperclip, Send, Languages, FileText, X, LayoutTemplate } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { TRANSLATIONS } from '../../lib/copilot';
import { cn } from '../../lib/format';
import { Chip } from '../../components/ui';
import type { Customer, Ticket } from '../../types';

type Mode = 'email' | 'whatsapp' | 'call' | 'note';

const TEMPLATES: Record<string, string> = {
  'Acknowledge + timeline': 'Thank you for contacting us. Your request has been logged and our team is working on it. We will update you within 4 working hours.',
  'Request photos': 'To process this quickly, please share photos of the part label and the part on WhatsApp.',
  'Dispatch update': 'Your order has been dispatched. Tracking number and expected delivery date are below.',
  'Closing confirmation': 'We are closing this ticket as resolved. If anything is still pending, just reply and it will reopen automatically.',
};

export function Composer({ ticket, customer, draft, setDraft }: { ticket: Ticket; customer?: Customer; draft: string; setDraft: (s: string) => void }) {
  const store = useStore();
  const [mode, setMode] = useState<Mode>(ticket.channel === 'email' ? 'email' : 'whatsapp');
  const [files, setFiles] = useState<string[]>([]);
  const [translated, setTranslated] = useState<string | null>(null);
  const [tplOpen, setTplOpen] = useState(false);

  useEffect(() => {
    setMode(ticket.channel === 'email' ? 'email' : 'whatsapp');
    setFiles([]);
    setTranslated(null);
  }, [ticket.id, ticket.channel]);

  const me = store.agents.find((a) => a.id === store.session?.agentId);
  const short = me ? `${me.name.split(' ')[0]} ${me.name.split(' ')[1][0]}.` : 'Agent';

  const send = () => {
    if (mode === 'call') {
      store.addInteraction(ticket.id, { type: 'event', at: Date.now(), eventKind: 'status', body: `Outbound call placed to ${customer?.mobile} via TTSL Smartflo by ${short}` });
      store.toast({ tone: 'info', title: `Calling ${customer?.name}`, body: `${customer?.mobile} · via TTSL Smartflo` });
      return;
    }
    if (!draft.trim()) {
      store.toast({ tone: 'warning', title: 'Write a message first', body: 'Or use the suggested reply from the copilot' });
      return;
    }
    const now = Date.now();
    if (mode === 'note') {
      store.addInteraction(ticket.id, { type: 'note', at: now, author: short, body: draft });
      store.toast({ tone: 'success', title: 'Internal note added', body: 'Visible to agents only' });
    } else {
      store.addInteraction(ticket.id, {
        type: mode,
        at: now,
        direction: 'out',
        author: short,
        subject: mode === 'email' ? `Re: ${ticket.subject}` : undefined,
        body: draft,
        media: files[0],
        chip: translated ? `Translated · ${translated}` : undefined,
      });
      if (!ticket.sla.respondedAt) store.updateTicket(ticket.id, { sla: { ...ticket.sla, respondedAt: now } });
      if (ticket.status === 'new') store.setStatus(ticket.id, 'open');
      store.toast({ tone: 'success', title: `Reply sent on ${mode === 'email' ? 'email' : 'WhatsApp'}`, body: `${ticket.id} · ${customer?.name}` });
      store.audit(`Reply sent (${mode})`, ticket.id);
    }
    setDraft('');
    setFiles([]);
    setTranslated(null);
  };

  const modes: { key: Mode; label: string; icon: typeof Mail }[] = [
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { key: 'call', label: 'Call back', icon: PhoneOutgoing },
    { key: 'note', label: 'Internal note', icon: StickyNote },
  ];

  return (
    <div className={cn('card shadow-sm', mode === 'note' && 'border-amber-300/70 bg-note')}>
      <div className="flex items-center gap-1 px-2 pt-2 flex-wrap">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            aria-pressed={mode === m.key}
            className={cn('h-8 px-2.5 rounded-md text-[13px] font-medium flex items-center gap-1.5', mode === m.key ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface2')}
          >
            <m.icon size={14} /> {m.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 relative">
          <button className="btn-ghost btn-sm" onClick={() => setTplOpen((o) => !o)} aria-label="Templates">
            <LayoutTemplate size={15} /> <span className="hidden 2xl:inline">Templates</span>
          </button>
          {tplOpen && (
            <div className="absolute bottom-full right-0 mb-1 z-20 card shadow-pop w-[300px] p-1">
              {Object.entries(TEMPLATES).map(([k, v]) => (
                <button
                  key={k}
                  className="w-full text-left rounded-md px-2.5 py-2 hover:bg-surface2"
                  onClick={() => {
                    setDraft(`Dear ${customer?.name.split(' ')[0]} ji,\n\n${v}\n\nRegards,\n${short}`);
                    setTplOpen(false);
                  }}
                >
                  <div className="text-[13px] font-medium">{k}</div>
                  <div className="text-[13px] text-subtle truncate">{v}</div>
                </button>
              ))}
            </div>
          )}
          <select
            className="h-8 rounded-md border bg-surface px-2 text-[13px] text-muted"
            value=""
            aria-label="Auto-translate"
            onChange={(e) => {
              const lang = e.target.value;
              if (!lang) return;
              setDraft(TRANSLATIONS[lang](draft));
              setTranslated(lang);
            }}
          >
            <option value="">Translate…</option>
            {Object.keys(TRANSLATIONS).map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button className="btn-ghost btn-sm" aria-label="Attach file" onClick={() => setFiles((f) => [...f, ticket.entities?.invoice ? `${ticket.entities.invoice}.pdf` : 'Price_list_Q3.pdf'])}>
            <Paperclip size={15} />
          </button>
        </div>
      </div>
      {mode === 'call' ? (
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="text-[13.5px]">
            Call <span className="font-semibold">{customer?.name}</span> on <span className="mono">{customer?.mobile}</span> through TTSL Smartflo. The call is recorded and transcribed into this ticket.
          </div>
          <button className="btn-primary ml-auto" onClick={send}>
            <PhoneOutgoing size={15} /> Call now
          </button>
        </div>
      ) : (
        <>
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (translated) setTranslated(null);
            }}
            onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && send()}
            rows={3}
            placeholder={mode === 'note' ? 'Add an internal note for your team…' : `Reply to ${customer?.name} by ${mode === 'email' ? 'email' : 'WhatsApp'}…`}
            className="w-full resize-none bg-transparent px-4 py-2.5 text-[13.5px] outline-none placeholder:text-subtle"
            aria-label="Message"
          />
          <div className="flex items-center gap-2 px-3 pb-2.5 flex-wrap">
            {translated && <Chip tone="info"><Languages size={12} /> Auto-translated to {translated} · review before sending</Chip>}
            {files.map((f, i) => (
              <Chip key={i}>
                <FileText size={12} /> {f}
                <button aria-label={`Remove ${f}`} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}><X size={11} /></button>
              </Chip>
            ))}
            <span className="ml-auto text-[13px] text-subtle hidden xl:inline"><span className="kbd">Ctrl</span> + <span className="kbd">Enter</span> to send</span>
            <button className="btn-primary" onClick={send}>
              <Send size={14} /> {mode === 'note' ? 'Add note' : 'Send'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
