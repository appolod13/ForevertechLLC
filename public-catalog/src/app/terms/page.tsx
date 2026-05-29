import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Terms of Service | ForeverTech",
  description: "Terms of Service for ForeverTech.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-4xl mx-auto p-8">
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-8">
          <h1 className="text-4xl font-bold">Terms of Service</h1>
          <p className="mt-3 text-gray-300">Effective date: 2026-05-29</p>

          <section className="mt-8 space-y-3 text-gray-300 leading-relaxed">
            <h2 className="text-2xl font-bold text-white">Overview</h2>
            <p>
              ForeverTech provides a studio experience for generating designs and a storefront for purchasing physical products printed with those designs.
              By using the site, you agree to these Terms.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold text-white">Purchases</h2>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Payments are processed securely through Stripe.</li>
              <li>Orders are produced and shipped through our fulfillment partners (print-on-demand).</li>
              <li>You are responsible for providing accurate shipping details at checkout.</li>
            </ul>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold text-white">Refunds, Returns, and Shipping</h2>
            <p className="text-gray-300 leading-relaxed">
              Please review our policies for the most up-to-date details:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>
                <Link className="text-blue-300 hover:text-blue-200" href="/refund-policy">
                  Refund & Return Policy
                </Link>
              </li>
              <li>
                <Link className="text-blue-300 hover:text-blue-200" href="/shipping-policy">
                  Shipping Policy
                </Link>
              </li>
            </ul>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold text-white">Studio Content and Acceptable Use</h2>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Do not submit content that is unlawful, abusive, or violates the rights of others.</li>
              <li>Do not use the service to infringe trademarks, copyrights, or to create counterfeit content.</li>
              <li>We may remove content or restrict access to protect users, partners, and our service.</li>
            </ul>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold text-white">Accounts and Security</h2>
            <p className="text-gray-300 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account and for activity that occurs under your account.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold text-white">Contact</h2>
            <p className="text-gray-300 leading-relaxed">
              For questions about these Terms, contact{" "}
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

