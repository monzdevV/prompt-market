"use client";

import type { Application } from "@splinetool/runtime";
import { Component, Suspense, lazy, type ReactNode } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

interface SplineSceneProps {
  scene: string;
  className?: string;
  loading?: ReactNode;
  onLoad?: (app: Application) => void;
  /** Called when the runtime chunk or the scene itself fails to load (404, offline, removed scene…). */
  onError?: () => void;
}

// react-spline rethrows load errors during render, so a boundary is the only place to catch them.
class SceneBoundary extends Component<{ children: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function SplineScene({ scene, className, loading, onLoad, onError }: SplineSceneProps) {
  return (
    <SceneBoundary onError={onError}>
      <Suspense fallback={loading ?? null}>
        <Spline scene={scene} className={className} onLoad={onLoad} />
      </Suspense>
    </SceneBoundary>
  );
}
