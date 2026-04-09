import { useChatStore, type PanelId } from '../stores/chatStore';

interface NavItem {
  id: PanelId;
  icon: JSX.Element;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'chat',
    label: 'Chat',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    id: 'models',
    label: 'Models',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: 'keys',
    label: 'Keys',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
  },
  {
    id: 'buddies',
    label: 'Buddies',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const activePanel = useChatStore((s) => s.activePanel);
  const setActivePanel = useChatStore((s) => s.setActivePanel);
  const activeBuddy = useChatStore((s) => s.buddies.find((b) => b.id === s.activeBuddyId));

  return (
    <div className="w-12 shrink-0 border-r border-clippy-border flex flex-col items-center py-2 gap-0.5">
      {/* Nav items */}
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => setActivePanel(item.id)}
          className={`
            relative w-9 h-9 flex items-center justify-center rounded-lg transition-all group
            ${activePanel === item.id
              ? 'bg-clippy-accent/15 text-clippy-accent'
              : 'text-clippy-muted hover:text-clippy-text hover:bg-white/5'
            }
          `}
          title={item.label}
        >
          {item.icon}

          {/* Active indicator */}
          {activePanel === item.id && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-clippy-accent rounded-r" />
          )}

          {/* Tooltip */}
          <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-clippy-surface border border-clippy-border
                           text-[10px] text-clippy-text whitespace-nowrap opacity-0 pointer-events-none
                           group-hover:opacity-100 transition-opacity z-50 shadow-lg">
            {item.label}
          </span>
        </button>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Active buddy indicator */}
      <div
        className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer
                   hover:bg-white/5 transition-all group"
        onClick={() => setActivePanel('buddies')}
        title={`Active: ${activeBuddy?.name}`}
      >
        <span className="text-base">{activeBuddy?.emoji || '📎'}</span>

        <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-clippy-surface border border-clippy-border
                         text-[10px] text-clippy-text whitespace-nowrap opacity-0 pointer-events-none
                         group-hover:opacity-100 transition-opacity z-50 shadow-lg">
          {activeBuddy?.name}
        </span>
      </div>
    </div>
  );
}
