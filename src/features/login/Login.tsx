import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Headset, LayoutDashboard, LineChart, Pause, Play } from 'lucide-react';
import type { HeroPhase } from './Hero3D';
import { Logo } from '../../components/ui';
import { useStore } from '../../store/useStore';
import { navigate } from '../../store/router';
import { cn } from '../../lib/format';
import { CLIENT_LABEL, PREPARED_FOR, PRODUCT } from '../../config';
import type { DeskFilter, Role } from '../../types';

const ROLES: { value: Role; label: string; desc: string; icon: typeof Headset }[] = [
  { value: 'agent', label: 'Agent', desc: 'Inbox, tickets, calls and AI copilot', icon: Headset },
  { value: 'supervisor', label: 'Supervisor', desc: 'Command Center, SLAs, routing', icon: LayoutDashboard },
  { value: 'manager', label: 'Manager', desc: 'Reports, insights and outcomes', icon: LineChart },
];

const DESK_OPTS: { value: DeskFilter; label: string }[] = [
  { value: 'all', label: 'All desks' },
  { value: 'helpline', label: 'Parts Helpline' },
  { value: 'edukaan', label: 'eDukaan' },
  { value: 'loyalty', label: 'Loyalty' },
];

// three.js only downloads on this screen.
const Hero3D = lazy(() => import('./Hero3D'));

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

/** If anything in the 3D scene throws, show the static design instead of a blank panel. */
class HeroBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const CAPTIONS: Record<HeroPhase, { eyebrow: string; text: string }> = {
  road: { eyebrow: 'On the road', text: 'Lakhs of vehicles depend on the right part, on time.' },
  parts: { eyebrow: 'Inside every vehicle', text: 'Every part number can become an order, a dispatch, a warranty or a loyalty query.' },
  hub: { eyebrow: 'One hub', text: 'Every one of those queries lands in one ticket and gets answered fast.' },
};

const Glow = () => (
  <div className="absolute inset-0 opacity-[0.5]" style={{ background: 'radial-gradient(900px 500px at 15% 10%, rgba(14,124,134,0.45), transparent 60%), radial-gradient(700px 500px at 90% 100%, rgba(79,70,229,0.28), transparent 60%)' }} />
);

