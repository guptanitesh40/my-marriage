import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboxModule } from '../../platform/outbox/outbox.module.js';
import { Notification, NotificationSchema } from './notification.schema.js';
import { NotificationsService } from './notifications.service.js';

/**
 * Requesting emails. Imported by the API and the worker; the sending side
 * (EmailDeliveryModule) is worker-only.
 */
@Module({
  imports: [
    OutboxModule,
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
  ],
  providers: [NotificationsService],
  exports: [NotificationsService, MongooseModule],
})
export class NotificationsModule {}
