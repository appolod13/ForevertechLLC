import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { findOrderByStripeSessionId, getNftClaim, setNftClaim } from "@/lib/cartStore";
import { getCryptoConfig } from "@/lib/cryptoConfig";
import { uploadJsonToIpfs } from "@/lib/ipfs/upload";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(secretKey, { apiVersion: "2026-03-25.dahlia" });
}

function isEvmAddress(v: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(v);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getSiteUrlFromRequest(req: Request): string {
  const origin = req.headers.get("origin") || "";
  if (origin) return origin;
  try {
    const u = new URL(req.url);
    return u.origin;
  } catch {
    return "";
  }
}

function resolveRpcUrl(chainId: number): string {
  const env = process.env as Record<string, string | undefined>;
  const byId = (env[`EVM_RPC_URL_${chainId}`] || "").trim();
  if (byId) return byId;
  if (chainId === 56) return (process.env.BNB_RPC_URL || "").trim();
  return "";
}

type CryptoChain = ReturnType<typeof getCryptoConfig>["chains"][number];

function resolveMintConfig(chainId: number, chain: CryptoChain) {
  const contractAddress = chain.contractAddress || (process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "").trim();
  const mintFunction = (chain.mintFunction || process.env.NEXT_PUBLIC_NFT_MINT_FUNCTION || "safeMint").trim() || "safeMint";

  const rpcUrl = resolveRpcUrl(chainId);
  const pk = (process.env.NFT_MINTER_PRIVATE_KEY || "").trim();

  return { contractAddress, mintFunction, rpcUrl, pk };
}

const ABI = [
  "function safeMint(address to, string uri) public returns (uint256)",
  "function mintTo(address to, string uri) public returns (uint256)",
  "function mint(address to, string uri) public returns (uint256)",
];

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json().catch(() => ({} as unknown));
    const b = isRecord(body) ? body : {};
    const sessionId = typeof b.sessionId === "string" ? b.sessionId.trim() : "";
    const walletAddress = typeof b.walletAddress === "string" ? b.walletAddress.trim() : "";
    const chainIdRaw = typeof b.chainId === "number" || typeof b.chainId === "string" ? Number(b.chainId) : 56;
    const chainId = Number.isFinite(chainIdRaw) ? Math.trunc(chainIdRaw) : 56;
    const deviceId = typeof b.deviceId === "string" ? b.deviceId.trim() : "";

    if (!sessionId) return NextResponse.json({ success: false, error: "missing_sessionId" }, { status: 400 });
    if (!isEvmAddress(walletAddress)) return NextResponse.json({ success: false, error: "invalid_walletAddress" }, { status: 400 });
    if (chainId < 1) return NextResponse.json({ success: false, error: "invalid_chainId" }, { status: 400 });

    const existing = getNftClaim(sessionId);
    if (existing) {
      return NextResponse.json({ success: true, data: { claimed: true, ...existing } }, { status: 200 });
    }

    const cfg = getCryptoConfig();
    const chain = cfg.chains.find((c) => c.enabled && c.chainId === chainId) || null;
    if (!chain) return NextResponse.json({ success: false, error: "unsupported_chain" }, { status: 400 });
    if (!chain.gaslessClaim) return NextResponse.json({ success: false, error: "gasless_claim_disabled" }, { status: 400 });
    const chainName = (chain.name || "").trim() || `Chain ${chainId}`;

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid" || (session as Stripe.Checkout.Session).status === "complete";
    if (!paid) return NextResponse.json({ success: false, error: "session_not_paid" }, { status: 400 });
    const sessionDeviceId = typeof session.metadata?.deviceId === "string" ? String(session.metadata.deviceId || "").trim() : "";
    if (sessionDeviceId && deviceId && sessionDeviceId !== deviceId) {
      return NextResponse.json({ success: false, error: "device_mismatch" }, { status: 403 });
    }

    const found = findOrderByStripeSessionId(sessionId);
    if (!found) return NextResponse.json({ success: false, error: "order_not_ready" }, { status: 400 });

    const first = found.order.items[0] || null;
    const meta = first && typeof first.metadata === "object" && first.metadata !== null ? (first.metadata as Record<string, unknown>) : {};
    const imageIpfsUrl = typeof meta.ipfs_url === "string" ? meta.ipfs_url.trim() : "";
    if (!imageIpfsUrl.startsWith("ipfs://")) return NextResponse.json({ success: false, error: "missing_ipfs_image" }, { status: 400 });

    const siteUrl = getSiteUrlFromRequest(req);
    const name = typeof first?.title === "string" && first.title.trim() ? first.title.trim() : "ForeverTech NFT";
    const description = `Order ${sessionId}`;
    const quantumProof = found.order.quantumProof;
    const metadataJson = {
      name,
      description,
      image: imageIpfsUrl,
      external_url: siteUrl ? `${siteUrl}/checkout/success?session_id=${encodeURIComponent(sessionId)}` : undefined,
      attributes: [
        { trait_type: "Chain", value: chainName },
        { trait_type: "Order", value: sessionId },
        ...(quantumProof
          ? [
              { trait_type: "Quantum Verified", value: true },
              { trait_type: "Quantum Provider", value: "IBM" },
              { trait_type: "IBM Quantum Job", value: quantumProof.jobId },
              { trait_type: "IBM Quantum Backend", value: quantumProof.backend },
            ]
          : []),
      ],
    };

    const up = await uploadJsonToIpfs({ json: metadataJson, filename: `metadata_${sessionId}.json` });
    if (up.status === "disabled") return NextResponse.json({ success: false, error: "ipfs_disabled" }, { status: 400 });
    if (up.status === "failed") return NextResponse.json({ success: false, error: "ipfs_upload_failed", details: up.error }, { status: 500 });

    const { contractAddress, mintFunction, rpcUrl, pk } = resolveMintConfig(chainId, chain);
    if (!rpcUrl || !pk || !contractAddress) return NextResponse.json({ success: false, error: "minting_not_configured" }, { status: 400 });
    if (!isEvmAddress(contractAddress)) return NextResponse.json({ success: false, error: "invalid_contract_address" }, { status: 400 });

    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(pk, provider);
    const contract = new Contract(contractAddress, ABI, wallet);

    const fn = mintFunction;
    const method = (contract as unknown as Record<string, unknown>)[fn];
    if (typeof method !== "function") return NextResponse.json({ success: false, error: "mint_function_not_found" }, { status: 400 });
    const tx = await (method as (to: string, uri: string) => Promise<unknown>)(walletAddress, up.ipfsUrl);
    const txRec = isRecord(tx) ? tx : {};
    const wait = txRec.wait;
    if (typeof wait !== "function") return NextResponse.json({ success: false, error: "mint_tx_invalid" }, { status: 500 });
    const receipt = await (wait as () => Promise<unknown>)();
    const receiptRec = isRecord(receipt) ? receipt : {};
    const txHash = typeof receiptRec.hash === "string" ? receiptRec.hash : typeof txRec.hash === "string" ? txRec.hash : "";

    const claim = {
      claimedAt: new Date().toISOString(),
      chainId,
      walletAddress,
      txHash,
      metadataIpfsUrl: up.ipfsUrl,
    };

    setNftClaim(sessionId, claim);
    return NextResponse.json({ success: true, data: { claimed: true, ...claim } }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}
