# UE5 Niagara VFX — Quick Reference

## Architecture
- **Niagara System**: The top-level asset you place in the world. Contains one or more Emitters.
- **Niagara Emitter**: Defines one type of particle (sparks, smoke, debris). Has a stack of Modules per stage.
- **Module**: A single behaviour unit (e.g., "Add Velocity", "Scale Color"). Written in Niagara Module Script (HLSL-like).
- **Data Interface (DI)**: Reads external data into Niagara — meshes, textures, audio, collision, skeletal meshes.

## Emitter Stages (execution order)
1. **Emitter Spawn** — Runs once when emitter activates. Set up emitter-level state.
2. **Emitter Update** — Runs every frame for emitter-level logic. Spawn rate, emitter age.
3. **Particle Spawn** — Runs once per particle at birth. Initial position, velocity, color, size.
4. **Particle Update** — Runs every frame per living particle. Movement, color over life, forces.
5. **Render** — Configures how particles look. Sprite, Mesh, Ribbon, Light renderers.

## Renderer Types
- **Sprite Renderer**: Camera-facing quads. Fire, sparks, dust, smoke.
- **Mesh Renderer**: 3D meshes as particles. Debris, rocks, leaves.
- **Ribbon Renderer**: Connected trails. Sword slashes, lightning, smoke trails.
- **Light Renderer**: Dynamic lights per particle. Sparks, fireflies (expensive — limit count).
- **Component Renderer**: Spawns full UE components per particle (very expensive, use sparingly).

## Essential Modules

### Spawn Stage
- **Initialize Particle**: Sets initial Lifetime, Mass, Sprite Size, Color, etc. Usually the first module.
- **Shape Location**: Spawn from sphere, box, cylinder, torus, mesh surface, skeletal mesh.
- **Add Velocity**: Initial velocity (direction + speed). Combine with Shape Location for outward burst.
- **Set (Variable)**: Directly set any particle attribute.

### Update Stage
- **Gravity Force**: Pulls particles down (or any direction). Strength in cm/s².
- **Drag**: Slows particles over time. Air resistance.
- **Curl Noise Force**: Organic, turbulent motion. Smoke, magical effects.
- **Scale Sprite Size / Scale Color**: Change over lifetime. Usually with a Curve.
- **Color**: Set or interpolate colour over Normalized Age.
- **Solve Forces and Velocity**: MUST be present for physics forces to work. Without this, gravity/drag/curl do nothing.
- **Kill Particles**: Removes particles based on conditions (age, bounds, etc).
- **Collision**: Bounce/die on surface contact. Uses scene depth or distance fields.

### Spawn Rate vs Burst
- **Spawn Rate**: Continuous — N particles per second.
- **Spawn Burst Instantaneous**: One-shot — N particles at once. Explosions, impacts.
- **Spawn Per Frame**: Exactly N particles each frame (frame-rate dependent — use carefully).

## Key Attributes (built-in variables)
- `Particles.Position` — World position
- `Particles.Velocity` — Current velocity vector
- `Particles.Lifetime` — Max life in seconds
- `Particles.Age` — Current age in seconds
- `Particles.NormalizedAge` — 0 to 1 over lifetime (use this for curves)
- `Particles.Color` — RGBA
- `Particles.SpriteSize` — Width/Height of sprite
- `Particles.Mass` — Affects forces
- `Particles.SpriteRotation` — Rotation in degrees
- `Particles.Scale` — For mesh particles
- `Particles.RibbonWidth` — For ribbon renderer
- `Particles.RibbonLinkOrder` — Ordering for ribbon connections

## Curves & Dynamic Inputs
- Right-click any input → **Dynamic Inputs** → options include:
  - **Float from Curve**: Map a curve over NormalizedAge. Essential for fade-in/fade-out.
  - **Uniform Ranged Float/Vector**: Random value between min and max.
  - **Vector from Curve**: Color gradients, size over life.
  - **Make New Expression**: Write inline Niagara expressions (mini HLSL).

