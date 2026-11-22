import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  PayloadTooLargeException,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../modules/auth/auth.decorators.js';
import { LocalObjectStorage, ObjectStorage } from './object-storage.js';

/** The largest file the local endpoint reads at all; each form sets its own, lower limit. */
const LOCAL_UPLOAD_CEILING = 20 * 1024 * 1024;

/**
 * Receives browser uploads when files are kept on this machine
 * (development and tests, no S3_BUCKET): the stand-in for S3's form POST.
 * Accepts only forms the API signed, within their size and time.
 */
@ApiExcludeController()
@Controller('local-uploads')
export class LocalUploadController {
  constructor(private readonly storage: ObjectStorage) {}

  @Public()
  @Post()
  @HttpCode(204)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: LOCAL_UPLOAD_CEILING, files: 1 } }),
  )
  async receive(
    @Body() form: Record<string, string>,
    @UploadedFile() file: { buffer: Buffer; size: number; mimetype: string } | undefined,
  ): Promise<void> {
    const storage = this.storage;
    if (!(storage instanceof LocalObjectStorage)) throw new NotFoundException();
    const grant = {
      key: String(form.key ?? ''),
      contentType: String(form['Content-Type'] ?? ''),
      maxBytes: Number(form.maxBytes),
      expires: Number(form.expires),
    };
    if (!file || !storage.accepts(grant, String(form.signature ?? ''))) {
      throw new ForbiddenException({
        code: 'UPLOAD_REFUSED',
        message: 'This upload isn’t allowed.',
      });
    }
    if (file.size > grant.maxBytes) {
      throw new PayloadTooLargeException({
        code: 'UPLOAD_TOO_LARGE',
        message: 'The file is too large.',
      });
    }
    await storage.write(grant.key, file.buffer);
  }
}
