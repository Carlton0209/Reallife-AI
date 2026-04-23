import { useState, useRef, useEffect } from 'react'
import CompareSlider from './CompareSlider'
import { runEnhance } from './lib/comfyui'
import workflowTemplate from './workflows/portrait-enhance.json'

// ============================================================
// RealLife AI — Swiss Minimalist UI
// Flow: upload → enhance → compare → export
// ============================================================

// Wiring between the Swiss 4-step UI and the ComfyUI workflow.
// These keys MUST match the node IDs in src/workflows/portrait-enhance.json.
//   input  = LoadImage node (receives the uploaded filename)
//   output = SaveImage node (final 2× upscaled result)
//   prompt = CR Prompt Text node (lets style presets change the prompt)
//   seed1 = primary KSampler (Flux 2 Klein stage)
//   seed2 = advanced KSampler (z-Image Turbo stage)
const NODE_IDS = {
  input:  '28',
  output: '94',
  prompt: '61',
  seed1:  '53',
  seed2:  '95',
}

// Style presets — each overrides the prompt text injected into node 61.
// Keep these short and photo-oriented; the LoRA does the heavy lifting.
const PRESET_PROMPTS = {
  natural:     '2k, 4K, natural daylight, true-to-life skin tones, photographic texture',
  cinematic:   '2k, 4K, cinematic grade, teal-orange, film stock highlights, shallow depth of field',
  studio:      '2k, 4K, high-key studio lighting, commercial portrait, clean background, sharp detail',
  documentary: '2k, 4K, documentary style, natural candid light, honest skin texture, editorial',
}

const STEPS = [
  { id: 1, label: 'UPLOAD' },
  { id: 2, label: 'ENHANCE' },
  { id: 3, label: 'COMPARE' },
  { id: 4, label: 'EXPORT' },
]

const Mono = ({ children, className = '' }) => (
  <span className={`font-mono uppercase ${className}`}>{children}</span>
)

