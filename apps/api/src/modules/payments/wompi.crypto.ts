import { createHash } from "crypto";

export interface IntegritySignatureInput {
  reference: string;
  amountInCents: number;
  currency: string;
  integritySecret: string;
}

export function computeIntegritySignature(i: IntegritySignatureInput): string {
  return sha256(
    `${i.reference}${i.amountInCents}${i.currency}${i.integritySecret}`,
  );
}

export interface EventSignatureInput {
  properties: { path: string; value: string }[];
  timestamp: number;
  eventSecret: string;
}

export function computeEventSignature(i: EventSignatureInput): string {
  const joined =
    i.properties.map((p) => p.value).join("") +
    String(i.timestamp) +
    i.eventSecret;
  return sha256(joined);
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
