import type { PaymentIntentDTO } from "@bymariap/types";

export function buildWompiRedirectUrl(
  intent: PaymentIntentDTO,
  redirectUrl: string,
): string {
  const base = process.env.NEXT_PUBLIC_WOMPI_REDIRECT_BASE!;
  // URLSearchParams encodes ':' as '%3A' but Wompi requires the literal colon
  // in the 'signature:integrity' key, so we build that param manually.
  const params = new URLSearchParams({
    "public-key": intent.publicKey,
    currency: intent.currency,
    "amount-in-cents": String(intent.amountInCents),
    reference: intent.reference,
    "redirect-url": redirectUrl,
  });
  return `${base}/?${params.toString()}&signature:integrity=${encodeURIComponent(intent.integritySignature)}`;
}
