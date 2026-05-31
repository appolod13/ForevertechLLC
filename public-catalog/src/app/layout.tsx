import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pixelqrypt.com"),
  title: {
    default: "PixelQrypt | AI Art T-Shirts & Prompt-to-Print Merch",
    template: "%s | PixelQrypt",
  },
  description:
    "PixelQrypt by ForeverTech is a prompt-to-print studio for creating AI-inspired fractal art (Julia set + Mandelbrot) and buying it on custom T-shirts. Generate, preview, save to your gallery, and checkout securely with card payment. Fulfilled via print-on-demand shipping.",
  keywords: [
    "PixelQrypt",
    "ForeverTech",
    "AI art t-shirts",
    "AI art merch",
    "prompt to print",
    "custom t-shirt design",
    "print on demand apparel",
    "fractal art",
    "Julia set art",
    "Mandelbrot art",
    "graphic tee",
    "streetwear design",
    "aiart",
    "fractalart",
    "custommerch",
  ],
  openGraph: {
    type: "website",
    url: "https://www.pixelqrypt.com",
    siteName: "PixelQrypt",
    title: "PixelQrypt | AI Art T-Shirts & Prompt-to-Print Merch",
    description:
      "Create AI-inspired fractal art from prompts and buy it printed on custom apparel. Save designs to your gallery and checkout securely. Print-on-demand fulfillment and shipping.",
    images: [{ url: "/images/ai-gen-1.png", width: 1200, height: 630, alt: "PixelQrypt AI art apparel preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PixelQrypt | AI Art T-Shirts & Prompt-to-Print Merch",
    description:
      "Create AI-inspired fractal art from prompts and buy it printed on custom apparel. Save to gallery, checkout securely, and ship via print-on-demand fulfillment.",
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
      </body>
    </html>
  );
}
