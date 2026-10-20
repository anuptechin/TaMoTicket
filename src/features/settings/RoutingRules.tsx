import { useState } from 'react';
import { GripVertical, Plus, FlaskConical, ArrowRight, CheckCircle2, CircleSlash } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Chip, PageHeader, PriorityChip, Toggle } from '../../components/ui';
import { DESKS } from '../../lib/meta';
import { cn } from '../../lib/format';
import type { RoutingRule } from '../../types';

interface TestInput {
  channel: string;
  intent: string;
  customerType: string;
  ivr: string;
  text: string;
}

function evaluate(rules: RoutingRule[], t: TestInput) {
  for (const r of rules) {
    if (!r.enabled) continue;
    const ok = r.conditions.every((c) => {
      const v = c.value.toLowerCase();
      switch (c.field) {
        case 'channel':
          return t.channel.toLowerCase() === v;
        case 'intent':
          return c.op === 'in' ? v.split(',').map((x) => x.trim()).includes(t.intent.toLowerCase()) : c.op === 'contains' ? t.intent.toLowerCase().includes(v) : t.intent.toLowerCase() === v;
        case 'customerType':
          return t.customerType.toLowerCase() === v;
        case 'ivr':
          return t.ivr === c.value;
        case 'keyword':
          return v.split(',').some((k) => t.text.toLowerCase().includes(k.trim()));
        default:
          return false;
      }
    });
    if (ok) return r;
  }
  return null;
}

const FIELD_LABEL: Record<string, string> = { channel: 'channel', intent: 'intent', customerType: 'customer type', keyword: 'message', ivr: 'IVR option', desk: 'desk', priority: 'priority' };

