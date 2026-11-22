import { Component, type ReactNode } from "react";

// A failed query (a broken slug, a dropped connection) throws while rendering; keep the page alive.
export class FailureBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
