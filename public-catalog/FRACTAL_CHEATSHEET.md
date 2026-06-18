# 4D Fractal Fusion - Quick Reference Cheat Sheet

## One-Line Cheat Sheet
```typescript
// Basic usage - just send a promo string!
fetch("/api/generate/image", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "quantum sierpinski", use_fractal_fusion: true })
})
```

## 30-Second Examples

### Minimal (Fastest, ~15s)
```
"quantum fractal"
"sierpinski"
"cosmic"
```

### Recommended (Best results, ~25s)
```
"quantum sierpinski"
"ethereal koch"
"intense burning ship"
"peaceful mandala"
"cosmic julia"
```

### Advanced (Maximum variety, ~40s)
```
"ultra-detailed quantum void sierpinski with ethereal recursive quantum field"
"intense explosive burning ship with chaotic turbulent energy and electric neon edges"
"peaceful flowing vicsek with harmonic crystalline quantum field"
```

## Emotion Keywords Quick List

| Calm | Intense | Dark | Cosmic | Mathematical |
|------|---------|------|--------|--------------|
| peaceful | intense | void | quantum | geometric |
| serene | vivid | dark | cosmic | mathematical |
| tranquil | explosive | ominous | ethereal | algorithmic |
| meditative | chaotic | shadow | luminous | recursive |
| | | abyss | radiant | |

## Fractal Types (Pick One or Let System Hybrid-Blend)

| Type | Best For | Example |
|------|----------|---------|
| sierpinski | Geometric triangles | "sierpinski" |
| koch | Snowflake branching | "intricate koch" |
| vicsek | Balanced centers | "flowing vicsek" |
| mandelbrot | Infinite detail | "detailed mandelbrot" |
| julia | Organic flows | "ethereal julia" |
| burning_ship | Intense fire | "explosive burning ship" |
| trinity | Sacred geometry | "trinity" |
| lyapunov | Chaos theory | "chaotic lyapunov" |
| newton | Basin dynamics | "newton" |

## Color Temperatures (Optional)

Add these keywords for color palette override:
- **cool** → Blues/cyans (default for calm emotions)
- **warm** → Reds/magentas (default for intense emotions)
- **balanced** → Mixed cyan/magenta on black
- **neon** → Electric bright colors
- **cosmic** → Space purples/cyans
- **void** → Deep blacks with neon accents
- **ethereal** → Mystical purples
- **acidic** → Nuclear greens/yellows

## Quantum Emotions (Background Morphing)

Add these for distortion style:
- **flowing** → Smooth wave distortion
- **spiraling** → Rotating spiral patterns
- **pulsing** → Concentric ripples
- **crystalline** → Sharp geometric formations
- **chaotic** → Random morphing
- **harmonic** → Balanced waves
- **ethereal** → Mystical flows

## API Response Structure

```json
{
  "image_url": "/api/images/generated_12345.png",
  "meta": {
    "provider": "fractal_fusion",
    "primary_fractal": "sierpinski",
    "emotion": "quantum",
    "intensity": 0.75,
    "complexity": 0.65,
    "settings": {
      "steps": 200,
      "guidance_scale": 4.5,
      "seed": null
    }
  }
}
```

## GET Preview (No Generation)

```bash
curl "https://yoursite.com/api/generate/image?promo=quantum%20sierpinski"
```

Returns recommendations WITHOUT generating image (faster, useful for UI previews).

## Full Parameter Reference

```typescript
interface GenerateRequest {
  prompt: string;              // Required: promo text
  width?: number;              // 64-1536, default 512
  height?: number;             // 64-1536, default 512
  use_fractal_fusion?: boolean; // default true
  quantum_mode?: boolean;       // Use quantum service, default false
  ipfs_upload?: boolean;        // Upload to IPFS, default false
  seed_salt?: string;           // Deterministic generation
  negative_prompt?: string;     // Additional negative guidance
}
```

## Performance Guide

| Keyword | Effect | Time Impact |
|---------|--------|------------|
| "simple" | Reduces detail | -5s |
| "minimal" | Very fast | -10s |
| "detailed" | Adds complexity | +5s |
| "ultra-detailed" | Maximum detail | +15s |
| "fast"/"quick" | Reduces steps | -10s |
| "infinite" | Maximum iterations | +20s |

## Debug Commands

```typescript
// See what will be generated
import { debugPromo } from '@/lib/fractal-integration';
const rec = await debugPromo("quantum sierpinski");
console.log(rec);

// Get recommendations without generation
import { previewFractalRecommendations } from '@/lib/fractal-integration';
const preview = await previewFractalRecommendations("ethereal koch");

// Batch generation with emotions
import { generateMultipleEmotions } from '@/lib/fractal-integration';
const results = await generateMultipleEmotions(
  "fractal",
  ["peaceful", "intense", "cosmic", "dark"]
);
```

## Common Promo Patterns

### Pattern 1: Emotion + Fractal
```
[emotion] [fractal]
peaceful sierpinski
intense burning ship
ethereal koch
```

### Pattern 2: Emotion + Detail + Fractal
```
[emotion] [detail] [fractal]
ultra-detailed ethereal koch
intense explosive burning ship
peaceful flowing vicsek
```