// ------------------------------------------------------------
// Header
// ------------------------------------------------------------
function Header({ currentStep }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center px-5 py-3.5 border-b border-hairline bg-white">
      <div className="text-[11px] font-medium tracking-[0.22em]">
        REALLIFE<span className="text-tertiary">&nbsp;·&nbsp;AI</span>
      </div>
      <div className="flex gap-5 font-mono text-[10px] tracking-[0.12em]">
        {STEPS.map(s => (
          <span
            key={s.id}
            className={s.id === currentStep ? 'text-ink font-medium' : 'text-tertiary'}
          >
            {String(s.id).padStart(2, '0')}&nbsp;&nbsp;{s.label}
          </span>
        ))}
      </div>
      <div className="justify-self-end flex items-center gap-2.5 font-mono text-[10px] tracking-[0.12em] text-secondary">
        <span></span>
        <div className="w-[22px] h-[22px] border border-hairline rounded-full" />
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// 01 — Upload
// ------------------------------------------------------------
function UploadView({ onFileSelected }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    onFileSelected({ file, url, name: file.name, size: file.size })
  }

  return (
    <div className="bg-white">
      <div className="p-5">
        <div
          className={`border border-dashed p-11 text-center transition-colors cursor-pointer ${
            dragging
              ? 'border-ink bg-concrete-light'
              : 'border-tertiary bg-paper hover:border-ink hover:bg-concrete-light'
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFile(e.dataTransfer.files[0])
          }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" className="mx-auto mb-4">
            <rect x="0.5" y="0.5" width="27" height="27" fill="none" stroke="#0A0A0A" strokeWidth="0.5" />
            <path d="M 14 21 L 14 9 M 8.5 14.5 L 14 9 L 19.5 14.5" stroke="#0A0A0A" strokeWidth="1" fill="none" strokeLinecap="square" />
          </svg>
          <div className="text-[15px] mb-2">Drop your image here</div>
          <Mono className="text-[10px] text-secondary tracking-[0.14em]">
            JPG&nbsp;·&nbsp;PNG&nbsp;·&nbsp;HEIC&nbsp;&nbsp;·&nbsp;&nbsp;MAX&nbsp;20MB
          </Mono>
          <div className="mt-5">
            <button
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
              className="border border-ink bg-transparent px-5 py-2 font-mono text-[10px] tracking-[0.18em] hover:bg-ink hover:text-white transition-colors"
            >
              BROWSE FILES
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>
      <div className="border-t border-hairline px-5 py-3.5">
        <Mono className="text-[10px] text-secondary tracking-[0.14em] block mb-2.5">RECENT</Mono>
        <div className="flex gap-1.5">
          {['#4a463d', '#6b675c', '#8b867a', '#cdc7b6'].map((c, i) => (
            <div
              key={i}
              className="w-[54px] h-[54px] cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// 02 — Enhance (real ComfyUI API call)
// ------------------------------------------------------------
function EnhanceView({ imageData, preset, onComplete, onCancel }) {
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [stage, setStage] = useState('Starting')
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (!imageData?.file) {
      setErrorMsg('No file to enhance')
      return
    }

    const controller = new AbortController()
    const start = Date.now()
    const tick = setInterval(() => setElapsed((Date.now() - start) / 1000), 100)

    // Deep clone so we can safely mutate per-run (seed, prompt, input filename)
    const workflow = JSON.parse(JSON.stringify(workflowTemplate))

    // 1. Swap in the preset's prompt (node 61)
    if (workflow[NODE_IDS.prompt]) {
      workflow[NODE_IDS.prompt].inputs.prompt =
        PRESET_PROMPTS[preset] || PRESET_PROMPTS.natural
    }

    // 2. Randomize seeds so repeat runs look a bit different
    //    Use Math.random * 1e15 — within JS safe-int range and matches ComfyUI's seed format
    if (workflow[NODE_IDS.seed1]) {
      workflow[NODE_IDS.seed1].inputs.seed = Math.floor(Math.random() * 1e15)
    }
    if (workflow[NODE_IDS.seed2]) {
      workflow[NODE_IDS.seed2].inputs.noise_seed = Math.floor(Math.random() * 1e15)
    }

    runEnhance({
      file: imageData.file,
      workflowTemplate: workflow,
      inputNodeId: NODE_IDS.input,
      outputNodeId: NODE_IDS.output,
      onStage: setStage,
      onProgress: ({ value, max }) => {
        if (max > 0) setProgress((value / max) * 100)
      },
      signal: controller.signal,
    })
      .then(({ enhancedUrl }) => {
        clearInterval(tick)
        setProgress(100)
        setTimeout(() => onComplete(enhancedUrl), 300)
      })
      .catch((err) => {
        clearInterval(tick)
        if (err.message === 'Aborted') return  // user hit cancel — don't show error
        console.error('Enhance failed:', err)
        setErrorMsg(err.message)
      })

    return () => {
      controller.abort()
      clearInterval(tick)
    }
  }, [imageData, preset, onComplete])

  // Error state
  if (errorMsg) {
    return (
      <div className="bg-white">
        <div className="p-5">
          <div className="border border-accent text-ink p-4 font-mono text-[11px] tracking-[0.06em] leading-6">
            <div className="text-accent mb-2">ENHANCEMENT FAILED</div>
            <div className="text-secondary">{errorMsg}</div>
            <div className="text-secondary mt-3 text-[10px]">
              Check: ComfyUI running at {import.meta.env.VITE_COMFY_URL || 'http://127.0.0.1:8188'} · CORS enabled · node IDs correct
            </div>
          </div>
        </div>
        <div className="border-t border-hairline px-5 py-4 flex justify-between items-center">
          <button
            onClick={onCancel}
            className="bg-transparent font-mono text-[10px] tracking-[0.14em] text-secondary hover:text-ink transition-colors"
          >
            ×&nbsp;&nbsp;CANCEL
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white">
      <div className="p-5">
        <div className="relative aspect-video bg-ink overflow-hidden">
          {imageData?.url && (
            <img src={imageData.url} alt="" className="w-full h-full object-cover opacity-55" />
          )}
          <div className="absolute top-3.5 right-4 flex items-center gap-2 text-white font-mono">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            <span className="text-[10px] tracking-[0.16em]">PROCESSING</span>
          </div>
        </div>
        <div className="mt-3.5">
          <div className="flex justify-between mb-2 font-mono text-[10px] tracking-[0.14em]">
            <span className="text-secondary">ENHANCEMENT IN PROGRESS</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-0.5 bg-hairline relative">
            <div
              className="h-full bg-ink transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      <div className="border-t border-hairline px-5 py-3.5 font-mono text-[10px] leading-7 text-secondary">
        <div>› preset: {preset}</div>
        <div>› flux 2 klein 4B + anything2real LoRA</div>
        <div>› z-image turbo refinement pass</div>
        <div className="text-ink">› {stage}...</div>
      </div>
      <div className="border-t border-hairline px-5 py-4 flex justify-between items-center">
        <button
          onClick={onCancel}
          className="bg-transparent font-mono text-[10px] tracking-[0.14em] text-secondary hover:text-ink transition-colors"
        >
          ×&nbsp;&nbsp;CANCEL
        </button>
        <div className="font-mono text-[10px] tracking-[0.14em] text-secondary">
          ELAPSED&nbsp;<span className="text-ink">{elapsed.toFixed(1)}s</span>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// CompareSlider is imported from './CompareSlider' — shared with Home.jsx.
// Swiss styling (square corners, small handle) via `rounded="0"` and `size="xs"`.
// ------------------------------------------------------------

// ------------------------------------------------------------
// 03 — Compare
// ------------------------------------------------------------
function CompareView({ imageData, preset, onPresetChange, onExport, onBack, onRerun }) {
  const [intensity, setIntensity] = useState(72)
  const [identityLock, setIdentityLock] = useState(true)
  const presets = Object.keys(PRESET_PROMPTS)

  const beforeUrl = imageData?.url
  const afterUrl = imageData?.enhancedUrl || imageData?.url

  const fileName = imageData?.name?.toUpperCase() || 'PORTRAIT.JPG'

  return (
    <div className="bg-white">
      <div className="p-5">
        <div className="flex justify-between mb-2.5 font-mono text-[10px] tracking-[0.14em] text-secondary">
          <span>BEFORE</span>
          <span>AFTER</span>
        </div>
        <CompareSlider
          before={beforeUrl ? <img src={beforeUrl} alt="before" className="w-full h-full object-cover" /> : null}
          after={afterUrl ? <img src={afterUrl} alt="after" className="w-full h-full object-cover" /> : null}
          aspectRatio="16 / 9"
          rounded="0"
          size="xs"
        />
        <div className="flex justify-between mt-2.5 font-mono text-[10px] tracking-[0.1em] text-secondary">
          <span>{fileName}</span>
          <span>PRESET&nbsp;{preset.toUpperCase()}&nbsp;&nbsp;·&nbsp;&nbsp;IDENTITY&nbsp;LOCKED</span>
        </div>
      </div>
      <div className="border-t border-hairline px-5 py-4 grid grid-cols-2 gap-8">
        <div>
          <div className="flex justify-between mb-2.5 font-mono text-[10px] tracking-[0.14em]">
            <span className="text-secondary">INTENSITY</span>
            <span>{(intensity / 100).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0" max="100" value={intensity}
            onChange={(e) => setIntensity(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Mono className="text-[10px] text-secondary tracking-[0.14em] block">IDENTITY LOCK</Mono>
            <div className="text-[11px] mt-0.5">Preserve facial structure</div>
          </div>
          <button
            onClick={() => setIdentityLock(!identityLock)}
            className={`w-9 h-5 rounded-full relative transition-colors ${identityLock ? 'bg-ink' : 'bg-concrete-dark'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${identityLock ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
      <div className="border-t border-hairline px-5 py-4">
        <div className="flex justify-between items-center mb-3">
          <Mono className="text-[10px] text-secondary tracking-[0.14em]">STYLE PRESET</Mono>
          <button
            onClick={onRerun}
            className="font-mono text-[10px] tracking-[0.14em] text-secondary hover:text-ink transition-colors"
            title="Rerun the workflow with the selected preset"
          >
            ↻&nbsp;&nbsp;RERUN
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {presets.map(p => (
            <button
              key={p}
              onClick={() => onPresetChange(p)}
              className={`px-3.5 py-1.5 border font-mono text-[10px] tracking-[0.14em] transition-colors ${
                preset === p
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-ink border-concrete-dark hover:border-secondary'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="border-t border-hairline px-5 py-4 flex justify-between items-center">
        <button
          onClick={onBack}
          className="bg-transparent font-mono text-[10px] tracking-[0.14em] text-secondary hover:text-ink transition-colors"
        >
          ←&nbsp;&nbsp;BACK
        </button>
        <button
          onClick={onExport}
          className="px-6 py-2.5 bg-ink text-white font-mono text-[10px] tracking-[0.18em] hover:opacity-85 transition-opacity"
        >
          EXPORT&nbsp;&nbsp;→
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// 04 — Export
// ------------------------------------------------------------
function ExportView({ imageData, onBack }) {
  const [resolution, setResolution] = useState(1)
  const [format, setFormat] = useState('JPG')
  const [colorProfile, setColorProfile] = useState('sRGB')

  // ComfyUI already outputs 2× upscaled, so 1× here = native output (~3840 long edge).
  // Further multipliers are client-side naive upscale via canvas.
  const sizeMap = {
    1: { dim: 'native',    size: '~12 MB' },
    2: { dim: '2× canvas', size: '~40 MB' },
    4: { dim: '4× canvas', size: '~160 MB' },
  }
  const current = sizeMap[resolution]

  const OptButton = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 border font-mono text-[10px] tracking-[0.14em] transition-colors ${
        active
          ? 'bg-ink text-white border-ink'
          : 'bg-transparent text-ink border-concrete-dark hover:border-secondary'
      }`}
    >
      {children}
    </button>
  )

  const handleDownload = async () => {
    const sourceUrl = imageData?.enhancedUrl || imageData?.url
    if (!sourceUrl) {
      console.warn('No image to download')
      return
    }

    const ext = format.toLowerCase() === 'tiff' ? 'png' : format.toLowerCase()
    const base = imageData?.name?.replace(/\.[^/.]+$/, '') || 'portrait'
    const filename = `${base}_reallife_${resolution}x.${ext}`

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = () => reject(new Error('Image failed to load'))
        img.src = sourceUrl
      })

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth * resolution
      canvas.height = img.naturalHeight * resolution
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'
      const quality = ext === 'jpg' ? 0.92 : undefined

      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Canvas encoding failed')
          return
        }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, mimeType, quality)
    } catch (err) {
      console.error('Download failed:', err)
      alert('Download failed — see console for details.')
    }
  }

  return (
    <div className="bg-white">
      <div className="p-5 grid grid-cols-2 gap-7">
        <div>
          <Mono className="text-[10px] text-secondary tracking-[0.14em] block mb-2.5">FINAL RESULT</Mono>
          <div className="aspect-square bg-ink overflow-hidden">
            {imageData?.url && (
              <img
                src={imageData.enhancedUrl || imageData.url}
                alt="result"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>
        <div>
          <div className="mb-5">
            <Mono className="text-[10px] text-secondary tracking-[0.14em] block mb-2.5">RESOLUTION</Mono>
            <div className="flex gap-1.5">
              {[1, 2, 4].map(r => (
                <OptButton key={r} active={resolution === r} onClick={() => setResolution(r)}>{r}×</OptButton>
              ))}
            </div>
          </div>
          <div className="mb-5">
            <Mono className="text-[10px] text-secondary tracking-[0.14em] block mb-2.5">FORMAT</Mono>
            <div className="flex gap-1.5">
              {['JPG', 'PNG', 'TIFF'].map(f => (
                <OptButton key={f} active={format === f} onClick={() => setFormat(f)}>{f}</OptButton>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <Mono className="text-[10px] text-secondary tracking-[0.14em] block mb-2.5">COLOR PROFILE</Mono>
            <div className="flex gap-1.5 flex-wrap">
              {['sRGB', 'P3', 'Adobe RGB'].map(c => (
                <OptButton key={c} active={colorProfile === c} onClick={() => setColorProfile(c)}>{c}</OptButton>
              ))}
            </div>
          </div>
          <div className="border-t border-hairline pt-3.5 font-mono text-[10px] tracking-[0.1em]">
            <div className="flex justify-between mb-1">
              <span className="text-secondary">DIMENSIONS</span>
              <span>{current.dim}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">ESTIMATED SIZE</span>
              <span>{current.size}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-hairline px-5 py-4 flex justify-between items-center">
        <button
          onClick={onBack}
          className="bg-transparent font-mono text-[10px] tracking-[0.14em] text-secondary hover:text-ink transition-colors"
        >
          ←&nbsp;&nbsp;BACK
        </button>
        <button
          onClick={handleDownload}
          className="px-6 py-2.5 bg-ink text-white font-mono text-[10px] tracking-[0.18em] hover:opacity-85 transition-opacity"
        >
          DOWNLOAD&nbsp;&nbsp;→
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Main App
// ------------------------------------------------------------
export default function App() {
  const [step, setStep] = useState(1)
  const [imageData, setImageData] = useState(null)
  const [preset, setPreset] = useState('natural')

  const reset = () => {
    if (imageData?.url) URL.revokeObjectURL(imageData.url)
    setImageData(null)
    setStep(1)
  }

  return (
    <div className="min-h-screen bg-concrete p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="border border-concrete-dark">
          <Header currentStep={step} />
          {step === 1 && (
            <UploadView onFileSelected={(data) => { setImageData(data); setStep(2) }} />
          )}
          {step === 2 && (
            <EnhanceView
              imageData={imageData}
              preset={preset}
              onComplete={(enhancedUrl) => {
                setImageData(prev => ({ ...prev, enhancedUrl }))
                setStep(3)
              }}
              onCancel={reset}
            />
          )}
          {step === 3 && (
            <CompareView
              imageData={imageData}
              preset={preset}
              onPresetChange={setPreset}
              onExport={() => setStep(4)}
              onBack={reset}
              onRerun={() => {
                // Drop the previous enhancedUrl and go back to Enhance step with current preset
                setImageData(prev => ({ ...prev, enhancedUrl: undefined }))
                setStep(2)
              }}
            />
          )}
          {step === 4 && (
            <ExportView imageData={imageData} onBack={() => setStep(3)} />
          )}
        </div>
        <div className="flex justify-between mt-3.5 font-mono text-[9px] tracking-[0.14em] text-tertiary">
          <span>REALLIFE&nbsp;AI&nbsp;—&nbsp;v2.0</span>
          <span>GRID&nbsp;12&nbsp;·&nbsp;BASELINE&nbsp;4PX</span>
        </div>
      </div>
    </div>
  )
}