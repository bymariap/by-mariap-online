import { Injectable } from "@nestjs/common";
import { computeIntegritySignature } from "./wompi.crypto";

export interface BuildIntentInput {
  reference: string;
  amountInCents: number;
}

export interface BuildIntentResult {
  reference: string;
  amountInCents: number;
  currency: "COP";
  publicKey: string;
  integritySignature: string;
}

export interface WompiTransaction {
  id: string;
  reference: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
  amount_in_cents: number;
}

@Injectable()
export class WompiClient {
  buildIntent(input: BuildIntentInput): BuildIntentResult {
    const publicKey = required("WOMPI_PUBLIC_KEY");
    const integritySecret = required("WOMPI_INTEGRITY_SECRET");
    const integritySignature = computeIntegritySignature({
      reference: input.reference,
      amountInCents: input.amountInCents,
      currency: "COP",
      integritySecret,
    });
    return {
      reference: input.reference,
      amountInCents: input.amountInCents,
      currency: "COP",
      publicKey,
      integritySignature,
    };
  }

  async getTransaction(id: string): Promise<WompiTransaction> {
    const base = required("WOMPI_API_URL");
    const res = await fetch(`${base}/transactions/${id}`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Wompi GET tx failed: ${res.status}`);
    const body = await res.json();
    return body.data;
  }
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var ${key}`);
  return v;
}
