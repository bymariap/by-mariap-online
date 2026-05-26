import type { PaymentIntentDTO } from "@bymariap/types";

export function buildWompiRedirectUrl(
  intent: PaymentIntentDTO,
  redirectUrl: string,
): string {
  const base = process.env.NEXT_PUBLIC_WOMPI_REDIRECT_BASE!;
  const params = new URLSearchParams({
    "public-key": intent.publicKey,
    currency: intent.currency,
    "amount-in-cents": String(intent.amountInCents),
    reference: intent.reference,
    "signature:integrity": intent.integritySignature,
    "redirect-url": redirectUrl,
  });
  return `${base}/?${params.toString()}`;
}
