import type { Metadata } from "next";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Privacy Policy | ForeverTech",
  description: "Privacy Policy for ForeverTech Catalog.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-4xl mx-auto p-8">
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-8">
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
          <p className="mt-3 text-gray-300">
            Effective date: 2026-05-09
          </p>
          <p className="mt-6 text-gray-300 leading-relaxed">
            This Privacy Policy explains how ForeverTech Catalog collects, uses, and shares information when you use our website,
            studio tools, and checkout flow.
          </p>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold">Information We Collect</h2>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Account information you provide, such as email and profile details.</li>
              <li>Content you submit, such as prompts, uploaded images, and generated assets you choose to save or publish.</li>
              <li>Checkout and fulfillment details, such as shipping information and order identifiers.</li>
              <li>Optional QR link URL you provide for your purchase (if you choose to set a custom QR destination).</li>
              <li>Device and usage data such as IP address, browser type, pages viewed, and approximate location derived from IP.</li>
            </ul>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold">How We Use Information</h2>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Provide and operate the studio, catalog, and shopping features.</li>
              <li>Generate images and previews from prompts and inputs you provide.</li>
              <li>Process payments and fulfill orders through our partners.</li>
              <li>Encode your selected destination in the QR stamp when you choose a custom link.</li>
              <li>Maintain security, prevent abuse, and troubleshoot issues.</li>
            </ul>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold">Sharing</h2>
            <p className="text-gray-300 leading-relaxed">
              We share information only as needed to run the service, including with payment processors and fulfillment providers
              to complete your order, and with infrastructure providers to host and deliver the site.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold">Cookies</h2>
            <p className="text-gray-300 leading-relaxed">
              We use cookies and similar technologies for authentication, session management, and site functionality. You can control
              cookies through your browser settings.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold">Data Retention</h2>
            <p className="text-gray-300 leading-relaxed">
              We keep information for as long as needed to provide the service, comply with legal obligations, resolve disputes, and
              enforce our agreements.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold">Security</h2>
            <p className="text-gray-300 leading-relaxed">
              We use reasonable safeguards designed to protect information. No method of transmission or storage is completely secure.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold">Your Choices</h2>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>You can choose whether to submit a custom QR destination URL.</li>
              <li>You can choose whether to save/publish generated content.</li>
              <li>You can request access, correction, or deletion of certain information by contacting us.</li>
            </ul>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-2xl font-bold">Contact</h2>
            <p className="text-gray-300 leading-relaxed">
              For privacy questions, contact us via the Support page.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
