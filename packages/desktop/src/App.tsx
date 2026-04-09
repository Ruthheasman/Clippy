import { useChatStore } from './stores/chatStore';
import { Sidebar } from './components/Sidebar';
import { TitleBar } from './components/TitleBar';
import { ChatPanel } from './components/ChatPanel';
import { ModelsPanel } from './components/ModelsPanel';
import { KeysPanel } from './components/KeysPanel';
import { BuddiesPanel } from './components/BuddiesPanel';
import { SettingsPanel } from './components/SettingsPanel';

export default function App() {
  const activePanel = useChatStore((s) => s.activePanel);

  const renderPanel = () => {
    switch (activePanel) {
      case 'chat': return <ChatPanel />;
      case 'models': return <ModelsPanel />;
      case 'keys': return <KeysPanel />;
      case 'buddies': return <BuddiesPanel />;
      case 'settings': return <SettingsPanel />;
      default: return <ChatPanel />;
    }
  };

  return (
    <div className="h-full glass-panel flex flex-col">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {renderPanel()}
        </div>
      </div>
    </div>
  );
}
