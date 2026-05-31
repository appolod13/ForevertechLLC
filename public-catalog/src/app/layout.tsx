import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "PixelQrypt | Prompt-to-Print Apparel • Quantum Verified",
  description:
    "Create wearable fractal art from prompts (Julia-set + Mandelbrot fusion). Optional Quantum Verified ties your final print to a recorded quantum seed sourced from IBM Quantum services. Save designs to your gallery, publish them, and share with a scannable QR code.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased bg-black text-white"
      >
        <Providers>
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
