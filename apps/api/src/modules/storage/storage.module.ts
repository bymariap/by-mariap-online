import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { StorageService, S3_CLIENT } from "./storage.service";

@Module({
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new S3Client({
          region: "auto",
          endpoint: config.getOrThrow<string>("R2_ENDPOINT"),
          credentials: {
            accessKeyId: config.getOrThrow<string>("R2_ACCESS_KEY_ID"),
            secretAccessKey: config.getOrThrow<string>("R2_SECRET_ACCESS_KEY"),
          },
        }),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
