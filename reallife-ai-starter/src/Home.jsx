import CompareSlider from './CompareSlider'

// ============================================================
// RealLife AI — Homepage (Topaz-inspired commercial layout)
// Sections: Nav · Hero · Trusted by · Identity · Resolution ·
//           Lighting · Presets · Use cases · Pricing CTA · Footer
//
// All portrait artwork is placeholder SVG. Swap each
// XxxBefore / XxxAfter component below with real <img> tags
// pointing at your before/after assets for production.
// ============================================================

// ----------------------------------------------------------------
// Shared — portrait silhouette + palette map + marquee
// ----------------------------------------------------------------

// Three-color palettes keyed per section. Before = muddy/flat, After = clean/warm (Image 2 style).
const PORTRAIT = {
  heroBefore:     { bg: '#8F8270', head: '#7A6B58', body: '#3D2F23' },
  heroAfter:      { bg: '#E8DCC0', head: '#C9A586', body: '#6A4A33' },
  identityBefore: { bg: '#A89D8A', head: '#8A7A67', body: '#53402D' },
  identityAfter:  { bg: '#E8DCC0', head: '#C9A586', body: '#6A4A33' },
  resBefore:      { bg: '#BDB3A0', head: '#A89A85', body: '#6B5842' },
  resAfter:       { bg: '#E8DCC0', head: '#D4AE88', body: '#5E3F28' },
  lightBefore:    { bg: '#8C8172', head: '#998774', body: '#544230' },
  lightAfter:     { bg: '#EFE3C4', head: '#D4AE8A', body: '#5E3F28' },
}