export function RoutingRules() {
  const rules = useStore((s) => s.rules);
  const setRules = useStore((s) => s.setRules);
  const toast = useStore((s) => s.toast);
  const audit = useStore((s) => s.audit);
  const [drag, setDrag] = useState<number | null>(null);
  const [test, setTest] = useState<TestInput>({ channel: 'WhatsApp', intent: 'Order status', customerType: 'Retailer', ivr: '', text: 'Where is my order ED-558774? trucks waiting' });
  const [result, setResult] = useState<RoutingRule | null | undefined>(undefined);

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...rules];
    const [r] = next.splice(from, 1);
    next.splice(to, 0, r);
    setRules(next);
  };

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="p-5 xl:p-6 max-w-[1400px] mx-auto">
        <PageHeader
          title="Routing rules"
          subtitle="Rules run top to bottom; the first match decides desk, priority and assignment. Drag to reorder."
          actions={
            <button
              className="btn-primary"
              onClick={() => {
                const r: RoutingRule = { id: `R${Date.now() % 10000}`, name: 'GST invoice requests → Helpline invoice pod', enabled: true, conditions: [{ field: 'keyword', op: 'contains', value: 'gst, invoice copy' }], actions: { desk: 'helpline', priority: 'P3', assign: 'Skill: Invoice & GST' }, hits: 0 };
                setRules([r, ...rules]);
                audit('Routing rule created', r.name);
                toast({ tone: 'success', title: 'Rule added at the top', body: r.name });
              }}
            >
              <Plus size={15} /> New rule
            </button>
          }
        />
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
          <div className="flex flex-col gap-2.5">
            {rules.map((r, i) => (
              <div
                key={r.id}
                draggable
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (drag != null) move(drag, i);
                  setDrag(null);
                }}
                className={cn('card p-3.5 flex gap-3 transition-shadow', drag === i && 'opacity-60', result && result.id === r.id && 'ring-2 ring-success/60 border-success/50', !r.enabled && 'bg-surface2 border-dashed')}
              >
                <button className="cursor-grab text-subtle self-center" aria-label={`Drag ${r.name}`}>
                  <GripVertical size={18} />
                </button>
                <span className="mono text-[13px] text-subtle pt-0.5 w-5">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold">{r.name}</span>
                    <span className="text-[13px] text-subtle num ml-auto">{r.hits.toLocaleString('en-IN')} matches · 30 d</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[13px]">
                    <span className="font-bold text-primary mono">IF</span>
                    {r.conditions.map((c, j) => (
                      <span key={j} className="flex items-center gap-1.5">
                        {j > 0 && <span className="font-bold text-muted mono">AND</span>}
                        <Chip>
                          <span className="text-subtle">{FIELD_LABEL[c.field]}</span> {c.op} <span className="font-semibold text-ink">{c.value}</span>
                        </Chip>
                      </span>
                    ))}
                    <ArrowRight size={14} className="text-subtle mx-1" />
                    <span className="font-bold text-primary mono">THEN</span>
                    {r.actions.desk && <Chip tone="primary">desk = {DESKS[r.actions.desk].label}</Chip>}
                    {r.actions.priority && <PriorityChip p={r.actions.priority} />}
                    {r.actions.assign && <Chip tone="info">assign = {r.actions.assign}</Chip>}
                    {r.actions.tag && <Chip tone="warning">tag = {r.actions.tag}</Chip>}
                  </div>
                </div>
                <Toggle
                  on={r.enabled}
                  label={`Enable ${r.name}`}
                  onChange={(v) => {
                    setRules(rules.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)));
                    toast({ tone: 'success', title: `${v ? 'Enabled' : 'Disabled'}: ${r.name}` });
                  }}
                />
              </div>
            ))}
          </div>

          <div className="card p-4 sticky top-0">
            <div className="flex items-center gap-2 font-semibold text-[14px]"><FlaskConical size={16} className="text-primary" /> Test rule sandbox</div>
            <p className="text-[13px] text-subtle mt-0.5">Simulate an incoming request and see which rule fires.</p>
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <label className="label">Channel
                <select className="input mt-1" value={test.channel} onChange={(e) => setTest({ ...test, channel: e.target.value })}>
                  {['WhatsApp', 'Email', 'Phone', 'Web chat', 'Teams', 'Mobile app'].map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label className="label">Intent
                <select className="input mt-1" value={test.intent} onChange={(e) => setTest({ ...test, intent: e.target.value })}>
                  {['Order status', 'Dispatch delay', 'Duplicate payment', 'Warranty claim', 'Points not credited', 'Price list request'].map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label className="label">Customer type
                <select className="input mt-1" value={test.customerType} onChange={(e) => setTest({ ...test, customerType: e.target.value })}>
                  {['Dealer', 'Retailer', 'Garage', 'Fleet', 'Loyalty member'].map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label className="label">IVR option
                <select className="input mt-1" value={test.ivr} onChange={(e) => setTest({ ...test, ivr: e.target.value })}>
                  <option value="">None</option>
                  {['1', '2', '3', '4'].map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
            </div>
            <label className="label block mt-2.5">Message
              <textarea className="input h-auto py-2 mt-1" rows={2} value={test.text} onChange={(e) => setTest({ ...test, text: e.target.value })} />
            </label>
            <button className="btn-primary w-full mt-3" onClick={() => setResult(evaluate(rules, test))}>
              <FlaskConical size={15} /> Run test
            </button>
            {result !== undefined && (
              <div className={cn('mt-3 rounded-lg p-3 text-[13.5px]', result ? 'bg-success/[0.08] border border-success/30' : 'bg-surface2 border')}>
                {result ? (
                  <>
                    <div className="flex items-center gap-1.5 font-semibold text-success"><CheckCircle2 size={15} /> Matched: {result.name}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {result.actions.desk && <Chip tone="primary">{DESKS[result.actions.desk].label}</Chip>}
                      {result.actions.priority && <PriorityChip p={result.actions.priority} />}
                      {result.actions.assign && <Chip tone="info">{result.actions.assign}</Chip>}
                      {result.actions.tag && <Chip tone="warning">{result.actions.tag}</Chip>}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 text-muted"><CircleSlash size={15} /> No rule matched: falls back to AI classification and the default queue.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
