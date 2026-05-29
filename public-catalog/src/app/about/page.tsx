import { Header } from '@/components/Header';
import Link from 'next/link';
import { Sparkles, Shirt, ShieldCheck, Cpu, Wand2, Blocks, GalleryHorizontal, ScanLine } from 'lucide-react';

const AGENTS = [
  '@neo.pm ai',
  '@planning agent',
  '@graphicdesigner',
  '@FEEngineer',
  '@backendengineer',
  '@backendarchitect',
  '@neuraloverclocker',
  '@projectsuggester',
  '@promptnavigator',
  '@growthstrategist',
  '@content strategist',
  '@criticalconsultant',
  '@performanceprofiler',
  '@devopsexpert',
  '@quantumdeugger',
  '@errorfixer',
  '@testingarchitect',
  '@securitysentinel',
  '@automationexpert',
  '@mlarchitect',
  '@stackbridge',
  '@databasearchitect',
  '@apiarchitect',
  '@frontendexpert',
  '@dependecymanager',
  '@coderefactorer',
  '@codeoptimizer',
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-6xl mx-auto p-8">
        <div className="rounded-2xl border border-gray-700 bg-gradient-to-b from-gray-800 to-gray-900 p-8">
          <div className="flex items-center gap-3 text-purple-300">
            <Sparkles className="w-6 h-6" />
            <span className="text-sm font-semibold uppercase tracking-wider">About ForeverTech Catalog</span>
          </div>
          <h1 className="mt-3 text-4xl font-bold">
            A creator-first pipeline for generating art, blending styles, and turning it into merch.
          </h1>
          <p className="mt-4 text-gray-300 leading-relaxed max-w-3xl">
            ForeverTech Catalog is a studio + storefront that helps visitors generate original visual assets, fuse them with personal
            images, preview them on products, and ship the final design through an automated fulfillment flow.
          </p>
        </div>

        <section className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <div className="flex items-center gap-2 text-blue-300">
              <Wand2 className="w-5 h-5" />
              <h2 className="text-xl font-bold">Mission</h2>
            </div>
            <p className="mt-4 text-gray-300 leading-relaxed">
              Build a reliable, end-to-end creative engine where anyone can turn a prompt and a personal image into a wearable design
              that looks intentional, prints clean, and ships fast—without needing a full production team.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <div className="flex items-center gap-2 text-green-300">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="text-xl font-bold">Trust</h2>
            </div>
            <ul className="mt-4 space-y-2 text-gray-300">
              <li>Prompt-to-image generation with clear outputs you can preview before checkout.</li>
              <li>Optional publishing paths for resilient hosting and sharing.</li>
              <li>Safety-first prompting tools and controlled integrations for posting and fulfillment.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <div className="flex items-center gap-2 text-amber-300">
              <Cpu className="w-5 h-5" />
              <h2 className="text-xl font-bold">What Makes It Different</h2>
            </div>
            <ul className="mt-4 space-y-2 text-gray-300">
              <li>“Quantum” mode generation is preserved as a separate engine path.</li>
              <li>Advanced Fusion blends uploaded images with generated assets for print-ready output.</li>
              <li>Product preview emphasizes a realistic “printed on fabric” feel.</li>
            </ul>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-white">
              <Blocks className="w-5 h-5 text-purple-300" />
              <h2 className="text-2xl font-bold">How It Works</h2>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/studio" className="text-sm font-semibold text-blue-300 hover:text-blue-200">
                Go to Studio
              </Link>
              <Link href="/" className="text-sm font-semibold text-zinc-300 hover:text-white">
                View Latest Drops
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6">
              <div className="flex items-center gap-2 text-purple-300">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold">1) Generate</h3>
              </div>
              <p className="mt-3 text-gray-300 text-sm leading-relaxed">
                In Studio, write a prompt and generate an original asset. The system routes generation through the configured engines,
                including a Quantum path when enabled.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6">
              <div className="flex items-center gap-2 text-blue-300">
                <GalleryHorizontal className="w-5 h-5" />
                <h3 className="font-bold">2) Refine</h3>
              </div>
              <p className="mt-3 text-gray-300 text-sm leading-relaxed">
                Use the Advanced Fusion Extension to upload your own image(s) and blend them with the generated asset for a stronger,
                more personal design.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6">
              <div className="flex items-center gap-2 text-green-300">
                <Shirt className="w-5 h-5" />
                <h3 className="font-bold">3) Customize</h3>
              </div>
              <p className="mt-3 text-gray-300 text-sm leading-relaxed">
                Preview the design on products. The overlay is tuned to feel like ink on fabric so you can trust the final look.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6">
              <div className="flex items-center gap-2 text-amber-300">
                <ScanLine className="w-5 h-5" />
                <h3 className="font-bold">4) Ship</h3>
              </div>
              <p className="mt-3 text-gray-300 text-sm leading-relaxed">
                Checkout and send the design into the order flow. Fulfillment integrations can route products to printing partners.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="text-2xl font-bold">What We Built</h2>
            <ul className="mt-4 space-y-2 text-gray-300">
              <li>Creator Studio: prompt-to-image, metadata capture, and gallery storage.</li>
              <li>Advanced Fusion: combines your uploaded image(s) with generated assets for print-style output.</li>
              <li>Quantum pipeline: preserved generation path to keep the “Quantum” experience intact.</li>
              <li>Catalog + Drops: a browsable feed of generated work with commerce hooks.</li>
              <li>Customizer + Cart: product preview, sizing, and add-to-cart workflow.</li>
              <li>Scanner + Gallery: discover and review latest images and saved creations.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="text-2xl font-bold">AI Agents (Team Roles)</h2>
            <p className="mt-3 text-gray-300 text-sm leading-relaxed">
              The build is guided by a coordinated set of agent roles that cover planning, UX, frontend, backend, performance,
              reliability, and safety.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {AGENTS.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-gray-700 bg-gray-950/40 px-3 py-1 text-xs font-semibold text-gray-200"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
