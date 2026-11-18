import { useState, useRef, useEffect } from 'react'
import CompareSlider from './CompareSlider'
import { runEnhance } from './lib/comfyui'
import enhanceWorkflow from './workflows/seedvr2-upscale.json'

// ============================================================
// RealLife AI — Swiss Minimalist UI
// Flow: upload → enhance → compare → export
// ============================================================

// The Enhance step runs the SeedVR2 2K upscale. src/workflows/seedvr2-upscale.json is
// the API-format copy of the ComfyUI workflow user/default/workflows/SeedVR/图片高清放大2K.json
// (same models and settings; the bypassed resize node and the canvas-only Image Comparer
// are left out). Output: short edge 2048, no edge above 2048, each edge rounded down to
// an even number (e.g. 3840×2560 → 2048×1364, 640×800 → 1638×2048).
// These keys MUST match the node IDs in that file.
const NODE_IDS = {
  input:  '1',  // LoadImage — receives the uploaded file
  output: '6',  // SaveImage
}

const ENGINE_LABEL = 'SEEDVR2 7B · Q4 GGUF · 2K'

function probeImageSize(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Image failed to load'))
    img.src = url
  })
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
function EnhanceView({ imageData, onComplete, onCancel }) {
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

    // Deep clone: runEnhance writes the uploaded filename into the LoadImage node.
    // Everything else (seed 9527, models, 2048 limits) stays as in the ComfyUI workflow.
    const workflow = JSON.parse(JSON.stringify(enhanceWorkflow))

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
  }, [imageData, onComplete])

  // Error state
  if (errorMsg) {
    return (
      <div className="bg-white">
        <div className="p-5">
          <div className="border border-accent text-ink p-4 font-mono text-[11px] tracking-[0.06em] leading-6">
            <div className="text-accent mb-2">ENHANCEMENT FAILED</div>
            <div className="text-secondary">{errorMsg}</div>
            <div className="text-secondary mt-3 text-[10px]">
              Check: ComfyUI running at {import.meta.env.VITE_COMFY_URL || 'http://127.0.0.1:8188'} · CORS enabled · SeedVR2 nodes and models installed
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
        <div>› seedvr2 7B · Q4 GGUF</div>
        <div>› 2K: short edge 2048, long edge ≤ 2048</div>
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
function CompareView({ imageData, onExport, onBack }) {
  const [intensity, setIntensity] = useState(72)
  const [identityLock, setIdentityLock] = useState(true)

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
          <span>SEEDVR2&nbsp;2K&nbsp;&nbsp;·&nbsp;&nbsp;IDENTITY&nbsp;LOCKED</span>
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
  const [format, setFormat] = useState('JPG')
  const [colorProfile, setColorProfile] = useState('sRGB')
  const [dims, setDims] = useState(null)

  // The Enhance step already produced the 2K SeedVR2 image; Export only re-encodes it.
  const resultUrl = imageData?.enhancedUrl || imageData?.url

  useEffect(() => {
    if (!resultUrl) return
    let alive = true
    probeImageSize(resultUrl).then((d) => { if (alive) setDims(d) }).catch(() => {})
    return () => { alive = false }
  }, [resultUrl])

  const dimText = dims ? `${dims.width} × ${dims.height}` : '—'

  const OptButton = ({ active, onClick, children, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3.5 py-2 border font-mono text-[10px] tracking-[0.14em] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'bg-ink text-white border-ink'
          : 'bg-transparent text-ink border-concrete-dark hover:border-secondary'
      }`}
    >
      {children}
    </button>
  )

  const handleDownload = async () => {
    const sourceUrl = resultUrl
    if (!sourceUrl) {
      console.warn('No image to download')
      return
    }

    const ext = format.toLowerCase() === 'tiff' ? 'png' : format.toLowerCase()
    const base = imageData?.name?.replace(/\.[^/.]+$/, '') || 'portrait'
    const filename = `${base}_reallife_2k.${ext}`

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = () => reject(new Error('Image failed to load'))
        img.src = sourceUrl
      })

      // Re-encode at 1:1 for the chosen format (resolution comes from the SeedVR2 pass).
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
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
          <div className="flex justify-between mb-2.5">
            <Mono className="text-[10px] text-secondary tracking-[0.14em]">FINAL RESULT</Mono>
            {imageData?.enhancedUrl && (
              <a
                href={imageData.enhancedUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[10px] tracking-[0.14em] text-secondary hover:text-ink transition-colors"
              >
                VIEW&nbsp;100%&nbsp;↗
              </a>
            )}
          </div>
          <div className="relative aspect-square bg-ink overflow-hidden">
            {resultUrl && (
              <img src={resultUrl} alt="result" className="w-full h-full object-cover" />
            )}
          </div>
        </div>
        <div>
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
              <span>{dimText}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">ENGINE</span>
              <span>{ENGINE_LABEL}</span>
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
              onExport={() => setStep(4)}
              onBack={reset}
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