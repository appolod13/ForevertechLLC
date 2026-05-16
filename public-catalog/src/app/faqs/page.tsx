import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "FAQs | ForeverTech",
  description:
    "Frequently asked questions about ForeverTech Catalog, the Studio, checkout, Printify fulfillment, crypto payments, NFT claims, and Quantum Verified Premium.",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-900 p-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="mt-4 text-gray-300 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function FaqsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-5xl mx-auto p-8">
        <div className="rounded-2xl border border-gray-700 bg-gradient-to-b from-gray-800 to-gray-900 p-8">
          <h1 className="text-4xl font-bold">FAQs</h1>
          <p className="mt-4 text-gray-300 leading-relaxed max-w-3xl">
            This page explains how ForeverTech Catalog works end-to-end: Studio → Customize → Cart → Checkout → Printify fulfillment, plus how crypto
            payments, NFT claiming, and optional Quantum Verified Premium link real systems (blockchains + IBM quantum jobs) to your purchase.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link href="/studio" className="rounded-lg border border-gray-700 bg-black/20 px-4 py-2 hover:bg-black/30">
              Go to Studio
            </Link>
            <Link href="/customize" className="rounded-lg border border-gray-700 bg-black/20 px-4 py-2 hover:bg-black/30">
              Customize a Product
            </Link>
            <Link href="/support" className="rounded-lg border border-gray-700 bg-black/20 px-4 py-2 hover:bg-black/30">
              Support
            </Link>
            <Link href="/privacy-policy" className="rounded-lg border border-gray-700 bg-black/20 px-4 py-2 hover:bg-black/30">
              Privacy Policy
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-6">
          <Card title="What do customers do on the website?">
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Browse <Link className="text-blue-300 hover:text-blue-200" href="/">Latest Drops</Link> to see new designs.
              </li>
              <li>
                Use <Link className="text-blue-300 hover:text-blue-200" href="/studio">Studio</Link> to generate a new image from a prompt (including a
                fractal/“quantum” generator path).
              </li>
              <li>
                Use <Link className="text-blue-300 hover:text-blue-200" href="/customize">Customize</Link> to preview the artwork on a product and choose size/quantity.
              </li>
              <li>
                Add to <Link className="text-blue-300 hover:text-blue-200" href="/cart">Cart</Link> and checkout securely with Stripe.
              </li>
              <li>
                After checkout, the order is fulfilled via Printify (printing + shipping) using the exact art you approved.
              </li>
            </ul>
          </Card>

          <Card title="How does Studio work?">
            <p>
              Studio takes the prompt you write and routes it into the currently enabled generation engine(s). The output is an image you can preview and
              use for products.
            </p>
            <p>
              Some designs are created by our fractal engine (Julia + Mandelbrot), and some are created by other generators depending on configuration. The
              goal is always the same: produce original, high-contrast artwork that prints cleanly on fabric.
            </p>
          </Card>

          <Card title="How do Customize, Cart, and Checkout work together?">
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Customize is where the artwork is positioned and previewed on a product mock.
              </li>
              <li>
                Cart stores your selected product + sizing + artwork URL.
              </li>
              <li>
                Checkout collects shipping info and payment via Stripe.
              </li>
              <li>
                After payment succeeds, our backend creates the Printify fulfillment order so it can be printed and shipped.
              </li>
            </ul>
          </Card>

          <Card title="What is Printify in this flow?">
            <p>
              Printify is our production partner integration that handles print-on-demand fulfillment: we upload the exact print-ready image, map it to a
              product/variant, and submit the order to Printify for printing and shipping.
            </p>
            <p>
              This means you are buying a real physical product, not just a digital image.
            </p>
          </Card>

          <Card title="What is “Quantum Verified Premium”?">
            <p>
              Quantum Verified Premium is an optional add-on at checkout. If selected, we request a real quantum randomness proof from IBM and use that
              quantum seed to deterministically regenerate the front artwork for your order.
            </p>
            <p className="font-semibold text-white">Benefits</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your printed front design is cryptographically tied to a real IBM quantum job (via a seed-derived salt used for generation).</li>
              <li>You get proof metadata (IBM jobId + backend) plus a non-sensitive seed hash (qf_quantum_seed_hash) for verification.</li>
              <li>The artwork becomes a verifiable edition of the prompt, rather than a generic re-render.</li>
            </ul>
          </Card>

          <Card title="How is Quantum Verified Premium different from the NFT?">
            <p>
              Quantum Verified Premium affects how your front artwork is generated for the physical order. The NFT is an optional digital collectible you can
              claim after purchase.
            </p>
          </Card>

          <Card title="Julia sets and Mandelbrot (the fractal basics)">
            <p>
              Julia sets are a family of fractal patterns related to the Mandelbrot set. At a high level, they come from repeatedly applying an equation
              and observing whether values “escape” to infinity or stay bounded.
            </p>
            <p className="font-semibold text-white">Julia set idea</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Pick a starting value x (often a complex number).</li>
              <li>Apply a function repeatedly, like x → x² + c (c is fixed for the whole image).</li>
              <li>If the sequence escapes (grows beyond a threshold), the starting point is outside the set; otherwise it is inside.</li>
              <li>Coloring is usually based on how fast it escapes, producing the familiar gradients and boundaries.</li>
            </ul>
            <p className="font-semibold text-white">Why complex numbers matter</p>
            <p>
              With real numbers you only have a number line, which is visually limited. With complex numbers (a + bi), you can map values onto a 2D complex
              plane (real axis + imaginary axis) and produce rich 2D structure.
            </p>
            <p className="font-semibold text-white">How Mandelbrot differs</p>
            <p>
              The Mandelbrot set uses the same iteration rule x → x² + c, but c changes per pixel: for each point you test, that point is the c value. In a
              Julia set, c is fixed and you vary only the starting x across the plane.
            </p>
          </Card>

          <Card title="How the “real IBM quantum + Wolfram + Qiskit + fractal” pipeline works">
            <p className="font-semibold text-white">A) The “real IBM quantum” part (order-time)</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Customer checks Quantum Verified Premium at checkout.</li>
              <li>After Stripe payment completes, our webhook requests an IBM quantum seed + proof metadata (jobId, backend).</li>
            </ol>

            <p className="font-semibold text-white mt-4">B) The “Wolfram + Qiskit + fractal” part (image-time)</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>The webhook takes the original customer prompt and calls the image generator again using the IBM seed as seed_salt.</li>
              <li>
                Inside the generator:
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>A Wolfram-style cellular automaton pattern is generated and used as a structured source of complexity.</li>
                  <li>That pattern is mapped into a Qiskit circuit (and sampled when available).</li>
                  <li>Those sampled probabilities modulate fractal parameters and interference math.</li>
                  <li>Julia + Mandelbrot are fused into a single line-field (unless the prompt says no mandelbrot).</li>
                </ul>
              </li>
            </ol>

            <p className="font-semibold text-white mt-4">C) The key link: “real IBM seed → printed artwork”</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>The IBM seed is mixed into generator seeding so the output is deterministically tied to the quantum job.</li>
              <li>That regenerated image is uploaded to Printify as the front print area, so the shirt print is linked to the IBM job.</li>
            </ol>
          </Card>

          <Card title="Payments, refunds, and what you receive">
            <p>
              Card payments are processed securely via Stripe. You receive a physical product printed and shipped through Printify.
            </p>
            <p>
              Crypto payments are also supported when enabled. In crypto checkout, the site generates a payment request (amount + receive address) and you
              submit a transaction hash for confirmation. Once the payment is confirmed on-chain, the order is created and sent to Printify for fulfillment.
            </p>
            <p>
              If the Quantum Verified step is temporarily unavailable, the system is designed to fall back safely (and may refund the premium portion where
              applicable).
            </p>
          </Card>

          <Card title="What is the NFT claim?">
            <p>
              After purchase, you may be able to claim a commemorative NFT on supported chains. On the success page you can enter a wallet address, pick a
              chain, and claim.
            </p>
          </Card>

          <Card title="Benefits of the NFT claim">
            <ul className="list-disc pl-6 space-y-2">
              <li>Gives you a digital collectible that references your purchase and can include “Quantum Verified” attributes when applicable.</li>
              <li>Metadata is uploaded to IPFS so the NFT points to a resilient metadata URL.</li>
              <li>On chains that support gasless claim, the site can mint on your behalf (no gas needed from your wallet).</li>
              <li>NFT claiming is optional and does not affect printing/shipping of your physical order.</li>
            </ul>
          </Card>

          <Card title="Where can customers get help?">
            <p>
              Visit <Link className="text-blue-300 hover:text-blue-200" href="/support">Support</Link> for help with orders, shipping, or account questions.
            </p>
            <p>
              For privacy questions, see <Link className="text-blue-300 hover:text-blue-200" href="/privacy-policy">Privacy Policy</Link>.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
