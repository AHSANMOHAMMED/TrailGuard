import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-store";
import { cn } from "@/lib/utils";

/** Light is the default park UI; Night switches to the dark field chrome. */
export function ThemeToggle({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggleTheme);
  const isNight = theme === "night";
  const onDark = tone === "dark";

  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      aria-pressed={isNight}
      aria-label={isNight ? "Switch to day theme" : "Switch to night theme"}
      title={isNight ? "Day theme" : "Night theme"}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
        onDark
          ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
          : "border-border bg-surface text-fg hover:bg-elevated",
        className,
      )}
    >
      {isNight ? <Sun className="size-4" strokeWidth={2} /> : <Moon className="size-4" strokeWidth={2} />}
    </button>
  );
}
