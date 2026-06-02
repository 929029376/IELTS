import { useEffect, useState } from "react";
import type { DesktopRuntimeStatus } from "./DesktopRuntimeDiagnostics";

type TauriCore = {
  invoke: <T>(command: string) => Promise<T>;
};

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export async function loadDesktopRuntimeStatus(): Promise<DesktopRuntimeStatus | null> {
  if (typeof window === "undefined" || !window.__TAURI_INTERNALS__) {
    return null;
  }

  const tauri = (await import("@tauri-apps/api/core")) as TauriCore;
  return tauri.invoke<DesktopRuntimeStatus>("desktop_runtime_status");
}

export function useDesktopRuntimeStatus() {
  const [status, setStatus] = useState<DesktopRuntimeStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    void loadDesktopRuntimeStatus()
      .then((runtimeStatus) => {
        if (mounted) {
          setStatus(runtimeStatus);
        }
      })
      .catch(() => {
        if (mounted) {
          setStatus(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return status;
}
