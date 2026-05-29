import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Shipping Policy | ForeverTech",
  description: "Shipping policy for ForeverTech orders.",
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-4xl mx-auto p-8">
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-8">
          <h1 className="text-4xl font-bold">Shipping Policy</h1>
          <p className="mt-3 text-gray-300">Effective date: 2026-05-29</p>

          <section className="mt-8 space-y-3 text-gray-300 leading-relaxed">
            <h2 className="text-2xl font-bold text-white">Fulfillment</h2>
            <p>
              Orders are produced and shipped through our print-on-demand fulfillment partner (Printify). Each item is made to order using the print-ready
              artwork you approved.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold text-white">Processing Time</h2>
            <p className="text-gray-300 leading-relaxed">
              Typical production time is <span className="font-semibold text-white">2–7 business days</span> before shipment. During peak periods, it may
              take longer.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold text-white">Shipping Time</h2>
            <p className="text-gray-300 leading-relaxed">
              Shipping times vary by destination and carrier. Estimates are shown at checkout when available. Once shipped, delivery typically takes{" "}
              <span className="font-semibold text-white">3–10 business days</span> depending on the destination.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold text-white">Tracking</h2>
            <p className="text-gray-300 leading-relaxed">
              When tracking is available from the carrier, it will be provided after the order ships. If you need help locating tracking details, contact
              support.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold text-white">Lost, Damaged, or Incorrect Orders</h2>
            <p className="text-gray-300 leading-relaxed">
              If your item arrives damaged, defective, or incorrect, contact us within <span className="font-semibold text-white">14 days</span> of delivery
              so we can help. Please include photos when possible.
            </p>
            <p className="text-gray-300 leading-relaxed">
              For refund and return rules, see{" "}
              <Link className="text-blue-300 hover:text-blue-200" href="/refund-policy">
                Refund & Return Policy
              </Link>
              .
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

