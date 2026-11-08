// /app/layout.tsx

import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import ZoomController from "@/components/ZoomController"

export const metadata: Metadata = {
  title: "Sistem Izin Kerja Digital - PT. Jatim Autocomp Indonesia",
  description:
    "Platform manajemen izin kerja digital (Work Permit System) yang aman dan terintegrasi untuk keselamatan kerja",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('theme');
                if (saved === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                }
                const path = window.location.pathname;
                if (path === '/' || path === '/login' || path.startsWith('/login/')) {
                  document.documentElement.classList.add('no-zoom');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`font-sans antialiased min-h-screen`}>
        <ThemeProvider>
          <ZoomController />
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
