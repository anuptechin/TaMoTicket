import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { useRoute, navigate } from './store/router';
import { AppShell } from './components/AppShell';
import { CallController, CommandPalette, DemoDirector, GlobalKeys, IncomingCallBar, SlaMonitor, Toasts } from './components/Overlays';
import { Login } from './features/login/Login';
import { CommandCenter } from './features/command/CommandCenter';
import { InboxPage } from './features/inbox/Inbox';
import { TicketWorkspace } from './features/ticket/TicketWorkspace';
import { WhatsAppSimulator } from './features/whatsapp/WhatsAppSimulator';
import { VoiceBot } from './features/voicebot/VoiceBot';
import { EmailDedupe } from './features/email/EmailDedupe';
import { SlaSettings } from './features/settings/SlaSettings';
import { RoutingRules } from './features/settings/RoutingRules';
import { Reports } from './features/reports/Reports';
import { AskData } from './features/ask/AskData';
import { Integrations } from './features/integrations/Integrations';
import { KnowledgeBase } from './features/kb/KnowledgeBase';
import { Wallboard } from './features/wallboard/Wallboard';
import { AuditPage } from './features/audit/Audit';
import { Proactive } from './features/proactive/Proactive';
import { PRODUCT } from './config';

function Page() {
  const { segments } = useRoute();
  const [root, id] = segments;
  switch (root) {
    case 'inbox':
      return <InboxPage />;
    case 'ticket':
      return <TicketWorkspace id={id} />;
    case 'whatsapp':
      return <WhatsAppSimulator />;
    case 'voicebot':
      return <VoiceBot />;
    case 'email':
      return <EmailDedupe />;
    case 'sla':
      return <SlaSettings />;
    case 'routing':
      return <RoutingRules />;
    case 'reports':
      return <Reports />;
    case 'ask':
      return <AskData />;
    case 'integrations':
      return <Integrations />;
    case 'kb':
      return <KnowledgeBase />;
    case 'audit':
      return <AuditPage />;
    case 'proactive':
      return <Proactive />;
    default:
      return <CommandCenter />;
  }
}

export default function App() {
  const session = useStore((s) => s.session);
  const route = useRoute();

  useEffect(() => {
    const titles: Record<string, string> = { command: 'Command Center', inbox: 'Inbox', ticket: route.segments[1] ?? 'Ticket', whatsapp: 'WhatsApp', voicebot: 'Voice bot', email: 'Email', ask: 'Ask your data' };
    const t = titles[route.segments[0]];
    document.title = t ? `${t} · ${PRODUCT}` : PRODUCT;
  }, [route]);

  useEffect(() => {
    if (session && !window.location.hash) navigate(session.role === 'agent' ? '/inbox' : '/command');
  }, [session]);

  if (!session) return <Login />;

  const overlays = (
    <>
      <GlobalKeys />
      <SlaMonitor />
      <CallController />
      <IncomingCallBar />
      <DemoDirector />
      <CommandPalette />
      <Toasts />
    </>
  );

  if (route.segments[0] === 'wallboard')
    return (
      <>
        <Wallboard />
        {overlays}
      </>
    );

  return (
    <>
      <AppShell>
        <Page />
      </AppShell>
      {overlays}
    </>
  );
}
