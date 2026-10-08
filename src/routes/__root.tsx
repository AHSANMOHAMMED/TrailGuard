import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Body, Phone, Pill } from "@/components/field";
import { Toaster } from "sonner";
import { useAuth } from "@/lib/auth-store";
import { useField } from "@/lib/store";
import { ensureThemeBoot, useTheme } from "@/lib/theme-store";
import appCss from "../styles.css?url";

const APP_NAME = "TrailGuard";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content: "Offline-first wildlife conservation field operations.",
      },
      { name: "theme-color", content: "#1F5A43" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

/** In-system 404 — keeps the phone shell instead of the router's default. */
function NotFound() {
  return (
    <Phone>
      <Body className="pt-10">
        <div className="text-center">
          <Pill tone="muted">Not found</Pill>
          <h2 className="mt-2 text-[18px] font-bold">This screen does not exist</h2>
          <p className="mt-1 text-[13px] text-muted">
            The link you followed is not part of the field application.
          </p>
        </div>
        <div className="mt-auto pt-2">
          <Link
            to="/"
            className="flex h-[52px] w-full items-center justify-center rounded-xl bg-accent text-[15px] font-semibold text-accent-fg transition-colors hover:bg-[#174935]"
          >
            Back to Home
          </Link>
        </div>
      </Body>
    </Phone>
  );
}

function RootComponent() {
  const theme = useTheme((s) => s.theme);

  // Rehydrate persisted auth + field stores so login / sync never stick on "Loading…".
  useEffect(() => {
    ensureThemeBoot();
    void useTheme.persist.rehydrate();
    void useField.persist.rehydrate();
    void Promise.resolve(useAuth.persist.rehydrate()).finally(() => {
      useAuth.getState().setHydrated();
    });
  }, []);

  const night = theme === "night";

  return (
    <html lang="en" data-theme={theme} className={night ? "night" : undefined} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg antialiased">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
          <Toaster
            theme={night ? "dark" : "light"}
            toastOptions={{
              style: night
                ? {
                    background: "#141e18",
                    border: "1px solid #2e5038",
                    color: "#e6f0e6",
                  }
                : {
                    background: "#ffffff",
                    border: "1px solid #dde5dd",
                    color: "#16281e",
                  },
            }}
          />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
