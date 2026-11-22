import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../events/events.module.js';
import { WeddingsModule } from '../weddings/weddings.module.js';
import { PublicWebsiteService } from './public-website.service.js';
import { WebsiteConfig, WebsiteConfigSchema } from './schemas/website-config.schema.js';
import { FileAsset, FileAssetSchema } from './schemas/file-asset.schema.js';
import { WebsiteImagesService } from './website-images.service.js';
import { WebsiteService } from './website.service.js';

/** The wedding website (decision 0017). No controllers; see WebsiteHttpModule. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebsiteConfig.name, schema: WebsiteConfigSchema },
      { name: FileAsset.name, schema: FileAssetSchema },
    ]),
    WeddingsModule,
    EventsModule,
  ],
  providers: [WebsiteService, PublicWebsiteService, WebsiteImagesService],
  exports: [WebsiteService, PublicWebsiteService],
})
export class WebsiteModule {}
