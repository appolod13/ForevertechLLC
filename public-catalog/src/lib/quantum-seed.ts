import { NextResponse } from "next/server";

export interface QuantumSeedResponse {
  success: boolean;
  data?: {
    provider: string;
    jobId: string;
    backend: string;
    seed: string;
    shots: number;
    createdAt: string;
  };
  error?: string;
}

export async function getQuantumSeed(orderId: string, purpose = "fractal_generation"): Promise<QuantumSeedResponse> {
  const baseUrl = process.env.IBM_SEED_SERVICE_URL || "http://localhost:8000";
  const authToken = process.env.IBM_SEED_SERVICE_AUTH || "";

  try {
    const res = await fetch(`${baseUrl}/seed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: JSON.stringify({ orderId, purpose }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, error: `Seed service error: ${res.status} ${errorText}` };
    }

    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reach IBM Quantum seed service" };
  }
}
