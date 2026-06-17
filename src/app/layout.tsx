import type { Metadata } from "next";
import { SupabaseProvider } from "@/contexts/SupabaseContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/Toast";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOCOMOTIVE - IMAT Exam Preparation",
  description: "Premium Learning Management System for IMAT exam preparation. Master Biology, Chemistry, Physics, Mathematics, Logic, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </SupabaseProvider>
        <Analytics />
      </body>
    </html>
  );
}
