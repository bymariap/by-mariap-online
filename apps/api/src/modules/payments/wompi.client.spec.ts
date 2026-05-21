import { WompiClient } from "./wompi.client";

describe("WompiClient", () => {
  const origFetch = global.fetch;
  afterEach(() => {
    global.fetch = origFetch;
  });

  it("builds intent data with integrity signature", () => {
    process.env.WOMPI_PUBLIC_KEY = "pub_test_abc";
    process.env.WOMPI_INTEGRITY_SECRET = "integ_test";
    const client = new WompiClient();
    const intent = client.buildIntent({
      reference: "BMR-1",
      amountInCents: 100000,
    });
    expect(intent.publicKey).toBe("pub_test_abc");
    expect(intent.amountInCents).toBe(100000);
    expect(intent.currency).toBe("COP");
    expect(intent.integritySignature).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fetches transaction by id from Wompi API", async () => {
    process.env.WOMPI_API_URL = "https://wompi.example";
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { id: "tx_1", status: "APPROVED", amount_in_cents: 100000 },
      }),
    } as any);
    const client = new WompiClient();
    const tx = await client.getTransaction("tx_1");
    expect(tx.status).toBe("APPROVED");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://wompi.example/transactions/tx_1",
      expect.any(Object),
    );
  });
});
