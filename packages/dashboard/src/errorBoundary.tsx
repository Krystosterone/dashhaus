import { Component } from "react";
import type { ReactNode } from "react";

/**
 * Shows what stopped the card instead of a blank page. A new config while it shows draws the card again, so fixing
 * the YAML in the card editor clears it; while nothing is wrong a config change costs nothing.
 */
export class ErrorBoundary extends Component<{ config: unknown; children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(previous: { config: unknown }) {
    if (this.state.error && previous.config !== this.props.config) this.setState({ error: undefined });
  }
  render() {
    return this.state.error
      ? <div className="hd-config-error" role="alert">Dashhaus stopped: {this.state.error.message}</div>
      : this.props.children;
  }
}
