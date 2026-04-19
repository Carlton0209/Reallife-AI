// src/lib/comfyui.js
// ComfyUI local API client. REST for upload/submit, WebSocket for progress.

const COMFY_URL = import.meta.env.VITE_COMFY_URL || 'http://127.0.0.1:8188'

// A stable client ID used to route WebSocket events back to this tab.
const clientId = crypto.randomUUID()

// ─── REST ───────────────────────────────────────────────────────────────

// POST /upload/image — stores the file under ComfyUI's `input/` folder.
// Returns { name, subfolder, type } where `name` is what LoadImage wants.
export async function uploadImage(file) {
  const fd = new FormData()
  fd.append('image', file)
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
 * Run a workflow end-to-end:
 *  1. upload the file
 *  2. inject filename into the workflow's LoadImage node
 *  3. queue the workflow
 *  4. subscribe to progress (onProgress callback)
 *  5. poll history on completion for the output URL
 *
 * Returns a Promise resolving to { enhancedUrl, promptId }.
 */
export async function runEnhance({
  file,
  workflowTemplate,
  inputNodeId,
  outputNodeId,
  onProgress,
  onStage,
  signal,
}) {
  if (signal?.aborted) throw new Error('Aborted')

  onStage?.('Uploading image')
  const uploaded = await uploadImage(file)

  // Deep-clone the workflow so concurrent runs don't collide.
  const workflow = JSON.parse(JSON.stringify(workflowTemplate))

  // Inject the uploaded filename into the LoadImage node.
  if (!workflow[inputNodeId]) {
    throw new Error(`Input node '${inputNodeId}' not found in workflow. Check your node IDs.`)
  }
  workflow[inputNodeId].inputs.image = uploaded.name

  onStage?.('Queuing workflow')
  const { prompt_id } = await queuePrompt(workflow)

  onStage?.('Processing')

  // Wait for completion via WebSocket, then fetch history.
  const done = new Promise((resolve, reject) => {
    const unsub = subscribeProgress(prompt_id, {
      onProgress: (data) => onProgress?.(data),
      onDone: async () => {
        try {
          unsub()
          const history = await getHistory(prompt_id)
          if (!history) return reject(new Error('History missing after completion'))
          const node = history.outputs?.[outputNodeId]
          const first = node?.images?.[0]
          if (!first) return reject(new Error(`No image on output node '${outputNodeId}'`))
          resolve({ enhancedUrl: imageUrl(first), promptId: prompt_id })
        } catch (err) { reject(err) }
      },
      onError: (err) => { unsub(); reject(err) },
    })

    if (signal) {
      signal.addEventListener('abort', () => {
        unsub()
        reject(new Error('Aborted'))
      }, { once: true })
    }
  })

  return done
}