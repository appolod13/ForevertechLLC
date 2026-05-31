import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Refund & Return Policy",
  description:
    "Refund and return policy for PixelQrypt by ForeverTech. Covers made-to-order apparel replacements, damaged/defective items, shipping issues, and support contact for order help.",
  keywords: [
    "PixelQrypt refunds",
    "ForeverTech return policy",
    "print on demand returns",
    "custom t-shirt refund",
    "order support",
  ],
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-4xl mx-auto p-8">
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-8">
          <h1 className="text-4xl font-bold">Refund & Return Policy</h1>
          <p className="mt-3 text-gray-300">Effective date: 2026-05-29</p>

          <section className="mt-8 space-y-3 text-gray-300 leading-relaxed">
            <h2 className="text-2xl font-bold text-white">Physical Products (Apparel / Merch)</h2>
            <p>
              Our products are made to order through a print-on-demand fulfillment partner. If there is a problem with your order, we will work to make it
              right.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="font-semibold text-white">Damaged / defective / misprinted items:</span> Contact us within{" "}
                <span className="font-semibold text-white">14 days</span> of delivery. We may offer a replacement or refund depending on the issue.
              </li>
              <li>
                <span className="font-semibold text-white">Wrong item received:</span> Contact us within{" "}
                <span className="font-semibold text-white">14 days</span> of delivery. We will arrange a replacement or refund.
              </li>
              <li>
                <span className="font-semibold text-white">Address issues:</span> If a customer provides an incorrect or incomplete address, reshipment
                may require an additional shipping charge.
              </li>
            </ul>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold text-white">What to Include in Your Request</h2>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Your order email and order number (if available).</li>
              <li>A brief description of the issue.</li>
              <li>Clear photos of the item and packaging (for damage/print issues).</li>
            </ul>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold text-white">Digital Purchases (PixelQrypt Download Access)</h2>
            <p className="text-gray-300 leading-relaxed">
              Digital access is delivered immediately after a successful payment. If you have trouble accessing your download, contact support and we will
              help resolve it. Refund requests for digital access are reviewed case-by-case if delivery fails.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold text-white">How Refunds Are Issued</h2>
            <p className="text-gray-300 leading-relaxed">
              If approved, refunds are issued to the original payment method. Timing depends on your bank or card issuer.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold text-white">Contact</h2>
            <p className="text-gray-300 leading-relaxed">
              Email{" "}
              <a className="text-blue-300 hover:text-blue-200" href="mailto:support@forevertech.tech">
                support@forevertech.tech
              </a>{" "}
              or visit{" "}
              <Link className="text-blue-300 hover:text-blue-200" href="/support">
                Support
              </Link>
              .
            </p>
            <div className="mt-3 text-sm text-gray-400">
              ForeverTech • 84 Luisa St, Brooklyn, NY 10223 • Hours: 24/7
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