// Clean avatar-style silhouette — just bg + head + body, no facial features.
// Swap the SVG for an <img> tag in production to use real before/after photos.
function PortraitSilhouette({ palette, landscape = false }) {
  if (landscape) {
    return (
      <svg viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" className="w-full h-full block">
        <rect width="960" height="540" fill={palette.bg} />
        <circle cx="480" cy="205" r="80" fill={palette.head} />
        <path d="M 340 540 Q 340 340 480 330 Q 620 340 620 540 Z" fill={palette.body} />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="w-full h-full block">
      <rect width="400" height="500" fill={palette.bg} />
      <circle cx="200" cy="175" r="75" fill={palette.head} />
      <path d="M 50 500 Q 50 305 200 295 Q 350 305 350 500 Z" fill={palette.body} />
    </svg>
  )
}

// Seamless horizontal marquee. Duplicates items so the loop has no visible seam.
// Pauses on hover; respects prefers-reduced-motion (handled in index.css).
// Duration accepts any CSS time string; direction 'normal' or 'reverse'.
function MarqueeRow({ items, duration = '28s', direction = 'normal' }) {
  const doubled = [...items, ...items]
  return (
    <div
      className="overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
      }}
    >
      <div
        className="rl-marquee flex gap-14 items-center hover:[animation-play-state:paused]"
        style={{
          width: 'max-content',
          animationDuration: duration,
          animationDirection: direction,
        }}
      >
        {doubled.map((item, i) => (
          <div
            key={i}
            className="text-soft-faint whitespace-nowrap"
            aria-hidden={i >= items.length ? 'true' : undefined}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Logo lockups — geometric mark + wordmark pairs for the marquee.
// Each mark is a 14×14 SVG inheriting currentColor from the lockup
// wrapper (text-soft-faint). Swap with real partner/media SVG
// before launch — or delete the Featured in row if there's no
// real press to cite yet.
// ----------------------------------------------------------------

// Shared SVG wrapper — 14×14, stroked in currentColor, shrink-0 so
// flex gap stays honest.
const Mark = ({ children }) => (
  <svg
    width="14" height="14" viewBox="0 0 14 14"
    fill="none" stroke="currentColor" strokeWidth="1.3"
    className="shrink-0"
  >
    {children}
  </svg>
)

function LogoLockup({ mark, name, tracking = '0.18em' }) {
  return (
    <div className="flex items-center gap-2.5 text-soft-faint">
      {mark}
      <span
        className="text-[13px] font-medium"
        style={{ letterSpacing: tracking }}
      >
        {name}
      </span>
    </div>
  )
}

// Creator / studio data — draw is a function returning SVG children (rendered
// fresh each TrustedBy render, so React reconciler never sees shared elements).
// Fictitious placeholders — swap for real partner logos before launch.
const creatorData = [
  { name: 'STUDIO L',        draw: () => (<><rect x="1" y="1" width="12" height="12"/><path d="M 5 4 L 5 10 L 9 10"/></>) },
  { name: 'OBSCURA',         draw: () => (<><circle cx="7" cy="7" r="5.5"/><circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/></>) },
  { name: 'F/8',             draw: () => (<><polygon points="7,1.5 12.5,4.5 12.5,9.5 7,12.5 1.5,9.5 1.5,4.5"/><circle cx="7" cy="7" r="2"/></>) },
  { name: 'NORTH COAST',     draw: () => (<path d="M 1 11 L 5 5 L 7.5 8 L 10 4 L 13 11 Z"/>) },
  { name: 'STILL. PROJECT',  draw: () => (<><rect x="1" y="3" width="12" height="9"/><rect x="5" y="1" width="4" height="2"/><circle cx="7" cy="7.5" r="2.5"/></>) },
  { name: 'ATRIUM',          draw: () => (<><path d="M 1 12 L 1 6 A 6 6 0 0 1 13 6 L 13 12"/><line x1="1" y1="12" x2="13" y2="12"/></>) },
  { name: 'MERIDIAN',        draw: () => (<><line x1="1" y1="7" x2="13" y2="7"/><circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/></>) },
]

// Media / publication data — same structure.
// Replace with real press (PetaPixel / No Film School / fstoppers,
// etc.) or delete the whole Featured in row until there's real press.
const mediaData = [
  { name: 'FRAME & LIGHT',    draw: () => (<><rect x="1" y="1" width="12" height="12"/><rect x="4" y="4" width="6" height="6"/></>) },
  { name: 'THE RENDER',       draw: () => (<><rect x="1" y="1" width="5" height="5"/><rect x="8" y="1" width="5" height="5"/><rect x="1" y="8" width="5" height="5"/><rect x="8" y="8" width="5" height="5"/></>) },
  { name: 'PIXEL QUARTERLY',  draw: () => (<><circle cx="3.5" cy="3.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="10.5" cy="3.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="3.5" cy="10.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="10.5" cy="10.5" r="1.2" fill="currentColor" stroke="none"/></>) },
  { name: 'NO STUDIO REVIEW', draw: () => (<><line x1="1.5" y1="12.5" x2="12.5" y2="1.5"/><line x1="2" y1="2" x2="5" y2="5"/><line x1="9" y1="9" x2="12" y2="12"/></>) },
  { name: 'CREATIVE TECH',    draw: () => (<polygon points="7,1.5 12.5,12 1.5,12" fill="currentColor" stroke="none"/>) },
  { name: 'IN.FRAME',         draw: () => (<><rect x="1" y="1" width="12" height="12"/><rect x="3.5" y="3.5" width="7" height="7"/><rect x="5.5" y="5.5" width="3" height="3"/></>) },
  { name: 'NEW LENS',         draw: () => (<><circle cx="7" cy="7" r="5.5"/><circle cx="7" cy="7" r="3"/><circle cx="7" cy="7" r="0.8" fill="currentColor" stroke="none"/></>) },
]

// ----------------------------------------------------------------
// Nav
// ----------------------------------------------------------------
function Nav() {
  const links = ['Products', 'Learn', 'Pricing', 'About']
  return (
    <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-hairline">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-5 md:px-8 lg:px-12 py-6 gap-4">
        <div className="text-xl font-semibold tracking-tight">
          RealLife <span className="text-soft-faint">AI</span>
        </div>
        {/* Middle nav — hidden on mobile (< md). Menu would trade up to a hamburger drawer in a fuller build. */}
        <div className="hidden md:flex gap-8 text-base">
          {links.map(l => (
            <a key={l} href="#" className="hover:opacity-60 transition-opacity">{l}</a>
          ))}
        </div>
        {/* Spacer keeps grid columns balanced when middle is hidden */}
        <div className="md:hidden" aria-hidden="true" />
        <div className="justify-self-end flex items-center gap-3 md:gap-4">
          <a href="#" className="hidden sm:inline text-base hover:opacity-60 transition-opacity">Sign in</a>
          <a
            href="#app"
            className="bg-ink text-white px-6 py-3 rounded-full text-base font-medium hover:bg-neutral-800 transition-colors whitespace-nowrap"
          >
            Try free
          </a>
        </div>
      </div>
    </nav>
  )
}

// ----------------------------------------------------------------
// §01 — Hero
// ----------------------------------------------------------------
const HeroBefore = () => <PortraitSilhouette palette={PORTRAIT.heroBefore} landscape />
const HeroAfter = () => <PortraitSilhouette palette={PORTRAIT.heroAfter} landscape />

function Hero() {
  return (
    <section className="max-w-screen-2xl mx-auto px-5 md:px-8 lg:px-12 pt-16 md:pt-20 pb-10 md:pb-12">
      <div className="text-xs font-medium uppercase tracking-[0.08em] text-soft-muted mb-6">
        AI portrait enhancement
      </div>
      <h1 className="text-[40px] sm:text-[52px] md:text-[72px] font-medium leading-[1.02] tracking-[-0.03em] max-w-3xl">
        Photoreal portraits.
      </h1>
      <h1 className="text-[40px] sm:text-[52px] md:text-[72px] font-normal leading-[1.02] tracking-[-0.03em] text-soft-faint max-w-3xl mb-7">
        Still unmistakably you.
      </h1>
      <p className="text-[16px] md:text-[17px] leading-relaxed text-soft max-w-xl mb-8">
        Enhance resolution, clarity, and lighting without shifting a single feature.
        Trained on faces. Tuned to preserve identity to ±0.003 landmark delta.
      </p>
      <div className="flex gap-4 items-center mb-12">
        <a
          href="#app"
          className="bg-ink text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-neutral-800 transition-colors"
        >
          Try free
        </a>
        <a href="#" className="text-sm font-medium hover:opacity-60 transition-opacity">
          See examples →
        </a>
      </div>
      <CompareSlider
        before={<HeroBefore />}
        after={<HeroAfter />}
        labelBefore="Before"
        labelAfter="After · RealLife AI"
        aspectRatio="16 / 9"
        size="lg"
        accentOnEnd
      />
    </section>
  )
}

// ----------------------------------------------------------------
// §02 — Trusted by
// ----------------------------------------------------------------
function TrustedBy() {
  // Build fresh lockup elements each render so React's reconciler never
  // sees the same element object in both halves of MarqueeRow's `doubled`
  // array — this avoids an obscure stale-element bug in some Vite setups.
  const toLockups = (data) =>
    data.map(d => (
      <LogoLockup key={d.name} mark={<Mark>{d.draw()}</Mark>} name={d.name} />
    ))
  const creatorLockups = toLockups(creatorData)
  const mediaLockups = toLockups(mediaData)

  return (
    <section className="bg-cream py-12 border-y border-hairline">
      <div className="mb-8">
        <div className="text-center text-xs font-medium uppercase tracking-[0.16em] text-soft-faint mb-5">
          Trusted by creators at
        </div>
        <MarqueeRow items={creatorLockups} duration="34s" />
      </div>
      <div>
        <div className="text-center text-xs font-medium uppercase tracking-[0.16em] text-soft-faint mb-5">
          Featured in
        </div>
        <MarqueeRow items={mediaLockups} duration="28s" direction="reverse" />
      </div>
    </section>
  )
}

// ----------------------------------------------------------------
// Reusable feature section (used by §03 Identity, §04 Resolution, §05 Lighting)
// ----------------------------------------------------------------
function FeatureSection({
  eyebrow,
  headline,
  body,
  stats,
  ctaText = 'Learn more →',
  beforeSVG,
  afterSVG,
  compareSide = 'left', // 'left' or 'right'
  bg = 'white',          // 'white' or 'cream'
  labels,
}) {
  const textBlock = (
    <div>
      <div className="text-xs font-medium uppercase tracking-[0.08em] text-soft-muted mb-4">
        {eyebrow}
      </div>
      <h2 className="text-[32px] md:text-[44px] font-medium leading-[1.05] tracking-[-0.025em] mb-4 max-w-md">
        {headline}
      </h2>
      <p className="text-base leading-relaxed text-soft mb-6 max-w-md">{body}</p>
      {stats && (
        <div className="flex gap-8 mb-6">
          {stats.map((s, i) => (
            <div key={i}>
              <div className="text-[28px] font-medium tracking-[-0.02em] leading-none mb-1">
                {s.value}
              </div>
              <div className="text-xs text-soft-faint">{s.label}</div>
            </div>
          ))}
        </div>
      )}
      <a href="#" className="text-sm font-medium hover:opacity-60 transition-opacity">
        {ctaText}
      </a>
    </div>
  )

  const compareBlock = (
    <CompareSlider
      before={beforeSVG}
      after={afterSVG}
      labelBefore={labels?.[0] || 'Before'}
      labelAfter={labels?.[1] || 'After'}
      aspectRatio="4 / 5"
      size="md"
    />
  )

  return (
    <section className={`py-16 md:py-20 px-5 md:px-8 lg:px-12 border-t border-hairline ${bg === 'cream' ? 'bg-cream' : 'bg-white'}`}>
      <div className="max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
        {compareSide === 'left' ? (
          <>
            {compareBlock}
            {textBlock}
          </>
        ) : (
          <>
            {textBlock}
            {compareBlock}
          </>
        )}
      </div>
    </section>
  )
}

// ----- §03 Identity silhouettes -----
const IdentityBefore = () => <PortraitSilhouette palette={PORTRAIT.identityBefore} />
const IdentityAfter = () => <PortraitSilhouette palette={PORTRAIT.identityAfter} />

// ----- §04 Resolution silhouettes -----
const ResolutionBefore = () => <PortraitSilhouette palette={PORTRAIT.resBefore} />
const ResolutionAfter = () => <PortraitSilhouette palette={PORTRAIT.resAfter} />

// ----- §05 Lighting silhouettes -----
const LightingBefore = () => <PortraitSilhouette palette={PORTRAIT.lightBefore} />
const LightingAfter = () => <PortraitSilhouette palette={PORTRAIT.lightAfter} />

// ----------------------------------------------------------------
// §06 — Presets grid
// ----------------------------------------------------------------
function PresetsGrid() {
  // Shared "before" palette — a muted grey baseline that every preset departs from.
  const before = { bg: '#C4B8A3', face: '#9A8D77', hair: '#4C4239' }

  const presets = [
    { name: 'Natural',     desc: 'Daylight-accurate, true-to-life tones.',       bg: '#EEE0C4', face: '#C59A74', hair: '#6B4F38' },
    { name: 'Cinematic',   desc: 'Teal-orange grade, film-stock highlights.',    bg: '#1F3940', face: '#D9A676', hair: '#3A2C1E' },
    { name: 'Studio',      desc: 'High-key, clean, commercial finish.',           bg: '#EFECE6', face: '#D0BBA5', hair: '#4A3F36' },
    { name: 'Documentary', desc: 'Muted, honest, unflattering in a good way.',    bg: '#6C655C', face: '#A8937D', hair: '#2E281F' },
  ]

  const PresetPortrait = ({ palette }) => (
    <svg viewBox="0 0 160 200" preserveAspectRatio="xMidYMid slice" className="w-full h-full block">
      <rect width="160" height="200" fill={palette.bg} />
      <circle cx="80" cy="72" r="30" fill={palette.face} />
      <path d="M 20 200 Q 20 125 80 120 Q 140 125 140 200 Z" fill={palette.hair} />
    </svg>
  )

  return (
    <section className="py-16 md:py-20 px-5 md:px-8 lg:px-12 bg-cream border-t border-hairline">
      {/* Scoped styles — Tailwind arbitrary-variant clip-path doesn't always compile reliably,
          so we handle the reveal here with plain CSS. Applies only inside PresetsGrid. */}
      <style>{`
        .preset-card:hover .preset-after { clip-path: inset(0 0 0 50%); }
      `}</style>
      <div className="max-w-screen-2xl mx-auto">
        <div className="max-w-md mb-10">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-soft-muted mb-4">
            04 / Four styles, one identity
          </div>
          <h2 className="text-[30px] sm:text-[32px] md:text-[44px] font-medium leading-[1.05] tracking-[-0.025em] mb-4">
            Presets that know when to stop.
          </h2>
          <p className="text-base leading-relaxed text-soft">
            Every preset is identity-aware. Cinematic shifts the grade, not the face. Hover a card to peek at the before.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {presets.map(p => (
            <div
              key={p.name}
              className="preset-card group bg-white rounded-xl border border-hairline overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-ink"
            >
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4 / 5' }}>
                {/* Before layer — muted baseline, always underneath */}
                <div className="absolute inset-0">
                  <PresetPortrait palette={before} />
                </div>
                {/* After layer — preset style, clips to right half on hover */}
                <div
                  className="preset-after absolute inset-0 transition-[clip-path] duration-500 ease-out"
                  style={{ clipPath: 'inset(0 0 0 0)' }}
                >
                  <PresetPortrait palette={p} />
                </div>
                {/* Vertical divider — fades in on hover */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                {/* Corner labels — fade in on hover */}
                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="absolute top-2 left-2 bg-white/90 text-ink text-[9px] font-medium tracking-wider px-1.5 py-0.5 rounded-full">
                    BEFORE
                  </span>
                  <span className="absolute top-2 right-2 bg-ink text-white text-[9px] font-medium tracking-wider px-1.5 py-0.5 rounded-full">
                    AFTER
                  </span>
                </div>
              </div>
              <div className="p-3.5">
                <div className="text-sm font-medium mb-1">{p.name}</div>
                <div className="text-xs text-soft-muted leading-snug">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ----------------------------------------------------------------
// §07 — Use cases
// ----------------------------------------------------------------
function UseCases() {
  const cases = [
    {
      title: 'Filmmakers',
      desc: 'Preserve talent likeness across every stage of the edit and delivery pipeline.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="0.75" y="3.75" width="4" height="14.5" stroke="currentColor" strokeWidth="1.3" />
          <rect x="8.75" y="3.75" width="4" height="14.5" stroke="currentColor" strokeWidth="1.3" />
          <rect x="16.75" y="3.75" width="4" height="14.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      ),
    },
    {
      title: 'AI creators',
      desc: 'Identity-safe upscale for character LoRAs and generative portraits.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M 11 2 L 11 20 M 2 11 L 20 11 M 4.5 4.5 L 17.5 17.5 M 17.5 4.5 L 4.5 17.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: 'Photographers',
      desc: 'Portrait retouching that respects the subject, not erases them.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="9.25" stroke="currentColor" strokeWidth="1.3" />
          <path d="M 11 2 L 11 11 L 19 14 M 11 11 L 3 14 M 11 11 L 11 20" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: 'Archivists',
      desc: 'Restore historical portraits without reinventing who the sitter was.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="2.75" y="4.75" width="12" height="14.5" stroke="currentColor" strokeWidth="1.3" />
          <rect x="6.75" y="0.75" width="12" height="14.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      ),
    },
  ]
  return (
    <section className="py-16 md:py-20 px-5 md:px-8 lg:px-12 bg-white border-t border-hairline">
      <div className="max-w-screen-2xl mx-auto">
        <div className="max-w-md mb-10">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-soft-muted mb-4">
            05 / Who it's for
          </div>
          <h2 className="text-[32px] md:text-[44px] font-medium leading-[1.05] tracking-[-0.025em]">
            Built for people who take faces seriously.
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {cases.map(c => (
            <div key={c.title} className="text-ink">
              <div className="mb-4">{c.icon}</div>
              <div className="text-[15px] font-medium mb-1.5">{c.title}</div>
              <div className="text-[13px] text-soft-muted leading-relaxed">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ----------------------------------------------------------------
// §08 — Pricing CTA (dark)
// ----------------------------------------------------------------
function PricingCTA() {
  return (
    <section className="bg-ink text-white text-center px-5 md:px-8 lg:px-12 pt-20 md:pt-24 pb-16 md:pb-20">
      <div className="max-w-3xl mx-auto">
        <div className="text-xs font-medium uppercase tracking-[0.08em] text-soft-faint mb-4">
          Simple pricing
        </div>
        <h2 className="text-[40px] md:text-[56px] font-medium leading-[1.05] tracking-[-0.025em] mb-4">
          Every tool. One plan.
        </h2>
        <p className="text-[17px] leading-relaxed text-soft-faint max-w-md mx-auto mb-8">
          $19/mo after the free trial. Cancel any time. All presets, all resolutions, all updates included.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a
            href="#app"
            className="bg-white text-ink px-6 py-3 rounded-full text-sm font-medium hover:bg-neutral-200 transition-colors"
          >
            Start free trial
          </a>
          <a href="#" className="text-white px-6 py-3 text-sm font-medium hover:opacity-60 transition-opacity">
            Compare plans →
          </a>
        </div>
      </div>
    </section>
  )
}

// ----------------------------------------------------------------
// Footer
// ----------------------------------------------------------------
function Footer() {
  const groups = [
    { title: 'Product', links: ['Download', 'Pricing', 'Changelog', 'Roadmap'] },
    { title: 'Company', links: ['About', 'Research', 'Blog', 'Press'] },
    { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Data'] },
  ]
  const social = ['Twitter', 'Instagram', 'YouTube']
  return (
    <footer className="bg-ink text-white px-5 md:px-8 lg:px-12 py-14">
      <div className="max-w-screen-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-8 md:gap-10 mb-12">
          <div>
            <div className="text-base font-semibold mb-3">
              RealLife <span className="text-soft-muted">AI</span>
            </div>
            <p className="text-[13px] text-soft-faint leading-relaxed max-w-[260px] mb-5">
              Occasional notes on new presets, identity research, and creator spotlights.
            </p>
            <form
              className="flex gap-2 items-center"
              onSubmit={(e) => {
                e.preventDefault()
                // TODO: wire up to your newsletter endpoint
                const email = e.target.email.value
                console.log('Subscribe:', email)
              }}
            >
              <input
                type="email"
                name="email"
                required
                placeholder="your@email.com"
                className="bg-transparent border border-[#4A4640] rounded-full px-4 py-2.5 text-[13px] text-white placeholder:text-soft-faint focus:outline-none focus:border-white w-[180px]"
              />
              <button
                type="submit"
                className="bg-white text-ink px-4 py-2.5 rounded-full text-[13px] font-medium hover:bg-neutral-200 transition-colors whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
          {groups.map(g => (
            <div key={g.title}>
              <div className="text-xs font-medium uppercase tracking-[0.08em] mb-4">
                {g.title}
              </div>
              {g.links.map(l => (
                <a
                  key={l}
                  href="#"
                  className="block py-1 text-sm text-soft-faint hover:text-white transition-colors"
                >
                  {l}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-6 border-t border-[#1F1D1B] flex-wrap gap-3">
          <div className="text-xs text-soft-muted">© 2025 RealLife AI, Inc.</div>
          <div className="flex gap-4">
            {social.map(s => (
              <a
                key={s}
                href="#"
                className="text-sm text-soft-faint hover:text-white transition-colors"
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

// ----------------------------------------------------------------
// Root
// ----------------------------------------------------------------
export default function Home() {
  return (
    <div
      className="bg-white text-ink min-h-screen"
      style={{ fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}
    >
      <Nav />
      <Hero />
      <TrustedBy />

      <FeatureSection
        eyebrow="01 / The identity engine"
        headline="The only enhancer that tracks your face."
        body="Our model locks onto 68 facial landmarks before a single pixel moves. You get sharper skin, cleaner light, and richer tones — while every feature stays exactly where it was."
        stats={[
          { value: '±0.003', label: 'landmark delta' },
          { value: '4,200', label: 'test portraits' },
        ]}
        ctaText="Read the research →"
        beforeSVG={<IdentityBefore />}
        afterSVG={<IdentityAfter />}
        compareSide="left"
      />

      <FeatureSection
        eyebrow="02 / Pixel-level precision"
        headline={<>4× resolution.<br />Still real.</>}
        body="Upscale to 12K without the hallucinated eyelashes, waxy skin, or invented stubble that plague most AI enhancers. Every added pixel is inferred from the original, not fabricated."
        stats={[
          { value: '12K', label: 'max output' },
          { value: '0', label: 'hallucinated features' },
        ]}
        ctaText="Technical details →"
        beforeSVG={<ResolutionBefore />}
        afterSVG={<ResolutionAfter />}
        compareSide="right"
        labels={['Before · 1×', 'After · 4×']}
      />

      <FeatureSection
        eyebrow="03 / Light and tone"
        headline="Fix the light. Keep the mood."
        body="Recover shadow detail, balance highlights, and correct color casts without flattening the image's emotional register. The lighting model is trained on cinema stills, not stock photography."
        stats={[
          { value: '12 EV', label: 'dynamic range' },
          { value: '3 modes', label: 'reshape · balance · lift' },
        ]}
        ctaText="See the model →"
        beforeSVG={<LightingBefore />}
        afterSVG={<LightingAfter />}
        compareSide="left"
        bg="cream"
      />

      <PresetsGrid />
      <UseCases />
      <PricingCTA />
      <Footer />
    </div>
  )
}
