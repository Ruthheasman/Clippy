/**
 * Blepper Skills System
 *
 * Skills are knowledge packs that get injected into a buddy's context.
 * They contain reference material, best practices, common patterns,
 * and troubleshooting guides for specific tools/domains.
 *
 * Architecture:
 * - Built-in skill packs ship with Blepper (e.g. Unreal, Blender)
 * - Custom skills can be added by uploading text/markdown/PDF
 * - Skills attach to buddies — each buddy can have multiple skills
 * - Skill content is prepended to the system prompt before the LLM call
 * - Skills are chunked to stay within token limits
 */

// ── Skill Types ──────────────────────────────────────────

const SKILLS = {};

/**
 * Register a skill pack
 */
function registerSkill(skill) {
  SKILLS[skill.id] = skill;
}

/**
 * Get all registered skills
 */
function getAllSkills() {
  return Object.values(SKILLS);
}

/**
 * Get skills by IDs
 */
function getSkills(ids) {
  return ids.map(id => SKILLS[id]).filter(Boolean);
}

/**
 * Build the skill context string to inject into the system prompt.
 * Keeps total under maxTokens (rough estimate: 4 chars ≈ 1 token)
 */
function buildSkillContext(skillIds, maxChars = 12000) {
  const skills = getSkills(skillIds);
  if (!skills.length) return '';

  let context = '\n\n--- SKILL KNOWLEDGE ---\n';
  let remaining = maxChars;

  for (const skill of skills) {
    const header = `\n## ${skill.name}\n`;
    if (remaining < header.length + 100) break;

    context += header;
    remaining -= header.length;

    for (const section of skill.sections) {
      const block = `\n### ${section.title}\n${section.content}\n`;
      if (block.length > remaining) {
        // Truncate this section to fit
        const truncated = block.slice(0, remaining - 20) + '\n[truncated]\n';
        context += truncated;
        remaining = 0;
        break;
      }
      context += block;
      remaining -= block.length;
    }

    if (remaining <= 0) break;
  }

  context += '\n--- END SKILL KNOWLEDGE ---\n';
  return context;
}

// ══════════════════════════════════════════════════════════
// BUILT-IN SKILL PACK: UNREAL ENGINE 5
// Focus: Blueprints, Materials, Niagara
// ══════════════════════════════════════════════════════════

