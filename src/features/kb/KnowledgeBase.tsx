import { useMemo, useState } from 'react';
import { BookOpen, Search, Sparkles, Check, Eye, ThumbsUp, PenLine } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useRoute, navigate } from '../../store/router';
import { Chip, EmptyState, PageHeader } from '../../components/ui';
import { cn, timeAgo } from '../../lib/format';
import { DESKS } from '../../lib/meta';
import type { Desk } from '../../types';

export function KnowledgeBase() {
  const kb = useStore((s) => s.kb);
  const approve = useStore((s) => s.approveKb);
  const toast = useStore((s) => s.toast);
  const { query } = useRoute();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const selectedId = query.get('article') ?? kb.find((k) => k.draft)?.id ?? kb[0]?.id;
  const selected = kb.find((k) => k.id === selectedId);
  const cats = useMemo(() => [...new Set(kb.map((k) => k.category))].sort(), [kb]);
  const drafts = kb.filter((k) => k.draft);
  const list = kb.filter((k) => !k.draft && (!cat || k.category === cat) && `${k.title} ${k.summary}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 xl:px-6 pt-5">
        <PageHeader title="Knowledge base" subtitle={`${kb.filter((k) => !k.draft).length} published articles power self-service, the bots and the agent copilot`} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)] gap-4 px-5 xl:px-6 pb-5">
        <div className="card flex flex-col min-h-0">
          {drafts.length > 0 && (
            <div className="p-3 border-b bg-gradient-to-br from-primary/[0.07] to-transparent">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-primary"><Sparkles size={13} /> AI-drafted from resolved tickets</div>
              {drafts.map((d) => (
                <button key={d.id} onClick={() => navigate(`/kb?article=${d.id}`)} className={cn('w-full text-left mt-2 rounded-lg border bg-surface p-2.5 hover:border-primary/40', selectedId === d.id && 'border-primary ring-2 ring-primary/15')}>
                  <div className="text-[13px] text-muted">Suggested from {d.sourceCount} resolved tickets</div>
                  <div className="text-[13.5px] font-semibold leading-snug">{d.title}</div>
                </button>
              ))}
            </div>
          )}
          <div className="p-3 border-b flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input className="input pl-8" placeholder="Search articles" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search articles" />
            </div>
            <select className="input w-[150px]" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin">
            {list.map((a) => (
              <button key={a.id} onClick={() => navigate(`/kb?article=${a.id}`)} className={cn('w-full text-left px-4 py-2.5 border-b hover:bg-surface2', selectedId === a.id && 'bg-primary/[0.06]')}>
                <div className="text-[13.5px] font-medium leading-snug">{a.title}</div>
                <div className="text-[13px] text-subtle mt-0.5 flex gap-2">
                  <span className="mono">{a.id}</span> · {a.category} · <Eye size={12} className="mt-0.5" /> {a.views}
                </div>
              </button>
            ))}
            {list.length === 0 && <EmptyState icon={<BookOpen size={20} />} title="No articles found" body="Try another search, or let the AI draft one from resolved tickets." />}
          </div>
        </div>

        <div className="card overflow-y-auto scroll-thin">
          {selected ? (
            <article className="p-6 max-w-[760px]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="mono text-[13px] text-subtle">{selected.id}</span>
                <Chip>{selected.category}</Chip>
                <Chip tone="primary">{selected.desk === 'all' ? 'All desks' : DESKS[selected.desk as Desk].label}</Chip>
                {selected.draft ? <Chip tone="warning"><Sparkles size={11} /> AI draft · needs approval</Chip> : <Chip tone="success"><Check size={11} /> Published</Chip>}
              </div>
              <h2 className="text-[22px] font-bold tracking-tight mt-2">{selected.title}</h2>
              <div className="text-[13px] text-subtle mt-1">Updated {timeAgo(selected.updated)}{!selected.draft && ` · ${selected.views} views · ${selected.helpful}% helpful`}</div>
              <p className="text-[14.5px] leading-relaxed mt-4">{selected.summary}</p>
              <h3 className="font-semibold mt-5 mb-2">Steps</h3>
              <ol className="flex flex-col gap-2">
                {selected.steps.map((s, i) => (
                  <li key={s} className="flex gap-3 text-[14px]">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[13px] font-bold flex items-center justify-center shrink-0 num">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
              {selected.draft ? (
                <div className="mt-6 rounded-xl border border-primary/25 bg-primary/[0.05] p-4">
                  <div className="text-[13.5px]">
                    <span className="font-semibold">Why this was suggested:</span> {selected.sourceCount} tickets in the last 30 days were resolved with the same steps. Publishing it lets the WhatsApp bot and voice bot answer this on their own.
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      className="btn-primary"
                      onClick={() => {
                        approve(selected.id);
                        toast({ tone: 'success', title: 'Article approved and published', body: 'Now available to bots, self-service and the copilot' });
                      }}
                    >
                      <Check size={15} /> Approve & publish
                    </button>
                    <button className="btn-secondary" onClick={() => toast({ tone: 'info', title: 'Editor opened', body: 'Inline editing is enabled for knowledge managers' })}>
                      <PenLine size={15} /> Edit draft
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex items-center gap-2 text-[13px] text-muted">
                  Was this helpful?
                  <button className="btn-secondary btn-sm" onClick={() => toast({ tone: 'success', title: 'Thanks for the feedback' })}><ThumbsUp size={14} /> Yes</button>
                </div>
              )}
            </article>
          ) : (
            <EmptyState icon={<BookOpen size={20} />} title="Select an article" body="Articles are used by bots, self-service and the agent copilot." />
          )}
        </div>
      </div>
    </div>
  );
}
