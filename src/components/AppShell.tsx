import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Inbox,
  MessageCircle,
  Bot,
  Mail,
  Sparkles,
  FileBarChart,
  BookOpen,
  GitBranch,
  Timer,
  Plug,
  ShieldCheck,
  Tv,
  BellRing,
  Search,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  RotateCcw,
  Clapperboard,
  Check,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, Logo, Tip } from './ui';
import { useStore } from '../store/useStore';
import { navigate, useRoute } from '../store/router';
import { useNow } from '../store/clock';
import { cn, timeAgo } from '../lib/format';
import { AGENT_STATUS, DESKS } from '../lib/meta';
import { CLIENT_LABEL, PRODUCT } from '../config';
import { resetDemo } from '../services/scenarios';
import type { AgentStatus } from '../types';

const NAV = [
  { to: '/command', label: 'Command', icon: LayoutDashboard, roles: ['supervisor', 'manager', 'agent'] },
  { to: '/inbox', label: 'Inbox', icon: Inbox, roles: ['supervisor', 'manager', 'agent'] },
  { to: '/whatsapp', label: 'WhatsApp', icon: MessageCircle, roles: ['supervisor', 'manager', 'agent'] },
  { to: '/voicebot', label: 'Voice bot', icon: Bot, roles: ['supervisor', 'manager', 'agent'] },
  { to: '/email', label: 'Email', icon: Mail, roles: ['supervisor', 'manager', 'agent'] },
  { to: '/proactive', label: 'Proactive', icon: BellRing, roles: ['supervisor', 'manager'] },
  { to: '/ask', label: 'Ask data', icon: Sparkles, roles: ['supervisor', 'manager'] },
  { to: '/reports', label: 'Reports', icon: FileBarChart, roles: ['supervisor', 'manager'] },
  { to: '/kb', label: 'Knowledge', icon: BookOpen, roles: ['supervisor', 'manager', 'agent'] },
  { to: '/routing', label: 'Routing', icon: GitBranch, roles: ['supervisor', 'manager'] },
  { to: '/sla', label: 'SLA', icon: Timer, roles: ['supervisor', 'manager'] },
  { to: '/integrations', label: 'Integrations', icon: Plug, roles: ['supervisor', 'manager'] },
  { to: '/audit', label: 'Audit', icon: ShieldCheck, roles: ['supervisor', 'manager'] },
  { to: '/wallboard', label: 'Wallboard', icon: Tv, roles: ['supervisor', 'manager'] },
];

