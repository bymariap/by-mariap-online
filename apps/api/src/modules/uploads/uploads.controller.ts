import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  HttpStatus,
  Logger,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { StorageService, MediaFolder } from "../storage/storage.service";

const MAX_SIZE = 8 * 1024 * 1024;
const FOLDERS: MediaFolder[] = ["products", "avatars"];

@Controller()
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly storage: StorageService) {}

  @Post("admin/uploads")
  @RequirePermissions("media:write")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_SIZE }),
          new FileTypeValidator({ fileType: /^image\/(jpe?g|png|webp)$/ }),
        ],
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    file: Express.Multer.File,
    @Body("folder") folder: string,
  ): Promise<{ url: string }> {
    if (!FOLDERS.includes(folder as MediaFolder)) {
      throw new BadRequestException('folder must be "products" or "avatars"');
    }
    try {
      const url = await this.storage.store(
        { buffer: file.buffer, mimetype: file.mimetype },
        folder as MediaFolder,
      );
      return { url };
    } catch (err) {
      this.logger.error("R2 upload failed", err as Error);
      throw new BadGatewayException("No se pudo almacenar la imagen");
    }
  }
}
