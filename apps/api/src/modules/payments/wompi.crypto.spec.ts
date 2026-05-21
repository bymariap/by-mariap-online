import {
  computeIntegritySignature,
  computeEventSignature,
} from "./wompi.crypto";

describe("wompi.crypto", () => {
  it("integrity signature matches sha256(reference + amount + currency + secret)", () => {
    const sig = computeIntegritySignature({
      reference: "BMR-12345678",
      amountInCents: 5000000,
      currency: "COP",
      integritySecret: "test_integrity",
    });
    // SHA256("BMR-1234567850000000COPtest_integrity") — precomputed
    expect(sig).toBe(
      "9b10961d8a82a6be3651e95815de3d59d6abb2c7a65aff1699524681afd31bba",
    );
  });

  it("event signature concatenates property values + timestamp + secret", () => {
    const sig = computeEventSignature({
      properties: [
        { path: "transaction.id", value: "tx_1" },
        { path: "transaction.status", value: "APPROVED" },
        { path: "transaction.amount_in_cents", value: "5000000" },
      ],
      timestamp: 1700000000,
      eventSecret: "test_event",
    });
    // SHA256("tx_1APPROVED50000001700000000test_event") — precomputed
    expect(sig).toBe(
      "921f6a17fa2340ecefb9cd2b870e61d0f0134ae2ba446bb2231a36ea81a34409",
    );
  });
});
