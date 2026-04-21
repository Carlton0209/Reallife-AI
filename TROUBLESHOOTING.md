# Home preview — troubleshooting

If `npm run dev` starts but `/` shows a blank page, work through this list in order. Each item is a real cause we've seen break this exact project.

## 1. Restart the dev server after editing `tailwind.config.js`

This is the most common cause.

Vite picks up JS/JSX changes via HMR, but **Tailwind's JIT does not rescan its config** when the config file changes. Our homepage uses tokens (`bg-cream`, `text-soft`, `text-soft-muted`, `text-soft-faint`) that only exist after a full restart.

```bash
# Stop the dev server (Ctrl+C), then:
npm run dev
```

If `bg-cream` and the `text-soft-*` classes compile correctly, the TrustedBy section will have its warm off-white background and all body copy will render in the correct gray. If they don't, those sections will look "blank" because elements have default transparent backgrounds and black-on-white text with no hierarchy.

## 2. Check the browser console (F12 → Console)

`main.jsx` wraps the app in an `ErrorBoundary`. If a runtime error happens during render, it prints to the console AND shows a red error panel on the page with a stack trace and a "Try again" button. You should never see a truly blank screen.

If you see the ErrorBoundary panel, read the stack trace. The top line tells you which component threw.

## 3. Verify the URL

The app uses hash routing:

| URL | Renders |
|-----|---------|
| `http://localhost:5173/` | `Home.jsx` (marketing homepage) |
| `http://localhost:5173/#app` | `App.jsx` (Swiss product UI) |

If you opened `#app` in a previous session and your browser restored the URL, you're seeing the product UI instead of the homepage. Clear the hash (delete `#app` from the URL) and reload.

## 4. Verify all files exist in `src/`

```bash
ls src/
# Expected:
# App.jsx        — Swiss product UI (upload → enhance → compare → export)
# Home.jsx       — Topaz-inspired marketing homepage
# CompareSlider.jsx — shared drag-to-compare used by both
# main.jsx       — entry point + hash router + ErrorBoundary
# index.css      — base styles, marquee keyframes, Google Fonts import
```

## 5. Dependencies installed?

```bash
npm install
```

If you skipped this after pulling in the new files, `react-dom/client` and friends won't resolve.

## 6. Spot-check `tailwind.config.js`

The config must have these tokens inside `theme.extend.colors` (in addition to the existing Swiss tokens):

```js
cream: '#FAF8F3',
soft: {
  DEFAULT: '#5C5B58',
  muted:   '#6B6864',
  faint:   '#9C9A95',
},
```

If you see only the Swiss tokens (`ink`, `paper`, `hairline`, etc.), the additive update didn't apply. Either restore it manually or re-pull the file.

## 7. Spot-check `index.css`

It must include these blocks:

- `@import url('https://fonts.googleapis.com/css2?family=Inter+Tight...')` at the top
- The three `@tailwind` directives
- The `.rl-marquee` keyframes (`@keyframes rl-marquee`)
- The `prefers-reduced-motion` override for `.rl-marquee`

If the marquee keyframes are missing, the TrustedBy section renders but the logos are frozen. That's not a blank-page symptom, just a dead animation.

## 8. Last resort — bypass the hash router

If Home still doesn't render, temporarily force it. In `main.jsx`, swap `<Root />` for `<Home />`:

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Home />
    </ErrorBoundary>
  </React.StrictMode>
)
```

- If Home renders now → the hash router had stale state. Revert and hard-reload (Ctrl+Shift+R).
- If Home still doesn't render → the issue is inside Home.jsx. Check the console for the exact error and share it.

## 9. Clean rebuild (nuclear option)

```bash
rm -rf node_modules dist .vite
npm install
npm run dev
```

This wipes all cached build artifacts. If a partial build was stuck (rare but happens with Tailwind), this forces a clean slate.

---

## Known non-issues

These look like problems but aren't:

- **Google Fonts warning in console** — `Inter Tight` may take a second to load; system sans fallback renders first. Not a blocker.
- **React warning about `<style>` inside a list** — The PresetsGrid section emits one scoped `<style>` block per PresetsGrid mount. Harmless, but if you care, promote it into `index.css` under a `@layer components` block.
- **"key prop" warnings** — LogoLockup data is rendered with keys inside TrustedBy. If you see a key warning, it's likely elsewhere (not here).
