import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboxModule } from '../../platform/outbox/outbox.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { GuestsModule } from '../guests/guests.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { WebsiteModule } from '../website/website.module.js';
import { EventsModule } from '../events/events.module.js';
import { WeddingsModule } from '../weddings/weddings.module.js';
import { AlbumsService } from './albums.service.js';
import { MediaExportsService } from './media-exports.service.js';
import { ModerationService } from './moderation.service.js';
import { PhotoInviteComposer } from './photo-invite.composer.js';
import { PhotoProcessor } from './photo-processor.js';
import { PhotosService } from './photos.service.js';
import { PublicGalleryService } from './public-gallery.service.js';
import { QuotaService } from './quota.service.js';
import { Album, AlbumSchema } from './schemas/album.schema.js';
import { MediaExport, MediaExportSchema } from './schemas/media-export.schema.js';
import { Photo, PhotoSchema } from './schemas/photo.schema.js';
import { UploadCapability, UploadCapabilitySchema } from './schemas/upload-capability.schema.js';
import { UploadIntent, UploadIntentSchema } from './schemas/upload-intent.schema.js';
import { UploadLinkEmail, UploadLinkEmailSchema } from './schemas/upload-link-email.schema.js';
import { UploadAccessService } from './upload-access.service.js';
import { UploadLinks } from './upload-links.js';
import { UploadLinksService } from './upload-links.service.js';
import { UploadsService } from './uploads.service.js';

/**
 * Photos: albums, uploads, moderation and exports (decision 0019). Holds
 * no controllers (see MediaHttpModule), so the worker can process photos
 * with it.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Album.name, schema: AlbumSchema },
      { name: Photo.name, schema: PhotoSchema },
      { name: UploadIntent.name, schema: UploadIntentSchema },
      { name: UploadCapability.name, schema: UploadCapabilitySchema },
      { name: UploadLinkEmail.name, schema: UploadLinkEmailSchema },
      { name: MediaExport.name, schema: MediaExportSchema },
    ]),
    OutboxModule,
    AuthModule,
    GuestsModule,
    NotificationsModule,
    WebsiteModule,
    WeddingsModule,
    EventsModule,
  ],
  providers: [
    AlbumsService,
    QuotaService,
    UploadsService,
    PhotosService,
    ModerationService,
    MediaExportsService,
    PublicGalleryService,
    PhotoProcessor,
    UploadLinks,
    UploadLinksService,
    UploadAccessService,
    PhotoInviteComposer,
  ],
  exports: [
    AlbumsService,
    QuotaService,
    UploadsService,
    PhotosService,
    ModerationService,
    MediaExportsService,
    PublicGalleryService,
    PhotoProcessor,
    UploadLinksService,
    UploadAccessService,
    PhotoInviteComposer,
  ],
})
export class MediaModule {}
