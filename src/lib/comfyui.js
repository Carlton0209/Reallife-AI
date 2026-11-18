// src/lib/comfyui.js
// ComfyUI local API client. REST for upload/submit, WebSocket for progress.

const COMFY_URL = import.meta.env.VITE_COMFY_URL || 'http://127.0.0.1:8188'

// A stable client ID used to route WebSocket events back to this tab.
const clientId = crypto.randomUUID()

// ─── REST ───────────────────────────────────────────────────────────────

// POST /upload/image — stores the file under ComfyUI's `input/` folder.
// Returns { name, subfolder, type } where `name` is what LoadImage wants.
// `fileName` is required for bare Blobs (e.g. an image fetched back from /view).
export async function uploadImage(file, fileName) {
  const fd = new FormData()
  fd.append('image', file, fileName || file.name || 'upload.png')
  fd.append('overwrite', 'true')
  const res = await fetch(`${COMFY_URL}/upload/image`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`)
  return res.json()
}

// POST /prompt — queue a workflow. Returns { prompt_id, number, node_errors }.
export async function queuePrompt(workflow) {
  const res = await fetch(`${COMFY_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Queue failed: HTTP ${res.status} — ${text}`)
  }
  const data = await res.json()
  if (data.node_errors && Object.keys(data.node_errors).length) {
    throw new Error('Workflow node errors: ' + JSON.stringify(data.node_errors))
  }
  return data
}

// GET /history/{id} — returns { outputs: { nodeId: { images: [{ filename, subfolder, type }] } } }
export async function getHistory(promptId) {
  const res = await fetch(`${COMFY_URL}/history/${promptId}`)
  if (!res.ok) throw new Error(`History fetch failed: HTTP ${res.status}`)
  const all = await res.json()
  return all[promptId] || null
}

// Build the URL to view/download a generated image.
export function imageUrl({ filename, subfolder = '', type = 'output' }) {
  const params = new URLSearchParams({ filename, subfolder, type })
  return `${COMFY_URL}/view?${params}`
}

// Download an image (e.g. a previous workflow's output) as a Blob so it can be
// fed into another workflow via uploadImage().
export async function fetchImageBlob(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Image fetch failed: HTTP ${res.status}`)
  return res.blob()
}

// Stop a prompt on the server: drop it from the queue if pending, interrupt it if running.
// The targeted /interrupt only fires when this prompt is the one executing.
export async function cancelPrompt(promptId) {
  const post = (path, body) => fetch(`${COMFY_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  await post('/queue', { delete: [promptId] })
  await post('/interrupt', { prompt_id: promptId })
}

// Pull a readable message out of a failed prompt's history entry.
function historyError(history) {
  const msg = history?.status?.messages?.find(([type]) => type === 'execution_error')?.[1]
  if (!msg) return 'Workflow failed'
  return [msg.node_type, msg.exception_message].filter(Boolean).join(': ')
}

// ─── WebSocket (progress) ───────────────────────────────────────────────

// Opens a WebSocket and dispatches { onProgress, onExecuting, onDone, onError }.
// Returns an unsubscribe function. Safe to call even if WS is never opened.
export function subscribeProgress(promptId, handlers = {}) {
  const wsUrl = COMFY_URL.replace(/^http/, 'ws') + `/ws?clientId=${clientId}`
  let ws
  try {
    ws = new WebSocket(wsUrl)
  } catch (err) {
    handlers.onError?.(err)
    return () => {}
  }

  ws.onmessage = (event) => {
    if (typeof event.data !== 'string') return  // binary frames are preview images — skip
    let msg
    try { msg = JSON.parse(event.data) } catch { return }
    if (msg.data?.prompt_id && msg.data.prompt_id !== promptId) return
    switch (msg.type) {
      case 'progress':
        handlers.onProgress?.(msg.data)  // { value, max, node, prompt_id }
        break
      case 'executing':
        handlers.onExecuting?.(msg.data)
        if (msg.data.node === null) handlers.onDone?.(msg.data)  // null = all nodes done
        break
      case 'execution_error':
      case 'execution_interrupted':
        handlers.onError?.(new Error(msg.data?.exception_message || 'Execution error'))
        break
    }
  }

  ws.onerror = (err) => handlers.onError?.(err)

  return () => {
    try { ws.close() } catch { /* noop */ }
  }
}

// ─── High-level helper ──────────────────────────────────────────────────

/**
 * Run a single-image workflow end-to-end:
 *  1. upload the file (File or Blob + fileName)
 *  2. inject filename into the workflow's LoadImage node
 *  3. queue the workflow
 *  4. subscribe to progress (onProgress callback)
 *  5. read history on completion for the output URL
 *
 * Completion is detected by the WebSocket *and* by polling /history, so a run
 * that finishes before the socket connects (e.g. fully cached) still resolves.
 *
 * Returns a Promise resolving to { url, enhancedUrl, image, promptId }.
 */
export async function runWorkflow({
  file,
  fileName,
  workflowTemplate,
  inputNodeId,
  outputNodeId,
  onProgress,
  onStage,
  signal,
  pollMs = 2000,
}) {
  // An already-aborted signal never fires 'abort', so check after every await.
  const throwIfAborted = () => { if (signal?.aborted) throw new Error('Aborted') }
  throwIfAborted()

  onStage?.('Uploading image')
  const uploaded = await uploadImage(file, fileName)
  throwIfAborted()

  // Deep-clone the workflow so concurrent runs don't collide.
  const workflow = JSON.parse(JSON.stringify(workflowTemplate))

  // Inject the uploaded filename into the LoadImage node.
  if (!workflow[inputNodeId]) {
    throw new Error(`Input node '${inputNodeId}' not found in workflow. Check your node IDs.`)
  }
  workflow[inputNodeId].inputs.image = uploaded.name

  onStage?.('Queuing workflow')
  const { prompt_id } = await queuePrompt(workflow)
  if (signal?.aborted) {
    cancelPrompt(prompt_id).catch(() => {})
    throw new Error('Aborted')
  }

  onStage?.('Processing')

  return new Promise((resolve, reject) => {
    let settled = false
    let unsub = () => {}
    let poll = null

    const finish = (fn, value) => {
      if (settled) return
      settled = true
      clearInterval(poll)
      unsub()
      fn(value)
    }

    // Resolves/rejects once history shows the prompt finished; no-op while it's still running.
    const collect = async () => {
      const history = await getHistory(prompt_id)
      if (!history || settled) return
      if (history.status?.status_str === 'error') return finish(reject, new Error(historyError(history)))
      if (history.status && !history.status.completed) return
      const first = history.outputs?.[outputNodeId]?.images?.[0]
      if (!first) return finish(reject, new Error(`No image on output node '${outputNodeId}'`))
      const url = imageUrl(first)
      finish(resolve, { url, enhancedUrl: url, image: first, promptId: prompt_id })
    }

    unsub = subscribeProgress(prompt_id, {
      onProgress: (data) => onProgress?.(data),
      onDone: () => { collect().catch((err) => finish(reject, err)) },
      // Execution errors arrive as Error objects. A bare socket error Event is not fatal:
      // the history poll below still detects completion.
      onError: (err) => { if (err instanceof Error) finish(reject, err) },
    })

    poll = setInterval(() => { collect().catch(() => {}) }, pollMs)

    if (signal) {
      signal.addEventListener('abort', () => {
        if (!settled) cancelPrompt(prompt_id).catch(() => {})
        finish(reject, new Error('Aborted'))
      }, { once: true })
    }
  })
}

// Back-compat name used by the Enhance step.
export const runEnhance = runWorkflow