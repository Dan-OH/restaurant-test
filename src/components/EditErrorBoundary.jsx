import { Component } from 'react'

/**
 * Catches errors from an editing control (formatted-text editor, image or section controls)
 * so a bug in edit-mode tooling only disables that control instead of blanking the whole site.
 * Renders `fallback` (default: nothing) after an error, and logs it for debugging.
 */
export default class EditErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('An editing control failed and was disabled:', error, info?.componentStack)
  }

  render() {
    if (this.state.error) return this.props.fallback ?? null
    return this.props.children
  }
}
