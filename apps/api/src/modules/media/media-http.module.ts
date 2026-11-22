import { Module } from '@nestjs/common';
import { AlbumsController } from './albums.controller.js';
import { MediaExportsController } from './media-exports.controller.js';
import { MediaModule } from './media.module.js';
import { PhotosController } from './photos.controller.js';
import { PublicGalleryController } from './public-gallery.controller.js';
import { UploadAccessController } from './upload-access.controller.js';
import { UploadLinksController } from './upload-links.controller.js';
import { UploadsController } from './uploads.controller.js';

/** The photo endpoints. API only: the worker imports MediaModule, never this. */
@Module({
  imports: [MediaModule],
  controllers: [
    AlbumsController,
    PhotosController,
    UploadsController,
    UploadLinksController,
    UploadAccessController,
    MediaExportsController,
    PublicGalleryController,
  ],
})
export class MediaHttpModule {}
