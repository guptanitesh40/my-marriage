import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../events/events.module.js';
import { WeddingsModule } from '../weddings/weddings.module.js';
import { Vendor, VendorSchema } from './schemas/vendor.schema.js';
import { VendorsService } from './vendors.service.js';

/**
 * The vendor directory. Holds no controllers (see VendorsHttpModule), so
 * expenses can use it later from the worker too.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Vendor.name, schema: VendorSchema }]),
    WeddingsModule,
    EventsModule,
  ],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
