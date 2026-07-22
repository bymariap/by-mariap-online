import { BadGatewayException, BadRequestException } from "@nestjs/common";
import { UploadsController } from "./uploads.controller";

describe("UploadsController", () => {
  const storage = { store: jest.fn().mockResolvedValue("https://cdn/x.jpg") };
  const ctrl = new UploadsController(storage as any);

  beforeEach(() => storage.store.mockClear());

  const file = { buffer: Buffer.from("x"), mimetype: "image/jpeg" } as any;

  it("stores the file and returns the url", async () => {
    const res = await ctrl.upload(file, "products");
    expect(res).toEqual({ url: "https://cdn/x.jpg" });
    expect(storage.store).toHaveBeenCalledWith(
      { buffer: file.buffer, mimetype: "image/jpeg" },
      "products",
    );
  });

  it("rejects an invalid folder", async () => {
    await expect(ctrl.upload(file, "banners")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(storage.store).not.toHaveBeenCalled();
  });

  it("maps a storage failure to 502 Bad Gateway", async () => {
    storage.store.mockRejectedValueOnce(new Error("R2 down"));
    await expect(ctrl.upload(file, "products")).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
