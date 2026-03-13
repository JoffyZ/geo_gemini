import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/lib/auth-context";
import { TenantProvider } from "@/lib/tenant-provider";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Geo Gemini",
  description: "Geo monitoring tool powered by Gemini",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <AuthProvider>
          <TenantProvider>
            {children}
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
