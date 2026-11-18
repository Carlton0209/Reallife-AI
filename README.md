# RealLife AI — Starter

Zero-dep React + Vite + Tailwind starter with two surfaces:

- **`/`** — Topaz-inspired marketing homepage (hero, trusted-by marquee, 3 feature sections, preset grid, use cases, pricing CTA, footer)
- **`/#app`** — Swiss-minimalist product UI (upload → enhance → compare → export)

Both surfaces share a single `CompareSlider` component. Hash routing between them is zero-dependency.

---

## Quick start

This zip is already a complete Vite project — no scaffold step needed.

```bash
# 1. Open a terminal in the unzipped folder
cd reallife-ai-starter

# 2. Install dependencies (~30s on first run)
npm install

# 3. Start the dev server
npm run dev
```

Then open what the terminal prints (usually `http://localhost:5173/`).

- `http://localhost:5173/` — homepage
- `http://localhost:5173/#app` — product UI

Edits to any `src/*.jsx` or `src/index.css` hot-reload automatically. Edits to `tailwind.config.js` **require stopping and restarting** the dev server — Tailwind's JIT doesn't rescan the config on HMR.

---

## Project layout

```
reallife-ai-starter/
├── src/
│   ├── Home.jsx             Topaz-style marketing homepage (670 lines)
│   ├── App.jsx              Swiss-style product UI (448 lines)
│   ├── CompareSlider.jsx    Shared draggable before/after (131 lines)
│   ├── main.jsx             Entry point + hash router + ErrorBoundary
│   └── index.css            Tailwind base + marquee keyframes + fonts
├── index.html               HTML entry — loads /src/main.jsx
├── tailwind.config.js       Color tokens for both surfaces
├── postcss.config.js        Standard Tailwind + autoprefixer pipeline
├── vite.config.js           React plugin
├── package.json             React 18, Vite 5, Tailwind 3.4
├── README.md                This file
└── TROUBLESHOOTING.md       Blank-page debugging checklist
```

---

## Design tokens

Defined in `tailwind.config.js`. Two palettes coexist — product UI uses the Swiss set, homepage uses the Topaz set.

### Product UI (Swiss)

| Token | Hex | Usage |
|---|---|---|
| `ink` | `#0A0A0A` | Primary text, buttons |
| `paper` | `#FBFAF7` | Page background |
| `hairline` | `#E8E4DB` | Dividers, borders |
| `secondary` | `#76746D` | Meta text, labels |
| `tertiary` | `#C4C0B5` | Muted text |
| `accent` | `#E63B20` | Swiss red (sparingly) |
| `concrete.{DEFAULT,light,dark}` | `#ECE8DC / #F5F2EA / #DAD5C8` | Panel backgrounds |

### Homepage (Topaz)

| Token | Hex | Usage |
|---|---|---|
| `cream` | `#FAF8F3` | Alternating section bg |
| `soft.DEFAULT` | `#5C5B58` | Body copy |
| `soft.muted` | `#6B6864` | Eyebrow labels |
| `soft.faint` | `#9C9A95` | Tertiary / placeholders |

Shared: `ink` and `hairline` appear in both surfaces.

### Typography

Inter Tight (Google Fonts) at 400/500 for all UI. JetBrains Mono for the Swiss product UI's meta lines (`font-mono` class). Fonts are imported from `index.css` — for production, move the `<link>` into `index.html <head>` for faster first paint.

---

## Customization cheat sheet

### Swap placeholder portraits for real before/after images

Every `XxxBefore` / `XxxAfter` SVG component in `Home.jsx` is a placeholder. Replace the SVG body with an `<img>`:

```jsx
// Before (SVG placeholder)
const HeroBefore = () => <PortraitSilhouette palette={PORTRAIT.heroBefore} landscape />

// After (real image)
const HeroBefore = () => (
  <img src="/hero-before.webp" alt="" className="w-full h-full object-cover" />
)
```

Drop the images in `public/` so they're served from root (`/hero-before.webp`). Keep the same aspect ratios: hero = 16:9, feature sections = 4:5, preset cards = 4:5.

### Delete or replace the Trusted by / Featured in marquee

The 14 placeholder brand names in `Home.jsx` (`creatorData` / `mediaData` arrays) are fictional. Either:

1. Replace each `{ name, draw }` with a real partner
2. Delete the whole `<TrustedBy />` section
3. Replace with plain social proof: "12,000+ creators" + 2-3 pull quotes

### Wire up the newsletter form

Footer's newsletter currently just `console.log`s the email. Find `onSubmit={(e) => {` in `Home.jsx` and replace with your Mailchimp / Beehiiv / Resend endpoint.

### Connect the product UI to ComfyUI

The product UI calls a local ComfyUI directly from the browser (`src/lib/comfyui.js`, default `http://127.0.0.1:8188`, override with `VITE_COMFY_URL`). ComfyUI must allow cross-origin requests, so start it with `--enable-cors-header`:

```bash
python_embeded\python.exe -I ComfyUI\main.py --windows-standalone-build --enable-cors-header "*"
```

The **02 Enhance** step runs `src/workflows/seedvr2-upscale.json`, the API-format copy of the ComfyUI workflow `SeedVR/图片高清放大2K.json`: SeedVR2 7B Q4 GGUF, short edge 2048, no edge above 2048. Compare and Export show and download that result; there is no second pass.

It needs the [ComfyUI-SeedVR2_VideoUpscaler](https://github.com/numz/ComfyUI-SeedVR2_VideoUpscaler) nodes and `models/SEEDVR2/seedvr2_ema_7b-Q4_K_M.gguf` + `ema_vae_fp16.safetensors`. If you change the workflow in ComfyUI, re-export it with **Export (API)** and keep the node IDs in `NODE_IDS` (`App.jsx`) in sync.

`src/workflows/portrait-enhance.json` (Flux 2 Klein + Anything2Real LoRA, z-Image Turbo refine) is kept for reference but not wired in: its models (`flux-2-klein-4b-fp8`, `qwen_3_4b`, `z_image_turbo_bf16`, `zImageTurboVAE_v10`, the Anything2Real LoRA) aren't part of the local install.

---

## Adding more feature sections

The 3 existing feature sections (Identity / Resolution / Lighting) all use the same `<FeatureSection />` component in `Home.jsx`. To add a 4th:

```jsx
<FeatureSection
  eyebrow="04 / Your section"
  headline="Section headline."
  body="One or two sentences of body copy."
  stats={[
    { value: '99.9%', label: 'metric' },
    { value: '2×',    label: 'metric' },
  ]}
  ctaText="Learn more →"
  beforeSVG={<YourBefore />}
  afterSVG={<YourAfter />}
  compareSide="right"     // or "left" — alternate for rhythm
  bg="white"              // or "cream"
  labels={['Before', 'After']}
/>
```

---

## Troubleshooting

See `TROUBLESHOOTING.md`. Short version: if Home is blank, stop and restart `npm run dev` (90% of cases).

---

## License

Use freely for RealLife AI. No other claims.
