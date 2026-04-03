import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import ConvexProvider from "../integrations/convex/provider";
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

// Providers only — Header lives in _app.tsx so home (/) can be chrome-free
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
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript forceColorScheme="dark" />
        <HeadContent />
      </head>
      <body>
        <MantineProvider theme={mantineTheme} forceColorScheme="dark">
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
