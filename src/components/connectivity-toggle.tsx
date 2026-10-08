import { useEffect, useRef } from "react";
import { CloudOff, Wifi } from "lucide-react";
import { useField } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Demo control for offline alternative flows, plus a bridge to the browser
 * online/offline events. Manual "simulate offline" sticks until the user
 * taps Online again (forcedOffline ref).
 */
export function ConnectivityToggle({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { online, setOnline } = useField();
  const forcedOffline = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => {
      if (!forcedOffline.current) setOnline(true);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (!navigator.onLine) setOnline(false);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setOnline]);

  return (
    <button
      type="button"
      onClick={() => {
        const next = !online;
        forcedOffline.current = !next;
        setOnline(next);
      }}
      aria-pressed={!online}
      title={online ? "Simulate losing connectivity" : "Restore connectivity"}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold backdrop-blur-sm",
        tone === "dark"
          ? online
            ? "border-white/35 bg-white/15 text-white"
            : "border-amber-200/50 bg-amber-500/25 text-amber-50"
          : online
            ? "border-ok/40 bg-ok-bg text-ok"
            : "border-warn/40 bg-warn-bg text-warn",
      )}
    >
      {online ? <Wifi className="size-3.5" /> : <CloudOff className="size-3.5" />}
      {online ? "Online" : "Offline"}
    </button>
  );
}
