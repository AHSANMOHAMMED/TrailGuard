import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppTheme = "light" | "night";

type ThemeState = {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  toggleTheme: () => void;
};

function applyDomTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("night", theme === "night");
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      setTheme: (theme) => {
        applyDomTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next: AppTheme = get().theme === "night" ? "light" : "night";
        applyDomTheme(next);
        set({ theme: next });
      },
    }),
    {
      name: "trailguard-theme-v1",
      onRehydrateStorage: () => (state) => {
        applyDomTheme(state?.theme ?? "light");
      },
    },
  ),
);

/** Call once from the root shell so SSR/hydration starts on light. */
export function ensureThemeBoot() {
  if (typeof document === "undefined") return;
  const stored = localStorage.getItem("trailguard-theme-v1");
  let theme: AppTheme = "light";
  try {
    const parsed = stored ? (JSON.parse(stored) as { state?: { theme?: AppTheme } }) : null;
    if (parsed?.state?.theme === "night" || parsed?.state?.theme === "light") {
      theme = parsed.state.theme;
    }
  } catch {
    theme = "light";
  }
  applyDomTheme(theme);
}