### Pattern 3: Emotion + Fractal + Quantum + Color
```
[emotion] [fractal] with [quantum_emotion] quantum field and [color] edges
quantum sierpinski with ethereal quantum field and neon edges
intense burning ship with chaotic turbulent field and electric colors
peaceful julia with flowing harmonic field and cool blues
```

### Pattern 4: Custom Engineering (Advanced)
```
[emotion] [color_temp] [complexity] [fractal] with [quantum_emotion] [distortion]
intense neon ultra-detailed burning ship with chaotic turbulent energy
ethereal cosmic detailed koch with flowing harmonic morphing
peaceful cool minimal mandelbrot with gentle wave oscillation
```

## Real-World Examples

### E-commerce T-shirt designs
```
"quantum sierpinski"            // Simple, universal
"cosmic ethereal koch"          // Premium, elegant
"intense explosive burning ship" // Bold, energetic
"peaceful flowing vicsek"       // Calming, centered
```

### Artistic merch
```
"dark void trinity with mysterious quantum field"
"ultra-detailed ethereal mandala with luminous edges"
"intense chaotic lyapunov with electric neon energy"
"peaceful serene julia with harmonic flowing waves"
```

### Collection themes
```
// Minimalist Collection
"simple geometric sierpinski"
"minimal balanced vicsek"
"subtle ethereal koch"

// Quantum Collection
"intense quantum void burning ship"
"ethereal cosmic julia with spiraling energy"
"ultra-detailed quantum mandelbrot"

// Nature Collection
"organic flowing vicsek"
"peaceful crystalline trinity"
"gentle harmonic wave patterns"
```

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Same image every time | Use different emotion keywords; check seed_salt |
| Generation too slow | Add "fast" or "simple" keyword |
| Colors wrong | Add color temp (cool/warm/neon/cosmic) |
| Not using fractal type | Spell fractal name correctly; check logs |
| Missing quantum field | Ensure use_fractal_fusion=true |
| Only static Mandelbrot | Make sure new route.ts deployed |

## File Structure Reference

```
public-catalog/
├── src/
│   ├── lib/
│   │   ├── fractal-generator.ts          ← Core engine (30 emotions, 9 fractals)
│   │   └── fractal-integration.ts        ← Client utilities & examples
│   └── app/
│       └── api/
│           └── generate/
│               └── image/
│                   ├── route.ts          ← Updated handler with fractal support
│                   └── fractal-fusion.ts ← Integration module
└── FRACTAL_INTEGRATION.md                ← Full documentation
```

## Environment Setup

No additional setup needed! The system:
- ✅ Uses existing AI generator
- ✅ Integrates with current Fusion service
- ✅ Maintains backwards compatibility
- ✅ Defaults to fractal fusion enabled
- ✅ Falls back to old system if disabled

## Live Testing

### Test 1: Basic Generation
```bash
curl -X POST https://yoursite.com/api/generate/image \
  -H "Content-Type: application/json" \
  -d '{"prompt":"quantum sierpinski"}'
```

### Test 2: Get Preview
```bash
curl "https://yoursite.com/api/generate/image?promo=ethereal%20koch"
```

### Test 3: Advanced with Parameters
```bash
curl -X POST https://yoursite.com/api/generate/image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt":"intense explosive burning ship",
    "width":1024,
    "height":1024,
    "use_fractal_fusion":true
  }'
```

## Expected Results Summary

### Input → Output Transformation

```
"quantum sierpinski" 
  → Sierpinski triangle fractal
  → Quantum emotion (cyan/magenta neon)
  → Ethereal quantum field (wave distortion)
  → ~25s generation time
  → Unique geometric, symmetrical design

"ethereal koch"
  → Koch snowflake fractal
  → Ethereal emotion (purple/cyan mystical)
  → Ethereal quantum field (wave morphing)
  → ~25s generation time
  → Intricate, organic branching design

"intense explosive burning ship"
  → Burning ship fractal
  → Intense emotion (red/orange fire)
  → Default (crystalline) quantum field
  → ~30s generation time
  → Energetic, explosive fire-like patterns

"peaceful flowing vicsek"
  → Vicsek cross-shaped fractal
  → Peaceful emotion (cool blues)
  → Flowing quantum field (wave propagation)
  → ~22s generation time
  → Calm, centered, balanced composition
```

## Next Steps

1. **Test with different promos** - Try variations to see diversity
2. **Check generated metadata** - Examine meta.primary_fractal, emotion, etc.
3. **Monitor generation times** - Adjust complexity for your use case
4. **Preview before generating** - Use GET endpoint for UI recommendations
5. **Gather feedback** - See what emotions/fractals resonate with users

## Support Keywords

For additional help, search documentation for:
- "emotion keywords" → All 30+ emotion options
- "fractal types" → Details on each of 9 fractals
- "quantum field" → Morphing background tech
- "color temperature" → Palette options
- "performance" → Speed optimization
- "integration" → How to use in your components

---

**TL;DR**: Send a promo string like `"quantum sierpinski"` and get unique AI-generated fractal art. System handles the rest! 🎨✨