## Common Recipes

### Fire
- Sprite Renderer with fire/smoke texture atlas (SubUV animation)
- Spawn Rate: 50-200/sec depending on size
- Shape Location: small sphere or point
- Add Velocity: upward + slight random
- Curl Noise Force: low intensity for flicker
- Scale Color: orange→red→dark over NormalizedAge
- Scale Sprite Size: grow slightly then shrink

### Explosion
- Spawn Burst Instantaneous: 30-100 particles
- Shape Location: sphere, radius matches blast size
- Add Velocity: outward from sphere center, high initial speed
- Gravity + Drag: pull down and slow over time
- Scale Color: white→yellow→orange→transparent
- Second emitter for smoke (slower, larger, longer lived)
- Third emitter for debris (Mesh Renderer, physics)

### Magic Trail (Ribbon)
- Ribbon Renderer
- Spawn Per Frame: 1-3
- Position follows the source (use Update → Sample Spline or parent socket)
- Scale RibbonWidth over NormalizedAge: wide→thin
- Color: bright→fade over age
- Enable Facing Mode: Custom if you want specific orientation

### Rain
- Sprite Renderer with stretched billboard
- Spawn Rate: high (500+), spawn in large box above camera
- Add Velocity: downward, fast (-1500 to -2000 cm/s Z)
- Collision with scene depth → Kill on contact
- Very short lifetime (1-2 seconds)
- Second emitter for splash on collision point

## Troubleshooting

### Particles not spawning
- Check **Spawn Rate** or **Spawn Burst** module exists and value > 0
- Check emitter is **not disabled** (eye icon in the stack)
- Check **System** is activated (Auto Activate in details panel)
- Check **Warmup Time** isn't hiding initial particles

### Particles stuck at origin (0,0,0)
- **Local vs World space**: Check the emitter's Sim Target. If using Local space, particles move with the actor.
- After UE 5.5: coordinate system changed — `Initialize Particle` may need updating if migrated from older versions.
- Check Shape Location module has correct coordinate space setting.

### Particles not moving
- **Solve Forces and Velocity** module missing from Particle Update. This is the most common mistake. Without it, forces accumulate but position never updates.
- Check velocity values aren't zero.

### Particles flicker or pop
- **Sprite alignment**: try Camera Facing, Velocity Aligned, or Custom.
- **Sort order**: In Sprite Renderer, set Sort Mode (by depth, age, etc).
- **NaN values**: A math error upstream producing NaN will cause visual glitches. Check for divide-by-zero.

### Performance is bad
- **Reduce particle count** first. Often half the particles at double the size looks similar.
- **GPU Sim** is faster than CPU Sim for >1000 particles. Set in Emitter Properties → Sim Target.
- **Fixed Bounds**: Set manually instead of letting Niagara calculate. Avoids per-frame bounds recalculation.
- **Cull by distance**: Enable **Scalability** settings. Kill systems too far from camera.
- **Avoid Collision** with scene depth if possible — it's expensive. Use Distance Fields or simple kill-planes instead.
- **Light Renderer**: cap at 10-20 lights max. Each is a dynamic light.
- Use the **Niagara Debugger** (Window → Niagara Debugger) to see particle counts, memory, performance per system.

### Ribbon looks broken
- Check **RibbonLinkOrder** is set (usually to Particles.UniqueID or spawn order).
- Check particles are spawning in sequence (Spawn Per Frame, not burst).
- **Facing Mode** in Ribbon Renderer needs to match your use case.

## Keyboard Shortcuts (Niagara Editor)
- **Space**: Open module/node palette
- **Ctrl+Space**: Quick add module
- **B**: Toggle bypass on selected module
- **D**: Toggle disable on selected module
- **Delete**: Remove selected module
- **Ctrl+Z/Y**: Undo/Redo
