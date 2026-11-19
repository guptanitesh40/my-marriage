import {
  Module,
  type DynamicModule,
  type ModuleMetadata,
  type Provider,
  type Type,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import { EMAIL_COMPOSERS, type EmailComposer } from './email-composer.js';
import { EmailDeliveryHandler } from './email-delivery.handler.js';
import { FileMailTransport, MemoryMailTransport } from './mail/local.transports.js';
import { MailTransport } from './mail/mail-transport.js';
import { ResendTransport } from './mail/resend.transport.js';
import { NotificationsModule } from './notifications.module.js';

const mailTransportProvider: Provider = {
  provide: MailTransport,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): MailTransport => {
    switch (config.get('MAIL_TRANSPORT', { infer: true })) {
      case 'resend': {
        // validateEnv requires the key whenever this transport is selected.
        const apiKey = config.get('RESEND_API_KEY', { infer: true });
        if (!apiKey) throw new Error('RESEND_API_KEY is not set');
        return new ResendTransport(apiKey);
      }
      case 'file':
        return new FileMailTransport(config.get('MAIL_FILE_DIR', { infer: true }));
      case 'memory':
        return new MemoryMailTransport();
    }
  },
};

/**
 * Sending emails: the mail transport and the outbox handler that uses it.
 * Worker only. `imports` must export every class listed in `composers`.
 */
@Module({})
export class EmailDeliveryModule {
  static register(options: {
    imports?: ModuleMetadata['imports'];
    composers: Type<EmailComposer>[];
  }): DynamicModule {
    return {
      module: EmailDeliveryModule,
      imports: [NotificationsModule, ...(options.imports ?? [])],
      providers: [
        EmailDeliveryHandler,
        mailTransportProvider,
        {
          provide: EMAIL_COMPOSERS,
          inject: options.composers,
          useFactory: (...composers: EmailComposer[]) => composers,
        },
      ],
      exports: [EmailDeliveryHandler, MailTransport],
    };
  }
}
