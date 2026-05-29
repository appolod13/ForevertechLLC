import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForeverTech | Julia + Mandelbrot Fractal Merch • Quantum Verified",
  description:
    "Create wearable fractal art from prompts (Julia-set + Mandelbrot fusion). Optional Quantum Verified ties your final print to a real IBM quantum seed proof.",
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
