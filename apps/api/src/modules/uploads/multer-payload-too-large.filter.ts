import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
} from "@nestjs/common";
import { Response } from "express";

/**
 * FileInterceptor's multer layer rejects oversized files with a
 * PayloadTooLargeException (413) by default. The uploads spec requires a
 * 400 for any oversized-file rejection (whether caught by multer's own
 * limit or by MaxFileSizeValidator downstream), so this filter normalizes
 * the multer-level rejection to the same 400 response shape.
 */
@Catch(PayloadTooLargeException)
export class MulterPayloadTooLargeFilter implements ExceptionFilter {
  catch(exception: PayloadTooLargeException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const body = new BadRequestException(
      "El archivo supera el tamaño máximo permitido (8MB)",
    ).getResponse();
    res.status(400).json(typeof body === "string" ? { message: body } : body);
  }
}
