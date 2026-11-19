import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsService } from './accounts.service.js';
import { ActionTokensService } from './action-tokens.service.js';
import { AuthEmailComposer } from './auth-email.composer.js';
import { PasswordHasher } from './password-hasher.js';
import { AuthActionToken, AuthActionTokenSchema } from './schemas/auth-action-token.schema.js';
import { AuthSession, AuthSessionSchema } from './schemas/auth-session.schema.js';
import { User, UserSchema } from './schemas/user.schema.js';
import { SessionsService } from './sessions.service.js';

/**
 * Accounts, sessions and email-link tokens: the identity core. Imported by
 * both the API and the worker, so it holds no controllers; the HTTP layer is
 * a separate module that only the API imports.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AuthSession.name, schema: AuthSessionSchema },
      { name: AuthActionToken.name, schema: AuthActionTokenSchema },
    ]),
  ],
  providers: [
    PasswordHasher,
    SessionsService,
    ActionTokensService,
    AuthEmailComposer,
    AccountsService,
  ],
  exports: [
    PasswordHasher,
    SessionsService,
    ActionTokensService,
    AuthEmailComposer,
    AccountsService,
    MongooseModule,
  ],
})
export class AuthModule {}
