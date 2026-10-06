import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SupabaseProvider } from "@/contexts/SupabaseContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/components/Toast";
import { MemotiveProvider } from "@/contexts/MemotiveContext";
import MemotiveRoot from "@/components/memotive/MemotiveRoot";
import SingleSessionGuard from "@/components/SingleSessionGuard";
import ActivityHeartbeat from "@/components/ActivityHeartbeat";
import { Analytics } from "@vercel/analytics/react";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOCOMOTIVE - IMAT Exam Preparation",
  description: "Premium Learning Management System for IMAT exam preparation. Master Biology, Chemistry, Physics, Mathematics, Logic, and more.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the theme cookie server-side so we render `data-theme` in the SSR
  // HTML. This matches the client exactly (no hydration mismatch) and paints
  // the right theme immediately (no flash) — no client init script needed.
  const cookieStore = await cookies();
  const theme = cookieStore.get("loco_theme")?.value === "light" ? "light" : "dark";

  return (
    <html lang="en" data-theme={theme}>
      <body>
        <ThemeProvider initialTheme={theme}>
          <SupabaseProvider>
            <AuthProvider>
              <ToastProvider>
                <MemotiveProvider>
                  <SingleSessionGuard />
                  <ActivityHeartbeat />
                  {children}
                  <MemotiveRoot />
                </MemotiveProvider>
              </ToastProvider>
            </AuthProvider>
          </SupabaseProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
