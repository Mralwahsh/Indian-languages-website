import { Component } from 'react'

/** Booth safety net: never leave visitors staring at a blank screen. */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[India Speaks] crashed:', error, info)
  }

  componentDidUpdate(prev) {
    // a reset (new key from the parent) clears the error
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid h-full place-items-center text-center">
        <div>
          <p className="font-deva text-8xl text-saffron">अरे!</p>
          <p className="mt-2 font-display text-4xl font-bold">عذرًا، حدث خطأ ما.</p>
          <button
            onClick={this.props.onReset}
            className="mt-6 rounded-full bg-accent px-10 py-4 text-3xl font-bold text-white"
          >
            ابدأ من جديد
          </button>
        </div>
      </div>
    )
  }
}
