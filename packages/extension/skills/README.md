# Blepper Skills

Skills are knowledge packs that give buddies expertise in specific tools and domains. When a skill is attached to a buddy, its content gets injected into the system prompt alongside the screenshot — so the AI has domain-specific knowledge when analysing what's on screen.

## How Skills Work

A skill is just a folder containing markdown files:

```
skills/
├── unreal-engine/
│   ├── skill.json          ← Metadata (name, description, icon)
│   ├── blueprints.md       ← Blueprint knowledge
│   ├── materials.md        ← Material editor knowledge
│   └── niagara.md          ← Niagara VFX knowledge
├── blender/
│   ├── skill.json
│   └── ...
└── custom/                 ← User-uploaded docs go here
```

When you activate a skill on a buddy, the relevant `.md` files are concatenated and prepended to the system prompt. The AI then has that knowledge in context when it looks at your screenshot.

## Built-in Skills

- **Unreal Engine** — Blueprints, Materials, Niagara VFX

## Adding Custom Skills

1. Create a folder in `skills/`
2. Add a `skill.json` with name and description
3. Add `.md` files with your reference material
4. Attach it to a buddy in the Buddies panel

## File Size Considerations

Keep individual `.md` files under ~4000 words each. The total skill content plus screenshot plus conversation history all need to fit in the model's context window. Smaller, focused files work better than one massive dump.
