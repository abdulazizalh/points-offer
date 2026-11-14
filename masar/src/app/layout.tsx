import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ToastViewport } from "@/components/ui";
import { ServiceWorker } from "@/components/ServiceWorker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plex = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["300", "400", "500", "600", "700"], variable: "--font-plex-ar", display: "swap" });

export const metadata: Metadata = {
  title: { default: "MASAR · مَسار — Your Time. Your Turn.", template: "%s · MASAR" },
  description: "Book your place in line remotely, track it live and arrive just in time. Smart queue management for Kuwait.",
  manifest: "/manifest.webmanifest",
  applicationName: "MASAR",
  appleWebApp: { capable: true, title: "MASAR", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#223A5E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${plex.variable}`} suppressHydrationWarning>
      <body>
        <StoreProvider>
          {children}
          <ToastViewport />
        </StoreProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
