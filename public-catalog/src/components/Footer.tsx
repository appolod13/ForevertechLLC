import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-black text-white">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-sm font-semibold">ForeverTech</div>
            <div className="text-sm text-white/70">84 Luisa St, Brooklyn, NY 10223</div>
            <div className="text-sm text-white/70">Hours: 24/7</div>
            <a className="text-sm text-blue-300 hover:text-blue-200" href="mailto:support@forevertech.tech">
              support@forevertech.tech
            </a>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">Help</div>
            <div className="grid gap-1 text-sm">
              <Link className="text-white/70 hover:text-white" href="/support">
                Support
              </Link>
              <Link className="text-white/70 hover:text-white" href="/shipping-policy">
                Shipping Policy
              </Link>
              <Link className="text-white/70 hover:text-white" href="/refund-policy">
                Refund & Return Policy
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">Legal</div>
            <div className="grid gap-1 text-sm">
              <Link className="text-white/70 hover:text-white" href="/terms">
                Terms of Service
              </Link>
              <Link className="text-white/70 hover:text-white" href="/privacy-policy">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} ForeverTech. All rights reserved.</div>
          <div>Payments are processed securely by Stripe.</div>
        </div>
      </div>
    </footer>
  );
}