function Sidebar() {
  const route = useRoute();
  const role = useStore((s) => s.session?.role ?? 'agent');
  const inboxCount = useStore((s) => s.tickets.filter((t) => t.status === 'new').length);
  return (
    <nav aria-label="Main" className="no-print w-[88px] shrink-0 border-r bg-surface flex flex-col">
      <button onClick={() => navigate('/command')} className="h-14 flex items-center justify-center border-b" aria-label={`${PRODUCT} home`}>
        <Logo withText={false} size={30} />
      </button>
      <div className="flex-1 overflow-y-auto scroll-thin py-1.5 flex flex-col gap-0.5 px-1.5">
        {NAV.filter((n) => n.roles.includes(role)).map((n) => {
          const active = route.path.startsWith(n.to) || (n.to === '/inbox' && route.path.startsWith('/ticket'));
          const Icon = n.icon;
          return (
            <button
              key={n.to}
              onClick={() => navigate(n.to)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 rounded-lg h-[46px] text-[13px] font-medium transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface2 hover:text-ink',
              )}
            >
              {active && <span className="absolute left-[-6px] top-2 bottom-2 w-[3px] rounded-r bg-primary" />}
              <Icon size={18} strokeWidth={2} />
              <span className="leading-none">{n.label}</span>
              {n.to === '/inbox' && inboxCount > 0 && (
                <span className="absolute top-1 right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-critical text-white text-[13px] font-bold leading-[18px] num">{inboxCount}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function useClickOutside(ref: React.RefObject<HTMLElement>, fn: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && fn();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, fn]);
}

function Popover({ trigger, children, align = 'right', width = 300 }: { trigger: (open: boolean, toggle: () => void) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      {trigger(open, () => setOpen((o) => !o))}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className={cn('absolute top-full mt-2 z-40 card shadow-pop', align === 'right' ? 'right-0' : 'left-0')}
            style={{ width }}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Clock() {
  const now = useNow();
  const d = new Date(now);
  return (
    <div className="hidden lg:flex flex-col items-end leading-tight px-2">
      <span className="mono text-[13px] font-semibold">{d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
      <span className="text-[13px] text-subtle">{d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · IST</span>
    </div>
  );
}

function TopBar() {
  const s = useStore();
  const me = s.agents.find((a) => a.id === s.session?.agentId);
  const unread = s.notifications.filter((n) => !n.read).length;
  const deskLabel = s.session?.desk === 'all' ? 'All desks' : DESKS[s.session!.desk as keyof typeof DESKS].label;
  const now = useNow();
  return (
    <header className="no-print h-14 shrink-0 border-b bg-surface flex items-center gap-3 px-4">
      <div className="flex items-center gap-2 min-w-0">
        <div className="leading-tight min-w-0">
          <div className="text-[13px] text-subtle">Workspace</div>
          <div className="text-[14px] font-semibold truncate">
            {CLIENT_LABEL} <span className="text-subtle font-normal">· {deskLabel}</span>
          </div>
        </div>
      </div>

      <button onClick={() => s.setPalette(true)} className="ml-2 flex-1 max-w-[440px] h-9 rounded-lg border bg-surface2 flex items-center gap-2 px-3 text-[13px] text-subtle hover:border-primary/40 transition-colors" aria-label="Search tickets, customers and actions">
        <Search size={15} />
        <span className="truncate">Search tickets, customers, part numbers…</span>
        <span className="ml-auto kbd">Ctrl K</span>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <Clock />
        <Popover
          width={190}
          trigger={(_, toggle) => (
            <button onClick={toggle} className="btn-ghost btn-sm gap-2" aria-label="Agent status">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: AGENT_STATUS[s.myStatus].color }} />
              <span className="hidden xl:inline text-ink">{AGENT_STATUS[s.myStatus].label}</span>
              <ChevronDown size={14} />
            </button>
          )}
        >
          {(close) => (
            <div className="p-1">
              {(['available', 'busy', 'away'] as AgentStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    s.setMyStatus(st);
                    s.toast({ tone: 'info', title: `Status set to ${AGENT_STATUS[st].label}` });
                    close();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 h-9 rounded-md hover:bg-surface2 text-[13px]"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: AGENT_STATUS[st].color }} />
                  {AGENT_STATUS[st].label}
                  {s.myStatus === st && <Check size={14} className="ml-auto text-primary" />}
                </button>
              ))}
            </div>
          )}
        </Popover>

        <Popover
          width={360}
          trigger={(_, toggle) => (
            <button onClick={toggle} className="btn-ghost btn-sm relative" aria-label={`Notifications, ${unread} unread`}>
              <Bell size={17} />
              {unread > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-critical text-white text-[13px] font-bold leading-4 num">{unread}</span>}
            </button>
          )}
        >
          {(close) => (
            <div>
              <div className="flex items-center justify-between px-4 h-11 border-b">
                <span className="font-semibold text-[14px]">Notifications</span>
                <button className="text-[13px] text-primary font-medium" onClick={() => s.markAllRead()}>
                  Mark all read
                </button>
              </div>
              <div className="max-h-[360px] overflow-y-auto scroll-thin">
                {s.notifications.slice(0, 12).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (n.ticketId) navigate(`/ticket/${n.ticketId}`);
                      close();
                    }}
                    className={cn('w-full text-left px-4 py-3 border-b last:border-0 hover:bg-surface2 flex gap-3', !n.read && 'bg-primary/[0.04]')}
                  >
                    <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: { info: '#2563EB', warning: '#D97706', critical: '#DC2626', success: '#16A34A' }[n.tone] }} />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold">{n.title}</span>
                      <span className="block text-[13px] text-muted line-clamp-2">{n.body}</span>
                      <span className="block text-[13px] text-subtle mt-0.5">{timeAgo(n.at, now)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Popover>

        <Tip label={s.theme === 'dark' ? 'Light mode' : 'Dark mode'} side="bottom">
          <button className="btn-ghost btn-sm" onClick={() => s.setTheme(s.theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            {s.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </Tip>

        <Popover
          width={240}
          trigger={(_, toggle) => (
            <button onClick={toggle} className="ml-1 flex items-center gap-2 rounded-lg pl-1 pr-2 h-9 hover:bg-surface2" aria-label="Account menu">
              <span className="relative">
                <Avatar agent={me} size={30} />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface" style={{ background: AGENT_STATUS[s.myStatus].color }} />
              </span>
              <span className="hidden xl:block text-left leading-tight">
                <span className="block text-[13px] font-semibold">{me?.name}</span>
                <span className="block text-[13px] text-subtle capitalize">{s.session?.role}</span>
              </span>
            </button>
          )}
        >
          {(close) => (
            <div className="p-1">
              <div className="px-3 py-2 border-b mb-1">
                <div className="text-[13px] font-semibold">{me?.name}</div>
                <div className="text-[13px] text-subtle">{me?.title}</div>
              </div>
              <button
                className="w-full flex items-center gap-2 px-2.5 h-9 rounded-md hover:bg-surface2 text-[13px]"
                onClick={() => {
                  s.setDirector(true);
                  close();
                }}
              >
                <Clapperboard size={15} /> Demo Director <span className="kbd ml-auto">Shift D</span>
              </button>
              <button
                className="w-full flex items-center gap-2 px-2.5 h-9 rounded-md hover:bg-surface2 text-[13px]"
                onClick={() => {
                  resetDemo();
                  close();
                }}
              >
                <RotateCcw size={15} /> Reset demo data
              </button>
              <button
                className="w-full flex items-center gap-2 px-2.5 h-9 rounded-md hover:bg-surface2 text-[13px] text-critical"
                onClick={() => {
                  s.logout();
                  close();
                }}
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </Popover>
      </div>
    </header>
  );
}

function Footer() {
  const setDirector = useStore((s) => s.setDirector);
  return (
    <footer className="no-print h-7 shrink-0 border-t bg-surface flex items-center justify-between px-4 text-[13px] text-subtle">
      <span>
        {PRODUCT} · by BizSensAi · {CLIENT_LABEL}
      </span>
      <span className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> All systems connected
        </span>
        <button onClick={() => setDirector(true)} className="text-subtle hover:text-ink flex items-center gap-1" aria-label="Open Demo Director">
          <Clapperboard size={12} /> v1.0
        </button>
      </span>
    </footer>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-full flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
