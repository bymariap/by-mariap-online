import { randomUUID } from "crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

export const S3_CLIENT = "S3_CLIENT";

export type MediaFolder = "products" | "avatars";

const MAX_WIDTH = 2500;

interface ProcessedImage {
  buffer: Buffer;
  ext: string;
  contentType: string;
}

@Injectable()
export class StorageService {
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    config: ConfigService,
  ) {
    this.bucket = config.getOrThrow<string>("R2_BUCKET");
    this.publicBase = config
      .getOrThrow<string>("R2_PUBLIC_BASE_URL")
      .replace(/\/$/, "");
  }

  async store(
    file: { buffer: Buffer; mimetype: string },
    folder: MediaFolder,
  ): Promise<string> {
    const processed = await this.process(file);
    const key = `${folder}/${randomUUID()}.${processed.ext}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: processed.buffer,
        ContentType: processed.contentType,
      }),
    );
    return `${this.publicBase}/${key}`;
  }

  private async process(file: {
    buffer: Buffer;
    mimetype: string;
  }): Promise<ProcessedImage> {
    const img = sharp(file.buffer);
    const meta = await img.metadata();
    if (meta.width && meta.width > MAX_WIDTH) {
      img.resize({ width: MAX_WIDTH });
    }
    switch (file.mimetype) {
      case "image/png":
        return {
          buffer: await img.png({ quality: 80 }).toBuffer(),
          ext: "png",
          contentType: "image/png",
        };
      case "image/webp":
        return {
          buffer: await img.webp({ quality: 80 }).toBuffer(),
          ext: "webp",
          contentType: "image/webp",
        };
      default:
        return {
          buffer: await img.jpeg({ quality: 80 }).toBuffer(),
          ext: "jpg",
          contentType: "image/jpeg",
        };
    }
  }
}
