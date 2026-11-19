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
import { SmtpTransport } from './mail/smtp.transport.js';
import { NotificationsModule } from './notifications.module.js';

const mailTransportProvider: Provider = {
  provide: MailTransport,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): MailTransport => {
    switch (config.get('MAIL_TRANSPORT', { infer: true })) {
      case 'smtp': {
        // validateEnv requires both whenever this transport is selected.
        const user = config.get('SMTP_USER', { infer: true });
        const password = config.get('SMTP_PASSWORD', { infer: true });
        if (!user || !password) throw new Error('SMTP_USER and SMTP_PASSWORD are not set');
        return new SmtpTransport({
          host: config.get('SMTP_HOST', { infer: true }),
          port: config.get('SMTP_PORT', { infer: true }),
          user,
          // Google shows App Passwords in groups of four; the spaces are not part of it.
          password: password.replace(/\s+/g, ''),
        });
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