registerSkill({
  id: 'unreal-engine',
  name: 'Unreal Engine 5',
  emoji: '🎮',
  description: 'Blueprints, Materials, Niagara VFX — best practices, common patterns, troubleshooting',
  category: 'built-in',
  sections: [

    // ── BLUEPRINTS ─────────────────────────────────────

    {
      title: 'Blueprint Architecture & Best Practices',
      content: `REFERENCE CHAINS: The #1 Blueprint performance killer. When BP_A references BP_B (via cast, variable type, or direct inheritance), UE loads BP_B and ALL its dependencies into memory. If your Player Blueprint references every game system directly, you load the entire game into memory on startup.

FIX: Use soft references for heavy assets. Use Blueprint Interfaces instead of direct casts. Use component-based architecture (Inventory Component, Health Component) instead of monolithic Blueprints. Use Gameplay Tags to identify actors instead of class casts.

ORGANISATION: Use domain-based folder structure, NOT type-based. Group related assets together: /Characters/Player/ contains BP, materials, textures, animations, sounds. Use prefixes: BP_ (Blueprint), MI_ (Material Instance), SM_ (Static Mesh), SK_ (Skeletal Mesh), WBP_ (Widget Blueprint).

PERFORMANCE: Blueprint VM execution scales linearly with node count. Reducing 500 nodes to 200 nodes = ~40% runtime improvement. Never use Tick for things that don't need per-frame updates — use Timers instead. Never use "Set Timer by Function Name" — use "Set Timer by Event" (function name version breaks if you rename the function). Cache results of expensive operations in variables — Blueprint nodes re-execute every time a wire connects to them, they are NOT cached.

DEBUGGING: Use Print String nodes liberally during development. Enable "Break on Blueprint Exceptions" in Editor Preferences. Use Unreal Insights to profile which Blueprints consume frame time. Bookmark positions in large Blueprints with Ctrl+Number, jump with Shift+Number.`
    },

    {
      title: 'Blueprint Common Patterns',
      content: `EVENT DISPATCHERS: Use these for loose coupling. Instead of BP_Enemy directly calling BP_GameMode, the enemy fires an OnDeath dispatcher, and GameMode binds to it. This avoids hard references.

INTERFACES: Blueprint Interfaces define function signatures without implementation. Any Blueprint can implement the interface. Call interface functions on any actor without knowing its class — no cast needed, no reference chain. Use for: Interactable objects (IInteractable), Damageable actors (IDamageable), Saveable objects (ISaveable).

ENUMS + SWITCH: Use Enums for state machines. Create an Enum (E_PlayerState: Idle, Running, Jumping, Attacking). Use Switch on Enum instead of chains of Branch nodes. Much cleaner and less error-prone.

DATA TABLES: For any data that designers need to tweak (weapon stats, enemy properties, dialogue), use Data Tables backed by Structures. Never hardcode numbers in Blueprints.

CONSTRUCTION SCRIPT: Runs in-editor, not at runtime. Use for: preview meshes, setting up dynamic components, validation. Don't put gameplay logic here.`
    },

    {
      title: 'Blueprint Troubleshooting',
      content: `PROBLEM: Blueprint takes forever to open / Editor freezes on load
CAUSE: Reference chain — this Blueprint loads too many other assets
FIX: Check "Size Map" in Asset Audit. Use soft references. Break dependency chains.

PROBLEM: "Accessed None" error
CAUSE: You're trying to use a reference that hasn't been set yet
FIX: Add IsValid checks before using any reference. Check execution order.

PROBLEM: Cast fails silently
CAUSE: The actor isn't the type you're casting to
FIX: Check the actual class with "Get Class" → "Get Display Name". Consider using interfaces instead.

PROBLEM: Variable resets between levels
CAUSE: Actors are destroyed on level load
FIX: Use Game Instance for persistent data (it survives level transitions).

PROBLEM: Logic works in PIE but not in packaged build
CAUSE: Usually editor-only references or missing cook dependencies
FIX: Check for editor-only nodes. Ensure all referenced assets are in cooked content.

PROBLEM: Multiplayer — logic only works on server/client
CAUSE: Authority/replication misunderstanding
FIX: Check "Has Authority" for server-only logic. Use "Run on Server" RPCs for client-to-server calls.`
    },

    // ── MATERIALS ──────────────────────────────────────

    {
      title: 'Material System Essentials',
      content: `MATERIAL INSTANCES: Never modify a master material at runtime. Create Material Instances (MI_) and modify parameters on those. Dynamic Material Instances (created at runtime via "Create Dynamic Material Instance") let you change parameters per-actor.

MASTER MATERIAL PATTERN: Create one complex master material with parameters for everything (base colour, roughness, metallic, emissive, tiling, etc). Create Material Instances that set specific parameter values. This compiles ONE shader that all instances share = better performance.

KEY INPUTS:
- Base Color: RGB 0-1. sRGB texture input.
- Metallic: 0 (non-metal) or 1 (metal). Avoid values between — real-world materials are binary.
- Roughness: 0 (mirror) to 1 (matte). Most real surfaces are 0.3-0.8.
- Normal: Tangent-space normal map. Ensure "Sampler Type" = Normal Map Composite.
- Emissive: For glowing. Multiply colour by values > 1 for bloom. Hook into Post Process bloom threshold.

MATERIAL FUNCTIONS: Reusable node groups. Create once, use in many materials. Great for: noise patterns, UV manipulation, weathering effects, tiling functions.

PERFORMANCE: Instruction count matters. Check via "Stats" in Material Editor. Desktop: keep under 200 instructions. Mobile: keep under 100. Use "Quality Switch" node for platform-specific complexity. Avoid dependent texture reads where possible.`
    },

    {
      title: 'Material Troubleshooting',
      content: `PROBLEM: Material appears black in-game
CAUSES: Missing texture connections, Roughness = 0 + Metallic = 1 (mirror reflects black if no environment), shader compilation failed
FIX: Check Output Log for shader errors. Add a constant Base Color to test. Ensure you have a sky light or reflection captures.

PROBLEM: Normal map looks flat or inverted
CAUSE: Wrong compression or sampler type
FIX: Texture must use "Normal Map" compression. Material sampler type must be "Normal Map Composite". If inverted, flip the Green channel in texture settings.

PROBLEM: Texture tiling looks repetitive
FIX: Use World-Aligned textures for large surfaces. Layer multiple textures at different scales. Add macro variation with a large-scale noise multiply. Use tri-planar mapping for meshes without good UVs.

PROBLEM: Material Instance parameter not updating at runtime
CAUSE: Using a regular Material Instance, not a Dynamic one
FIX: Use "Create Dynamic Material Instance" node in Blueprint, then "Set Scalar/Vector Parameter Value".

PROBLEM: Translucency sorting issues (objects rendering in wrong order)
FIX: Use Masked blend mode instead of Translucent where possible. If translucent is required, adjust "Translucency Sort Priority". Consider using dithered opacity with Masked mode.`
    },

    // ── NIAGARA ────────────────────────────────────────

    {
      title: 'Niagara System Architecture',
      content: `HIERARCHY: System → Emitter(s) → Modules → Parameters
- A SYSTEM is a container for multiple emitters, combined into one effect
- An EMITTER produces one type of particle (smoke, sparks, etc)
- MODULES are the building blocks that control behaviour (lifetime, velocity, size, colour)
- PARAMETERS store data that modules read/write

STACK EXECUTION ORDER: Modules execute top-to-bottom within each stage:
1. System Spawn → System Update (runs once for the whole system)
2. Emitter Spawn → Emitter Update (runs per-emitter)
3. Particle Spawn → Particle Update (runs per-particle)

NAMESPACES define what data each level can access:
- System modules: read/write System namespace, read Engine/User
- Emitter modules: read/write Emitter namespace, read System/Engine/User
- Particle modules: read/write Particles namespace, read Emitter/System/Engine/User
This is KEY — data flows DOWN the hierarchy, not up.

EMITTERS ARE REUSABLE: Save emitters as assets in Content Browser. Drag into any System. Changes to the emitter asset propagate to all systems using it. Override specific parameters per-system without breaking the base emitter.

EFFECT TYPES: Assign a Niagara Effect Type to each system for scalability. Effect Types control: spawn limits, distance culling, quality scaling per platform. Essential for performance on different hardware.`
    },

    {
      title: 'Niagara Common Modules & Patterns',
      content: `ESSENTIAL MODULES:
- Initialize Particle: Set initial lifetime, size, colour, mesh, sprite
- Add Velocity: Linear, in cone, from point, inherit source movement
- Gravity Force: Apply world gravity (or custom directional force)
- Drag: Slow particles over time (essential for realistic motion)
- Scale Size / Color Over Life: Use curves for fade-in/fade-out
- Solve Forces and Velocity: MUST be in Update for forces to work
- Sprite/Mesh/Ribbon Renderer: How particles are drawn

SPAWN PATTERNS:
- Spawn Rate: Continuous (particles/sec)
- Spawn Burst Instantaneous: All at once (explosions)
- Spawn Per Unit: Based on distance traveled (trails)

COMMON EFFECTS:
Fire: Sprite renderer + velocity noise + Scale Color (orange→black) + Scale Size over life
Smoke: Large sprites + slow upward velocity + high drag + dissolve over life
Sparks: Small sprites or meshes + high initial velocity in cone + gravity + bounce on collision
Trail: Ribbon renderer + Spawn Per Unit + inherit velocity from parent
Rain: Spawn at box volume above camera + downward velocity + collision with scene

DATA CHANNELS (UE 5.7+): Enable communication between Niagara systems, or between Blueprints and Niagara. Use for: impact effects (one system handles all impacts instead of spawning many), footsteps, shared simulations. Requires: Data Channel Asset, a listener Niagara System, a Blueprint writing events.

LIGHTWEIGHT EMITTERS: Stateless emitter type for simple effects. Reduced functionality but much better performance. Use for particles that don't need per-particle state (simple ambient dust, distant rain).`
    },

    {
      title: 'Niagara Troubleshooting',
      content: `PROBLEM: Particles spawn but don't move
CAUSE: Missing "Solve Forces and Velocity" in Particle Update
FIX: Add the Solve Forces and Velocity module to Particle Update stage. Must be AFTER force/velocity modules.

PROBLEM: Particles spawn at world origin instead of emitter location
CAUSE: Simulation space mismatch
FIX: Check Emitter Properties → Sim Target. "Local" space moves with the component. "World" space is fixed. For most effects attached to actors, use Local.

PROBLEM: Niagara system not visible in game
CAUSES: Auto-deactivate, distance culling, Effect Type scalability
FIX: Check "Auto Deactivate" on the component. Check Effect Type distance settings. Ensure the system is activated in Blueprint. Check the renderer is enabled.

PROBLEM: Particles jitter or teleport when source moves quickly
CAUSE: Not interpolating spawn positions
FIX: Enable "Interpolated Spawning" on the spawn module. This distributes particles along the movement path between frames.

PROBLEM: Material not showing on Niagara particles
CAUSE: Wrong renderer type or material domain
FIX: Sprite Renderer needs a material with "Used with Niagara Sprites" enabled. Mesh Renderer needs "Used with Niagara Meshes". Check material usage flags in Material Details.

PROBLEM: Performance drops with many particles
FIX: Use GPU simulation for high particle counts (Emitter Properties → Sim Target = GPU). Reduce overdraw by using smaller sprites. Use LOD distance scaling. Set particle count caps in Effect Type. Consider Lightweight Emitters for simple effects.

PROBLEM: Curves/gradients not behaving as expected
CAUSE: Curve evaluation range mismatch
FIX: Most curves evaluate 0-1 over the particle's normalised age. Check "Normalized Age" vs "Age" — they're different parameters. Normalised Age = Age / Lifetime (always 0 to 1).`
    },

    // ── GENERAL UE5 ────────────────────────────────────

    {
      title: 'UE5 General Tips',
      content: `VIEWPORT SHORTCUTS: F = focus selected. G = game view (hide editor icons). Alt+drag = orbit. Middle mouse + drag = pan. Mouse wheel = zoom. End key = snap to floor. Ctrl+Shift+drag = duplicate and move.

PERFORMANCE PROFILING: stat fps (show framerate), stat unit (CPU/GPU/draw breakdown), stat game (gameplay thread detail), Unreal Insights for deep profiling. GPU Visualizer (Ctrl+Shift+,) for render pass breakdown.

PACKAGING: Always test packaged builds, not just PIE. Enable "Cook on the Fly" for faster iteration. Check Output Log after packaging for missing asset warnings. Use Build > Cook Content before packaging to catch errors early.

WORLD PARTITION (UE5): For open worlds. Replaces Level Streaming with automatic grid-based loading. Actors load/unload based on distance. Use Data Layers for different game states (before/after quest).

SOURCE CONTROL: Use Perforce or Git LFS for Unreal projects. .uasset files are binary — need LFS. Lock files before editing to prevent merge conflicts.`
    },
  ],
});

