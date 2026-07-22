import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { StorageService } from "./storage.service";

function fakeConfig() {
  const values: Record<string, string> = {
    R2_BUCKET: "bymariap-media",
    R2_PUBLIC_BASE_URL: "https://cdn.bymariap.com",
  };
  return { getOrThrow: (k: string) => values[k] } as any;
}

async function makeImage(width: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height: Math.round(width * 0.75),
      channels: 3,
      background: { r: 120, g: 80, b: 60 },
    },
  })
    .jpeg()
    .toBuffer();
}

describe("StorageService", () => {
  it("downscales wide images to 2500px, keys them, and returns the public URL", async () => {
    const s3 = { send: jest.fn().mockResolvedValue({}) };
    const svc = new StorageService(s3 as any, fakeConfig());

    const input = await makeImage(3000);
    const url = await svc.store(
      { buffer: input, mimetype: "image/jpeg" },
      "products",
    );

    const cmd = s3.send.mock.calls[0][0] as PutObjectCommand;
    expect(cmd.input.Key).toMatch(
      /^products\/[0-9a-f-]{36}\.jpg$/,
    );
    expect(cmd.input.ContentType).toBe("image/jpeg");
    const outMeta = await sharp(cmd.input.Body as Buffer).metadata();
    expect(outMeta.width).toBe(2500);
    expect(url).toBe(`https://cdn.bymariap.com/${cmd.input.Key}`);
  });

  it("leaves images <= 2500px at their original width and preserves png", async () => {
    const s3 = { send: jest.fn().mockResolvedValue({}) };
    const svc = new StorageService(s3 as any, fakeConfig());

    const input = await sharp({
      create: {
        width: 1200,
        height: 900,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    await svc.store({ buffer: input, mimetype: "image/png" }, "avatars");

    const cmd = s3.send.mock.calls[0][0] as PutObjectCommand;
    expect(cmd.input.Key).toMatch(/^avatars\/[0-9a-f-]{36}\.png$/);
    expect(cmd.input.ContentType).toBe("image/png");
    const outMeta = await sharp(cmd.input.Body as Buffer).metadata();
    expect(outMeta.width).toBe(1200);
  });
});