function LoginHero() {
  const [phase, setPhase] = useState<HeroPhase>('road');
  const [paused, setPaused] = useState(false);
  const [use3d] = useState(webglAvailable);
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const h = () => setReduced(mq.matches);
    mq?.addEventListener('change', h);
    return () => mq?.removeEventListener('change', h);
  }, []);
  // ?hero=13 freezes the scene at that second (for reviewing frames).
  const [debugT] = useState(() => {
    const v = new URLSearchParams(window.location.search).get('hero');
    return v == null ? undefined : Number(v);
  });
  const still = reduced || paused || debugT != null;
  const caption = CAPTIONS[debugT == null && still && use3d ? 'parts' : phase];

  return (
    <div className="relative hidden lg:block overflow-hidden bg-[#0B1220] text-white">
      {use3d ? (
        <HeroBoundary fallback={<Glow />}>
          <Suspense fallback={<Glow />}>
            <div className="absolute inset-0" role="img" aria-label="3D animation: trucks and cars on a road; a truck turns transparent and its parts float out with their catalogue numbers">
              <Hero3D onPhase={setPhase} still={still} startAt={debugT} />
            </div>
          </Suspense>
        </HeroBoundary>
      ) : (
        <Glow />
      )}

      {/* legibility gradients */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0B1220] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-[#0B1220] via-[#0B1220]/90 to-transparent" />

      <div className="absolute top-8 left-10 xl:left-14 flex items-center gap-2.5">
        <Logo withText={false} size={34} />
        <div className="leading-tight">
          <div className="text-[17px] font-bold">
            BizSens<span className="text-[#5EEAD4]">Ai</span>
          </div>
          <div className="text-[13px] text-white/70">Support Hub</div>
        </div>
      </div>

      {use3d && !reduced && (
        <button
          onClick={() => setPaused((p) => !p)}
          className="absolute top-8 right-8 h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-[13px] font-medium flex items-center gap-1.5 backdrop-blur-sm"
          aria-label={paused ? 'Play animation' : 'Pause animation'}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />} {paused ? 'Play' : 'Pause'}
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 px-10 xl:px-14 pb-9">
        <div className="h-[60px] max-w-[560px]">
          <AnimatePresence mode="wait">
            <motion.div key={caption.eyebrow} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.45 }}>
              <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#5EEAD4]">{caption.eyebrow}</div>
              <div className="text-[15px] text-white/85 mt-0.5">{caption.text}</div>
            </motion.div>
          </AnimatePresence>
        </div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-3 text-[32px] xl:text-[40px] font-bold leading-[1.1] tracking-tight max-w-[600px] 2xl:max-w-[760px]">
          Every call, chat and email.
          <br />
          One ticket. <span className="text-[#5EEAD4]">Zero missed requests.</span>
        </motion.h1>
        <div className="mt-6 grid grid-cols-3 gap-6 max-w-[560px]">
          {[
            ['< 1 min', 'Acknowledgement'],
            ['> 95%', 'SLA compliance'],
            ['30–40%', 'AI & self-service resolution'],
          ].map(([v, l]) => (
            <div key={l}>
              <div className="text-[22px] font-bold num text-[#5EEAD4]">{v}</div>
              <div className="text-[13px] text-white/70">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const login = useStore((s) => s.login);
  const agents = useStore((s) => s.agents);
  const [role, setRole] = useState<Role>('supervisor');
  const [desk, setDesk] = useState<DeskFilter>('all');

  const enter = () => {
    const pick = (name: string) => agents.find((a) => a.name === name)!.id;
    const agentId =
      role === 'manager'
        ? pick('Sanjay Kapoor')
        : role === 'supervisor'
          ? desk === 'loyalty'
            ? pick('Vivek Chauhan')
            : pick('Anita Rao')
          : desk === 'edukaan'
            ? pick('Aditi Sharma')
            : desk === 'loyalty'
              ? pick('Karan Malhotra')
              : pick('Rohan Mehta');
    login({ role, desk, agentId });
    navigate(role === 'agent' ? '/inbox' : '/command');
  };

  return (
    <div className="h-full grid lg:grid-cols-[1.1fr_1fr] bg-surface overflow-auto">
      <LoginHero />

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[440px]">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>
          <div className="eyebrow">Sign in to workspace</div>
          <h2 className="text-[26px] font-bold tracking-tight mt-1">{CLIENT_LABEL}</h2>
          <p className="text-muted text-[13.5px] mt-1">Single sign-on via Microsoft Entra ID · demo environment</p>

          <div className="mt-7">
            <div className="label mb-2">Role</div>
            <div className="grid gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  aria-pressed={role === r.value}
                  className={cn('flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all', role === r.value ? 'border-primary bg-primary/[0.06] ring-2 ring-primary/15' : 'hover:bg-surface2')}
                >
                  <span className={cn('h-9 w-9 rounded-lg flex items-center justify-center', role === r.value ? 'bg-primary text-white' : 'bg-surface2 text-muted')}>
                    <r.icon size={18} />
                  </span>
                  <span>
                    <span className="block font-semibold text-[14px]">{r.label}</span>
                    <span className="block text-[13px] text-muted">{r.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="label mb-2">Desk</div>
            <div className="grid grid-cols-2 gap-2">
              {DESK_OPTS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDesk(d.value)}
                  aria-pressed={desk === d.value}
                  className={cn('h-10 rounded-lg border text-[13.5px] font-medium transition-all', desk === d.value ? 'border-primary bg-primary/[0.06] text-primary' : 'hover:bg-surface2')}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={enter} className="btn-primary w-full h-11 mt-7 text-[14px]">
            Continue <ArrowRight size={16} />
          </button>
          <div className="mt-8 flex items-center justify-between text-[13px] text-subtle">
            <span>© {new Date().getFullYear()} BizSensAi · {PRODUCT}</span>
            {PREPARED_FOR && <span>Prepared for {PREPARED_FOR}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