// ══════════════════════════════════════════════════════════
// BUILT-IN SKILL PACK: WEB DEVELOPMENT
// (Example of a second skill pack)
// ══════════════════════════════════════════════════════════

registerSkill({
  id: 'web-dev',
  name: 'Web Development',
  emoji: '🌐',
  description: 'React, TypeScript, CSS, Node.js — modern web dev patterns and debugging',
  category: 'built-in',
  sections: [
    {
      title: 'React Patterns',
      content: `STATE: Use useState for local UI state. Use useReducer for complex state with many transitions. Lift state to the lowest common ancestor.

PERFORMANCE: React.memo for expensive pure components. useMemo for expensive computed values. useCallback for stable function references passed to children. React.lazy() + Suspense for code splitting.

COMMON MISTAKES: Don't mutate state directly (spread or structuredClone). Don't use index as key in lists that reorder. Don't put state in refs unless you specifically need to skip re-renders. Don't useEffect for things that can be computed during render.

REFS vs STATE: Use refs for values that don't affect rendering (timers, animation frames, DOM measurements, previous values). Use state for anything the UI depends on.`
    },
    {
      title: 'TypeScript Essentials',
      content: `STRICT MODE: Always enable. Catches null errors, implicit any, and missing returns.

USEFUL PATTERNS: Discriminated unions for state machines. Zod or Valibot for runtime validation. satisfies keyword for type checking without widening. as const for literal types.

AVOID: any (use unknown + type narrowing instead). Non-null assertion (!) unless absolutely certain. Enums (use union types or as const objects instead).`
    },
  ],
});


// ── Exports for use in service worker ────────────────────

// In a Chrome extension context, these are available globally
// In the Electron app, they'd be imported as a module

if (typeof globalThis !== 'undefined') {
  globalThis.BlepperSkills = {
    registerSkill,
    getAllSkills,
    getSkills,
    buildSkillContext,
    SKILLS,
  };
}
