import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditEvent, AuditEventSchema } from './audit-event.schema.js';
import { AuditService } from './audit.service.js';

/** Recording sensitive changes. Imported by any domain module that makes them. */
@Module({
  imports: [MongooseModule.forFeature([{ name: AuditEvent.name, schema: AuditEventSchema }])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
