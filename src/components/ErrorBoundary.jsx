import { Component } from 'react'

/**
 * Catches render errors below it and shows `fallback` instead (default: nothing), logging the
 * error to the console. Used around edit-mode controls (so a bug in editing tooling only
 * disables that control) and around the whole app (so a crash shows a reload screen, not a
 * blank page).
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error(`${this.props.label ?? 'A component'} failed:`, error, info?.componentStack)
  }

  render() {
    if (this.state.error) return this.props.fallback ?? null
    return this.props.children
  }
}

/** Full-page fallback for the app: plain HTML so it works even if styles or MUI failed. */
export function CrashScreen() {
  return (
    <div className="container page" role="alert" style={{ textAlign: 'center', paddingTop: '5rem' }}>
      <h1>Something went wrong</h1>
      <p className="muted">The page couldn't be displayed. Reloading usually fixes this.</p>
      <button className="button" type="button" onClick={() => window.location.reload()}>
        Reload the page
      </button>
    </div>
  )
}
