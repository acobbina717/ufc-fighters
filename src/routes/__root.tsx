import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import ConvexProvider from "../integrations/convex/provider";
import FloatingDock from "../components/FloatingDock";
import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";
import appCss from "../styles.css?url";
import rootClasses from "./__root.module.css";

import type { QueryClient } from "@tanstack/react-query";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { Notifications } from "@mantine/notifications";
import { mantineTheme } from "../lib/mantine";
import {
  COLOR_SCHEME_STORAGE_KEY,
  colorSchemeManager,
} from "../lib/colorSchemeManager";

// Providers + the site-wide Floating Dock (ADR 0007) — the dock renders from
// the root component so it appears on every route (Experience, Divisions, and
// App Routes). It is the only nav chrome; the Header was retired in slice #26.
interface MyRouterContext {
  queryClient: QueryClient;
}

function NotFound() {
  return (
    <div className={rootClasses.notFound}>
      <div className={rootClasses.notFoundInner}>
        <div className={rootClasses.notFoundCode}>404</div>
        <div className={rootClasses.notFoundText}>Page Not Found</div>
      </div>
    </div>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "UFC Fighter Explorer",
      },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800&family=Inter:wght@400;500;600&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <Outlet />
      <FloatingDock />
    </>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        {/* ADR 0006 — default `auto` (follow the OS); the inline script reads
            the persisted choice before paint so SSR HTML never flashes the
            wrong mode. */}
        <ColorSchemeScript
          defaultColorScheme="auto"
          localStorageKey={COLOR_SCHEME_STORAGE_KEY}
        />
        <HeadContent />
      </head>
      <body>
        <MantineProvider
          theme={mantineTheme}
          defaultColorScheme="auto"
          colorSchemeManager={colorSchemeManager}
        >
          <Notifications position="top-right" />
          <ConvexProvider>
            <TanStackQueryProvider>
              {children}
            </TanStackQueryProvider>
          </ConvexProvider>
        </MantineProvider>
        <Scripts />
      </body>
    </html>
  );
}
