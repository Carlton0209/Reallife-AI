import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Home from './Home.jsx'
import './index.css'

// ============================================================
// ErrorBoundary — surfaces render errors on screen so a silent
// blank page is never the default failure mode.
//
// In dev mode Vite's own overlay usually fires first; this is
// the safety net for production builds AND for errors that
// happen outside React's render path (occasionally the case
// with module-level JSX evaluation bugs).
// ============================================================
class ErrorBoundary extends React.Component {
  state = { err: null }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err, info) {
    // eslint-disable-next-line no-console
    console.error('RealLife AI render error:', err, info)
  }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div style={{
        padding: '32px', fontFamily: 'system-ui, sans-serif',
        maxWidth: '720px', margin: '40px auto', color: '#0A0A0A',
      }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600 }}>
          Something broke while rendering.
        </h1>
        <p style={{ color: '#6B6864', margin: '0 0 16px', lineHeight: 1.55 }}>
          Open the browser console (F12) for the full stack trace. Common causes:
          missing Tailwind rebuild after editing <code>tailwind.config.js</code>,
          a stale dev server, or a new token (<code>text-soft</code>, <code>bg-cream</code>)
          that hasn't compiled yet — try stopping and restarting <code>npm run dev</code>.
        </p>
        <pre style={{
          background: '#FAF8F3', padding: '16px', borderRadius: '8px',
          overflow: 'auto', fontSize: '12px', lineHeight: 1.5, margin: 0,
        }}>
          {String(this.state.err?.stack || this.state.err)}
        </pre>
        <button
          onClick={() => { this.setState({ err: null }) }}
          style={{
            marginTop: '16px', background: '#0A0A0A', color: '#fff',
            border: 'none', padding: '10px 18px', borderRadius: '999px',
            fontSize: '13px', cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    )
  }
}

// ============================================================
// Simple hash-based routing (zero dependencies).
//   /          → marketing homepage (Home.jsx)
//   /#app      → product UI (App.jsx — the Swiss 4-step flow)
//
// The "Try free" and "Start free trial" CTAs on the homepage
// link to `#app`, so users are handed off to the product auto-
// matically. Swap this for react-router-dom when you need real
// routing (deep links, history API) — Home and App are already
// standalone components.
// ============================================================
function Root() {
  const [route, setRoute] = React.useState(window.location.hash)

  React.useEffect(() => {
    const handler = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  return route === '#app' ? <App /> : <Home />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>
)
