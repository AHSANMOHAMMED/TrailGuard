import { CloudOff, Wifi } from "lucide-react";
import { useField } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Demo control for the offline alternative flows (A2/A3 in the wireframes):
 * flips the simulated device connectivity so the OFFLINE/ONLINE states can be
 * exercised without leaving coverage.
 */
export function ConnectivityToggle() {
  const { online, setOnline } = useField();
  return (
    <button
      type="button"
      onClick={() => setOnline(!online)}
      aria-pressed={!online}
      title={online ? "Simulate losing connectivity" : "Restore connectivity"}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold",
        online ? "border-ok/40 bg-ok-bg text-ok" : "border-warn/40 bg-warn-bg text-warn",
      )}
    >
      {online ? <Wifi className="size-3.5" /> : <CloudOff className="size-3.5" />}
      {online ? "Online" : "Offline"}
    </button>
  );
}
