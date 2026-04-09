import { create } from 'zustand';
import type { LLMProvider } from '../../electron/llm/types';

export type PanelId = 'chat' | 'models' | 'keys' | 'buddies' | 'settings';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  screenshot?: string;
  buddyId?: string;
}

export interface Buddy {
  id: string;
  name: string;
  emoji: string;
  description: string;
  systemPrompt: string;
  provider?: LLMProvider;
  model?: string;
  active: boolean;
}

const DEFAULT_BUDDIES: Buddy[] = [
  {
    id: 'clippy',
    name: 'Clippy',
    emoji: '📎',
    description: 'Your all-purpose screen companion',
    systemPrompt: '',
    active: true,
  },
  {
    id: 'code-reviewer',
    name: 'Nitpick',
    emoji: '🔍',
    description: 'Opinionated code reviewer. Will roast your spaghetti.',
    systemPrompt: `You are Nitpick, a brutally honest but constructive code reviewer. You can see the user's screen. When reviewing code:
- Point at specific lines with issues using [POINT:x,y:label]
- Be direct about problems but always suggest fixes
- Highlight anti-patterns and performance issues
- Praise genuinely good code (but sparingly — they'll value it more)
- Use [HIGHLIGHT:x,y,w,h:label] to mark regions of concern
Keep it concise. No fluff. Code quality matters.`,
    active: false,
  },
  {
    id: 'design-critic',
    name: 'Pixel',
    emoji: '🎨',
    description: 'UI/UX design critic with strong opinions on spacing.',
    systemPrompt: `You are Pixel, a design-obsessed UI critic. You can see the user's screen. When reviewing interfaces:
- Point at alignment issues, spacing problems, colour clashes
- Comment on typography choices, hierarchy, and readability
- Suggest specific improvements with pixel-level precision
- Use [HIGHLIGHT:x,y,w,h:label] to mark areas that need work
- Reference design principles (proximity, contrast, repetition, alignment)
You care deeply about craft. Mediocre design physically hurts you.`,
    active: false,
  },
  {
    id: 'tutor',
    name: 'Prof',
    emoji: '🎓',
    description: 'Patient teacher. Points at things while explaining concepts.',
    systemPrompt: `You are Prof, a patient and encouraging tutor. You can see the user's screen. When teaching:
- Use [POINT:x,y:label] extensively to guide their eyes
- Break complex concepts into small steps
- Use analogies and real-world examples
- Ask questions to check understanding
- Celebrate progress, no matter how small
- Use [HIGHLIGHT:x,y,w,h:label] to focus attention on relevant areas
You make people feel smart, not stupid. That's your superpower.`,
    active: false,
  },
];

interface ChatState {
  activePanel: PanelId;
  setActivePanel: (panel: PanelId) => void;

  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;

  provider: LLMProvider;
  model: string;
  autoScreenshot: boolean;

  buddies: Buddy[];
  activeBuddyId: string;

  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setStreaming: (streaming: boolean) => void;
  appendStreamContent: (text: string) => void;
  clearStreamContent: () => void;
  finaliseAssistantMessage: () => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;

  setProvider: (provider: LLMProvider) => void;
  setModel: (model: string) => void;
  setAutoScreenshot: (auto: boolean) => void;

  setActiveBuddy: (id: string) => void;
  addBuddy: (buddy: Omit<Buddy, 'id'>) => void;
  updateBuddy: (id: string, updates: Partial<Buddy>) => void;
  removeBuddy: (id: string) => void;
}

let messageCounter = 0;
let buddyCounter = 0;

export const useChatStore = create<ChatState>((set, get) => ({
  activePanel: 'chat',
  setActivePanel: (activePanel) => set({ activePanel }),

  messages: [],
  isStreaming: false,
  streamingContent: '',
  error: null,

  provider: 'claude',
  model: 'claude-sonnet-4-20250514',
  autoScreenshot: true,

  buddies: DEFAULT_BUDDIES,
  activeBuddyId: 'clippy',

  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...msg,
          id: `msg-${++messageCounter}`,
          timestamp: Date.now(),
          buddyId: state.activeBuddyId,
        },
      ],
    })),

  setStreaming: (isStreaming) => set({ isStreaming }),

  appendStreamContent: (text) =>
    set((state) => ({
      streamingContent: state.streamingContent + text,
    })),

  clearStreamContent: () => set({ streamingContent: '' }),

  finaliseAssistantMessage: () => {
    const { streamingContent, activeBuddyId } = get();
    if (streamingContent.trim()) {
      const cleanContent = streamingContent
        .replace(/\[POINT:\d+,\d+:[^\]]*\]/g, '')
        .replace(/\[HIGHLIGHT:\d+,\d+,\d+,\d+:[^\]]*\]/g, '')
        .replace(/\[ARROW:\d+,\d+,\d+,\d+:[^\]]*\]/g, '')
        .replace(/\[CIRCLE:\d+,\d+,\d+:[^\]]*\]/g, '')
        .trim();

      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: `msg-${++messageCounter}`,
            role: 'assistant',
            content: cleanContent,
            timestamp: Date.now(),
            buddyId: activeBuddyId,
          },
        ],
        streamingContent: '',
        isStreaming: false,
      }));
    }
  },

  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [], streamingContent: '' }),

  setProvider: (provider) => set({ provider }),
  setModel: (model) => set({ model }),
  setAutoScreenshot: (autoScreenshot) => set({ autoScreenshot }),

  setActiveBuddy: (id) => {
    set((state) => ({
      activeBuddyId: id,
      buddies: state.buddies.map((b) => ({ ...b, active: b.id === id })),
    }));
  },

  addBuddy: (buddy) =>
    set((state) => ({
      buddies: [
        ...state.buddies,
        { ...buddy, id: `buddy-${++buddyCounter}` },
      ],
    })),

  updateBuddy: (id, updates) =>
    set((state) => ({
      buddies: state.buddies.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  removeBuddy: (id) =>
    set((state) => ({
      buddies: state.buddies.filter((b) => b.id !== id),
      activeBuddyId: state.activeBuddyId === id ? 'clippy' : state.activeBuddyId,
    })),
}));
