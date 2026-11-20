import { Module } from '@nestjs/common';
import { PublicWebsiteController } from './public-website.controller.js';
import { WebsiteController } from './website.controller.js';
import { WebsiteModule } from './website.module.js';

/** The website's organizer and public routes. API only. */
@Module({
  imports: [WebsiteModule],
  controllers: [WebsiteController, PublicWebsiteController],
})
export class WebsiteHttpModule {}
