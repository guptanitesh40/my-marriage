import { Module } from '@nestjs/common';
import { VendorsController } from './vendors.controller.js';
import { VendorsModule } from './vendors.module.js';

/** The vendor endpoints. API only: the worker imports VendorsModule, never this. */
@Module({
  imports: [VendorsModule],
  controllers: [VendorsController],
})
export class VendorsHttpModule {}
