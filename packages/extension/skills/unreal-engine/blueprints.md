# UE5 Blueprints — Quick Reference

## Blueprint Types
- **Level Blueprint**: Per-level logic. References actors in that level. Controls cinematics, streaming, checkpoints.
- **Blueprint Class**: Reusable actor templates. Doors, switches, collectibles, destructibles. Extends C++ classes.
- **Widget Blueprint**: Extends UUserWidget. Menus, HUD, UI components.
- **Animation Blueprint**: State machines and blend logic for skeletal meshes.
- **Gameplay Ability Blueprint**: For the Gameplay Ability System (GAS).

## Essential Events
- `BeginPlay` — Fires once when actor spawns or level starts
- `Tick` — Fires every frame (expensive — avoid if possible, use timers instead)
- `EndPlay` — Fires when actor is destroyed or level unloads
- `OnOverlapBegin` / `OnOverlapEnd` — Collision overlap events (need Generate Overlap Events enabled)
- `OnHit` — Physics collision (need Simulation Generates Hit Events enabled)
- `OnClicked` / `OnReleased` — Mouse interaction

## Variable Types & Wire Colours
- **Boolean** (red): true/false
- **Integer** (cyan): whole numbers
- **Float** (green): decimal numbers
- **String** (magenta): text
- **Vector** (yellow): X,Y,Z — used for location, direction, scale
- **Rotator** (purple-blue): Pitch, Yaw, Roll
- **Transform** (orange): Location + Rotation + Scale combined
- **Object Reference** (blue): pointer to an actor/component
- **Struct** (dark blue): custom data bundles
- **Enum** (dark green): named constants
- **Array** (grid pattern on the wire): list of any type
- **Map** (two-color): key-value pairs
- **Set** (diamond pattern): unique values only
- **Soft Reference** (lighter blue): lazy-loaded object reference

## Execution Flow
- **White wires** = execution flow (order of operations)
- **Coloured wires** = data flow (values passed between nodes)
- **Sequence** node: executes multiple outputs in order (Then 0, Then 1, etc.)
- **Branch**: if/else logic
- **Switch on Int/String/Enum**: multi-way branch
- **ForEachLoop / ForLoop**: iteration
- **Gate**: open/close execution path
- **Do Once**: fires only the first time
- **Delay**: waits N seconds (async, doesn't block tick)
- **Retriggerable Delay**: resets timer if triggered again
- **FlipFlop**: alternates between two paths each call

## Common Patterns

### Get/Set Variables
Right-click variable → Get / Set. Drag from variable list.

### Cast To
`Cast To [ClassName]` — safely converts a generic reference to a specific type. Always handle the Cast Failed pin.

### Interface Messages
Preferred over casting for loose coupling. Send messages without knowing the exact class.

### Event Dispatchers
Blueprint's event/callback system. Bind in one blueprint, call from another. Essential for decoupled communication.

### Timeline
Keyframe-based interpolation. Use for doors, elevators, lerping values over time. Better than Tick for smooth animations.

### Construction Script
Runs in-editor when you place or move an actor. Use for procedural setup, NOT gameplay logic.

## Performance Tips
- **Avoid Tick** where possible. Use Timers, Event Dispatchers, or "Set Timer by Event" instead.
- **Don't cast in Tick**. Cache the result in BeginPlay.
- **Use Branch before expensive operations** to early-out.
- **Collapse to Function/Macro** for reusability and readability.
- **Pure functions** (no exec pin) are recalculated every time they're read — cache results if called multiple times per frame.
- **Nativize Blueprints** for shipping if performance-critical (converts to C++).

## Debugging
- **F9** on a node = breakpoint
- **Print String** node for quick debug output
- **Watch pins** in the debugger to see live values
- **Blueprint Debugger** panel shows execution flow step-by-step
- If wires are grey/disconnected, the node isn't being reached

## Keyboard Shortcuts
- **B + click** = Branch
- **S + click** = Sequence
- **D + click** = Delay
- **Ctrl+W** = Duplicate selected node
- **F7** = Compile
- **C** = Comment selected nodes
- **Q** = Toggle between alignment modes
- **Hold Alt + drag pin** = Break link
- **Ctrl+drag pin** = Move link to different pin
