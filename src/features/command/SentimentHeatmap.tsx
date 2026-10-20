import { useMemo, useState } from 'react';
import { Smile } from 'lucide-react';
import { inboxLink, navigate } from '../../store/router';
import { Tabs } from '../../components/ui';
import { sentimentHeatmap, type HeatCell } from '../../lib/metrics';
import { DESKS, ink } from '../../lib/meta';
import { cn } from '../../lib/format';
import type { Ticket } from '../../types';
import { Panel } from './CommandCenter';

type Mode = 'sentiment' | 'effort';

const SCALE = ['#16A34A', '#CA8A04', '#D97706', '#DC2626'];

/** 0 = good … 3 = bad */
function band(cell: { negative: number; ces: number }, mode: Mode) {
  if (mode === 'sentiment') return cell.negative < 0.15 ? 0 : cell.negative < 0.3 ? 1 : cell.negative < 0.45 ? 2 : 3;
  return cell.ces >= 6 ? 0 : cell.ces >= 5.6 ? 1 : cell.ces >= 5.2 ? 2 : 3;
}

const label = (c: { negative: number; ces: number }, mode: Mode) => (mode === 'sentiment' ? `${Math.round(c.negative * 100)}%` : c.ces.toFixed(1));

export function SentimentHeatmap({ tickets }: { tickets: Ticket[] }) {
  const [mode, setMode] = useState<Mode>('sentiment');
  const { cats, cells, deskCes } = useMemo(() => sentimentHeatmap(tickets), [tickets]);
  const cell = (desk: string, category: string) => cells.find((c) => c.desk === desk && c.category === category) as HeatCell;

  return (
    <Panel
      title="Customer sentiment & effort · desk × category"
      icon={<Smile size={16} />}
      className="mt-3"
      action={
        <Tabs<Mode>
          value={mode}
          onChange={setMode}
          items={[
            { value: 'sentiment', label: 'Negative sentiment' },
            { value: 'effort', label: 'Customer effort (CES)' },
          ]}
        />
      }
    >
      <div className="p-4 overflow-x-auto scroll-thin">
        <div className="grid gap-1.5 min-w-[760px]" style={{ gridTemplateColumns: `120px repeat(${cats.length}, minmax(64px, 1fr)) 96px` }}>
          <div />
          {cats.map((c) => (
            <div key={c} className="text-[13px] text-muted font-medium leading-tight text-center px-0.5 self-end pb-1">{c}</div>
          ))}
          <div className="text-[13px] text-muted font-semibold text-center self-end pb-1">Desk overall</div>

          {deskCes.map((d) => (
            <div key={d.desk} className="contents">
              <div className="flex items-center gap-2 text-[13.5px] font-medium">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DESKS[d.desk].color }} />
                {DESKS[d.desk].short}
              </div>
              {cats.map((c) => {
                const x = cell(d.desk, c);
                if (!x || x.n === 0)
                  return (
                    <div key={c} className="h-12 rounded-lg border border-dashed flex items-center justify-center text-[13px] text-subtle" aria-label={`${DESKS[d.desk].label}, ${c}: no tickets`}>
                      –
                    </div>
                  );
                const col = SCALE[band(x, mode)];
                return (
                  <button
                    key={c}
                    onClick={() => navigate(inboxLink({ desk: d.desk, category: c, view: 'all' }))}
                    title={`${DESKS[d.desk].label} · ${c}: ${Math.round(x.negative * 100)}% negative, CES ${x.ces.toFixed(1)}/7, ${x.n} tickets`}
                    className="h-12 rounded-lg border flex flex-col items-center justify-center transition-transform hover:scale-[1.04] hover:shadow-sm"
                    style={{ background: `${col}24`, borderColor: `${col}55` }}
                  >
                    <span className="text-[14px] font-bold num leading-none" style={{ color: ink(col) }}>{label(x, mode)}</span>
                    <span className="text-[13px] text-muted num leading-tight">n={x.n}</span>
                  </button>
                );
              })}
              <div
                className="h-12 rounded-lg flex flex-col items-center justify-center border-2"
                style={{ borderColor: `${SCALE[band(d, mode)]}88`, background: `${SCALE[band(d, mode)]}14` }}
              >
                <span className="text-[15px] font-bold num leading-none" style={{ color: ink(SCALE[band(d, mode)]) }}>{label(d, mode)}</span>
                <span className="text-[13px] text-muted leading-tight">{mode === 'sentiment' ? 'negative' : 'of 7'}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 flex-wrap text-[13px] text-muted">
          <span>{mode === 'sentiment' ? 'Share of tickets with negative sentiment (AI-detected from calls, chats and emails)' : 'Customer effort score: 7 = effortless; fewer contacts, transfers and reopens score higher'}</span>
          <span className="ml-auto flex items-center gap-1.5">
            {(mode === 'sentiment' ? ['< 15%', '15–30%', '30–45%', '≥ 45%'] : ['≥ 6.0', '5.6–6.0', '5.2–5.6', '< 5.2']).map((l, i) => (
              <span key={l} className="flex items-center gap-1">
                <span className={cn('h-3 w-5 rounded border')} style={{ background: `${SCALE[i]}24`, borderColor: `${SCALE[i]}55` }} />
                {l}
              </span>
            ))}
          </span>
        </div>
      </div>
    </Panel>
  );
}
