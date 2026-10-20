import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Headset, LayoutDashboard, LineChart, Phone, Mail, MessageCircle, Bot, ShieldCheck } from 'lucide-react';
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
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0B1220] text-white p-10 xl:p-14">
        <div className="absolute inset-0 opacity-[0.5]" style={{ background: 'radial-gradient(900px 500px at 15% 10%, rgba(14,124,134,0.45), transparent 60%), radial-gradient(700px 500px at 90% 100%, rgba(79,70,229,0.28), transparent 60%)' }} />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <Logo withText={false} size={34} />
            <div className="leading-tight">
              <div className="text-[17px] font-bold">
                BizSens<span className="text-[#5EEAD4]">Ai</span>
              </div>
              <div className="text-[13px] text-white/60">Support Hub</div>
            </div>
          </div>
        </div>
        <div className="relative max-w-[560px]">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-[38px] xl:text-[44px] font-bold leading-[1.1] tracking-tight">
            Every call, chat and email.
            <br />
            One ticket. <span className="text-[#5EEAD4]">Zero missed requests.</span>
          </motion.h1>
          <p className="mt-4 text-white/70 text-[15px] max-w-[480px]">
            One AI-first hub for the Parts Helpline, eDukaan and Loyalty desks, with omnichannel capture, SLA control and an AI copilot for every agent.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {[
              [Phone, 'Calls & IVR'],
              [MessageCircle, 'WhatsApp'],
              [Mail, 'Email'],
              [Bot, 'Indian-language voice bot'],
              [ShieldCheck, 'SLA & escalations'],
            ].map(([Icon, l]) => {
              const I = Icon as typeof Phone;
              return (
                <span key={l as string} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 h-8 text-[13px] text-white/85">
                  <I size={14} /> {l as string}
                </span>
              );
            })}
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-6 max-w-[560px]">
          {[
            ['< 1 min', 'Acknowledgement'],
            ['> 95%', 'SLA compliance'],
            ['30–40%', 'AI & self-service resolution'],
          ].map(([v, l]) => (
            <div key={l}>
              <div className="text-[24px] font-bold num text-[#5EEAD4]">{v}</div>
              <div className="text-[13px] text-white/60">{l}</div>
            </div>
          ))}
        </div>
      </div>

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
