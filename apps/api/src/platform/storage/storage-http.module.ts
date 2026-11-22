import { Module } from '@nestjs/common';
import { LocalUploadController } from './local-upload.controller.js';

/** The local upload endpoint; the API only, never the worker. */
@Module({ controllers: [LocalUploadController] })
export class StorageHttpModule {}
