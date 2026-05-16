import { NextResponse } from "next/server";

type Proposal = {
  id: number;
  title: string;
  description: string;
  votes: { yes: number; no: number };
  status: "active" | "closed";
  deadline: number;
};

function getStore() {
  const g = globalThis as unknown as { __ftGovernanceProposals?: Proposal[] };
  if (!g.__ftGovernanceProposals) {
    const now = Date.now();
    g.__ftGovernanceProposals = [
      {
        id: 101,
        title: "Reduce checkout friction",
        description: "Streamline checkout steps and improve mobile conversion.",
        votes: { yes: 42, no: 8 },
        status: "active",
        deadline: now + 7 * 24 * 60 * 60 * 1000,
      },
      {
        id: 102,
        title: "Enable Quantum Verified by default",
        description: "Make quantum proofs default when available and show the badge on all drops.",
        votes: { yes: 31, no: 19 },
        status: "active",
        deadline: now + 5 * 24 * 60 * 60 * 1000,
      },
      {
        id: 103,
        title: "Add new product colors",
        description: "Expand shirt color options and preview variants.",
        votes: { yes: 18, no: 4 },
        status: "closed",
        deadline: now - 2 * 24 * 60 * 60 * 1000,
      },
    ];
  }
  return g.__ftGovernanceProposals;
}

export async function GET() {
  const proposals = getStore();
  return NextResponse.json({ success: true, proposals }, { status: 200 });
}

