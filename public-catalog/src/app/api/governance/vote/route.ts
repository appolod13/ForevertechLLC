import { NextRequest, NextResponse } from "next/server";

type Proposal = {
  id: number;
  title: string;
  description: string;
  votes: { yes: number; no: number };
  status: "active" | "closed";
  deadline: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getStore() {
  const g = globalThis as unknown as { __ftGovernanceProposals?: Proposal[]; __ftGovernanceVotes?: Map<string, true> };
  if (!g.__ftGovernanceProposals) g.__ftGovernanceProposals = [];
  if (!g.__ftGovernanceVotes) g.__ftGovernanceVotes = new Map();
  return { proposals: g.__ftGovernanceProposals, votes: g.__ftGovernanceVotes };
}

function getString(v: unknown, maxLen: number) {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function getNumber(v: unknown) {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : NaN;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;
  if (!isRecord(body)) return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 });

  const proposalId = getNumber(body.proposalId);
  const vote = getString(body.vote, 3);
  const userId = getString(body.userId, 64) || "anonymous";
  if (!Number.isFinite(proposalId)) return NextResponse.json({ success: false, error: "invalid_proposalId" }, { status: 400 });
  if (vote !== "yes" && vote !== "no") return NextResponse.json({ success: false, error: "invalid_vote" }, { status: 400 });

  const { proposals, votes } = getStore();
  const p = proposals.find((x) => x.id === proposalId);
  if (!p) return NextResponse.json({ success: false, error: "proposal_not_found" }, { status: 404 });
  if (p.status !== "active") return NextResponse.json({ success: false, error: "proposal_closed" }, { status: 400 });

  const key = `${userId}:${proposalId}:${vote}`;
  if (votes.has(key)) return NextResponse.json({ success: true, alreadyVoted: true }, { status: 200 });

  votes.set(key, true);
  if (vote === "yes") p.votes.yes = (p.votes.yes || 0) + 1;
  else p.votes.no = (p.votes.no || 0) + 1;

  return NextResponse.json({ success: true }, { status: 200 });
}

