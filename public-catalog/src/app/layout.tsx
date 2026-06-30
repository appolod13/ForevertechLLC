import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/Providers";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pixelqrypt.com"),
  title: {
    default: "Quantum Story Tees",
    template: "%s | PixelQrypt",
  },
  description:
    "Generate a one-of-one fractal story tee from your prompt, unlock a verified origin record with Real Quantum Generation, and wear a piece that proves its own futuristic creation story. Premium Creator unlocks ownership rights and an earnings opportunity through QR‑linked sales and creator payouts.",
  keywords: [
    "PixelQrypt",
    "ForeverTech",
    "math art",
    "AI art t-shirts",
    "AI art merch",
    "emotional AI art",
    "prompt art",
    "prompt to print",
    "custom t-shirt design",
    "print on demand apparel",
    "fractal art",
    "generative art",
    "Julia set art",
    "Mandelbrot art",
    "graphic tee",
    "streetwear design",
    "aiart",
    "mathart",
    "fractalart",
    "custommerch",
    "quantum story tees",
    "verified origin record",
    "fractal story tee",
    "prompt to merch",
  ],
  openGraph: {
    type: "website",
    url: "https://www.pixelqrypt.com",
    siteName: "PixelQrypt",
    title: "Quantum Story Tees",
    description:
      "Generate a one-of-one fractal story tee from your prompt, unlock a verified origin record with Real Quantum Generation, and wear a piece that proves its own futuristic creation story. Premium Creator unlocks ownership rights and an earnings opportunity through QR‑linked sales and creator payouts.",
    images: [{ url: "/images/ai-gen-1.png", width: 1200, height: 630, alt: "PixelQrypt AI art apparel preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Quantum Story Tees",
    description:
      "Generate a one-of-one fractal story tee from your prompt, unlock a verified origin record with Real Quantum Generation, and wear a piece that proves its own futuristic creation story. Premium Creator unlocks ownership rights and an earnings opportunity through QR‑linked sales and creator payouts.",
    images: ["/images/ai-gen-1.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
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
        <Analytics />
      </body>
    </html>
  );
}
