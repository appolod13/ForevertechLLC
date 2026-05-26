import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForeverTech | Julia + Mandelbrot Fractal Merch • Quantum Verified • Mintable NFT • IPFS",
  description:
    "Create wearable fractal art from prompts (Julia-set + Mandelbrot fusion). Optional Quantum Verified ties your final print to a real IBM quantum seed proof. Claim a mintable NFT after purchase, with IPFS-backed, shareable metadata links.",
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
        className="antialiased"
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
