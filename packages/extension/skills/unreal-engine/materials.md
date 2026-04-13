# UE5 Materials — Quick Reference

## Material Editor Basics
Materials in UE5 are node-based shader graphs. The main output node has pins for each surface property. Everything flows left-to-right into the output.

## Key Output Pins
- **Base Color**: RGB albedo (0-1 range). No lighting info — just pure colour/texture.
- **Metallic**: 0 = dielectric (plastic, wood, skin), 1 = metal. Usually binary, not a gradient.
- **Specular**: Override specular reflectance. Default 0.5. Leave alone unless you know why you're changing it.
- **Roughness**: 0 = mirror-smooth, 1 = completely rough. Most real materials are 0.3-0.8.
- **Emissive Color**: Self-illumination. Values above 1.0 create bloom. Use for screens, neon, lava.
- **Normal**: Tangent-space normal map input. Adds surface detail without geometry.
- **Opacity**: For translucent/masked materials only. 0 = invisible, 1 = fully opaque.
- **World Position Offset**: Vertex displacement. Wind, waves, procedural animation.
- **Subsurface Color**: For Subsurface shading model. Skin, wax, leaves.

## Shading Models
- **Default Lit**: Standard PBR. Use for almost everything.
- **Unlit**: No lighting. UI elements, custom post-process, sky.
- **Subsurface**: Light scatters through. Skin, wax, thin cloth.
- **Clear Coat**: Two-layer material. Car paint, varnished wood, wet surfaces.
- **Two Sided Foliage**: Subsurface optimised for leaves/grass.
- **Hair**: Anisotropic shading for strand-based hair.
- **Cloth**: Fabric shading with fuzz layer.
- **Thin Translucent**: Glass, bubble, thin plastic.

## Blend Modes
- **Opaque**: Default. Fully solid.
- **Masked**: Binary transparency via Opacity Mask. Cutout foliage, chain-link fence.
- **Translucent**: Smooth transparency. Glass, particles, holograms. Expensive.
- **Additive**: Adds colour to background. Fire, sparks, glow effects.
- **Modulate**: Multiplies with background. Shadows, darkening effects.

## Essential Nodes

### Texture
- **Texture Sample**: Reads a texture. Connect UV to its UVs input.
- **Texture Coordinate (TexCoord)**: UV coordinates. Scale with U/V tiling.
- **Panner**: Scrolling UVs. Rivers, conveyor belts, clouds.

### Math
- **Multiply / Add / Subtract / Divide**: Basic maths on values.
- **Lerp (Linear Interpolate)**: Blend between A and B using Alpha. The single most useful material node.
- **Clamp / Saturate**: Keep values in range. Saturate = clamp 0-1 (free on GPU).
- **Power**: Sharpen/soften masks. Higher = sharper.
- **One Minus**: Inverts 0-1 values. (1-x)
- **Abs**: Absolute value. Makes negatives positive.

### Colour/Vector
- **Constant3Vector**: RGB colour picker.
- **Desaturation**: Remove colour, make greyscale.
- **Append**: Combine scalar → vector (e.g., two floats → Vector2).
- **Component Mask**: Extract R, G, B, or A channels.
- **Normalize**: Make vector unit length.

### Utility
- **Fresnel**: Brighter at glancing angles. Rim lighting, fake reflections.
- **Noise / Simple Noise**: Procedural patterns. Good for organic variation.
- **World Position**: Current pixel's position in world space.
- **Object Position**: Actor's pivot point in world space.
- **Time**: Continuously incrementing value. Use for animation.
- **Vertex Color**: Per-vertex painted colours (from mesh paint mode).

## Common Patterns

### Texture Blending (Landscape/Layered)
Use **Lerp** with a mask texture or vertex colour as Alpha to blend between two textures. Stack multiple Lerps for 3+ layers.

### Pulsing Emissive
`Time → Sine → Abs → Multiply(EmissiveColor, Result)`

### Detail Texture Tiling
Multiply TexCoord by a large number (10-50) for a detail texture, then Lerp or Multiply with the base texture.

### Parallax Occlusion / Bump Offset
Fakes depth on flat surfaces using the heightmap. Use **Bump Offset** node with a heightmap texture.

### Material Instances
Always create a **Material Instance** for per-asset tweaks. Expose parameters with `Param` nodes (ScalarParameter, VectorParameter, TextureParameter). Instances are much cheaper to swap at runtime than full materials.

### Material Functions
Reusable sub-graphs. Create once, use in many materials. Essential for keeping things DRY.

## Performance Tips
- **Texture lookups are expensive** — fewer samples = faster. Pack masks into RGBA channels of one texture.
- **Use Material Instances**, not duplicate materials.
- **Masked > Translucent** for performance when you can get away with it.
- **Avoid complex maths in pixel shader** — move to vertex shader where possible (with Custom UV pins).
- **LOD material switching** — simpler materials at distance.
- **Saturate is free** on GPU. Use instead of Clamp(0,1).

## Debugging
- Use **Preview** node (right-click any node → Start Previewing Node) to see intermediate results.
- **Shader Complexity** viewmode (Alt+8 in viewport) shows per-pixel cost as a heatmap.
- Watch for bright red/white in Shader Complexity — means too many instructions.
- **Material Stats** window shows instruction count and texture samples.
