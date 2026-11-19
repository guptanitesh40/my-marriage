# Graph Report - my-marriage  (2026-11-19)

## Corpus Check
- 252 files · ~145,553 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 2, .css 1)

## Summary
- 1663 nodes · 4587 edges · 101 communities (74 shown, 27 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 82 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d0d332ae`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.controller.ts
- react
- action-tokens.service.ts
- auth-password-reset.e2e-spec.ts
- password-hasher.ts
- auth.spec.ts
- Traced
- login-form.tsx
- partner-invite.tsx
- compilerOptions
- AuthenticatedUser
- api-exception.filter.ts
- outbox.e2e-spec.ts
- with
- Traced
- weddings.module.ts
- outbox-relay.ts
- weddings.module.ts
- member-invites.service.ts
- planning-features.tsx
- web/package.json
- wedding-records.ts
- tracing.ts
- scripts
- api/package.json
- @nestjs/common
- Icon
- migration-runner.ts
- (public)/page.tsx
- copy.ts
- catalog
- weddings.service.ts
- healthcheck
- wedding-details-form.tsx
- contracts/package.json
- dependencies
- tracing.spec.ts
- proxy.ts
- auth-verification.e2e-spec.ts
- routes.ts
- scripts
- hero.tsx
- health.controller.ts
- legal-document.tsx
- compilerOptions
- Env
- env.ts
- configure-app.ts
- outbox-event.schema.ts
- dependencies
- wedding-details-form.test.tsx
- api/eslint.config.mjs
- scripts
- planning-features.tsx
- nest-cli.json
- tsconfig.build.json
- accept-invitation.test.tsx
- IndexCheck
- app/layout.tsx
- schema.d.ts
- VerifiedProbeController
- ref_vitest
- pending-invitations.tsx
- Accounts
- auth.service.ts
- compilerOptions
- SessionsService
- routes.ts
- .create
- email-delivery.handler.ts
- sessions.service.ts
- member-invites.e2e-spec.ts
- RateLimiter
- ProbeController
- site-header.tsx
- api/package.json
- contracts/tsconfig.json
- @testing-library/react
- EmailVerificationService
- src/worker.ts
- auth-session.schema.ts
- pending-invitations.test.tsx
- AccountsService
- next.config.ts

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 71 edges
2. `Icon()` - 49 edges
3. `mongoose` - 46 edges
4. `Traced()` - 43 edges
5. `@nestjs/mongoose` - 43 edges
6. `react` - 39 edges
7. `next` - 34 edges
8. `toFailure()` - 32 edges
9. `AuthenticatedUser` - 31 edges
10. `networkFailure()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `SignedIn` --references--> `AuthenticatedUser`  [EXTRACTED]
  apps/api/src/modules/auth/auth.service.ts → apps/api/src/modules/auth/sessions.service.ts
- `PhotosSnippet()` --calls--> `Icon()`  [EXTRACTED]
  apps/web/src/components/home/guest-experience.tsx → apps/web/src/components/ui/icon.tsx
- `RsvpSnippet()` --calls--> `Icon()`  [EXTRACTED]
  apps/web/src/components/home/guest-experience.tsx → apps/web/src/components/ui/icon.tsx
- `finalState()` --calls--> `waitFor()`  [EXTRACTED]
  apps/api/test/outbox.e2e-spec.ts → apps/api/test/support/worker.ts
- `signOut()` --calls--> `goTo()`  [EXTRACTED]
  apps/web/src/components/auth/sign-out-button.tsx → apps/web/src/components/auth/hooks.ts

## Import Cycles
- None detected.

## Communities (101 total, 27 thin omitted)

### Community 0 - "auth.controller.ts"
Cohesion: 0.06
Nodes (38): AuthController, ALLOW_UNVERIFIED_KEY, AllowUnverified(), AuthenticatedRequest, Public(), PUBLIC_KEY, CurrentPasswordField(), DisplayNameField() (+30 more)

### Community 1 - "react"
Cohesion: 0.11
Nodes (23): AcceptInvitationPage(), metadata, metadata, VerifyEmailPage(), metadata, OnboardingLayout(), InboxPanel(), SignOutButton() (+15 more)

### Community 2 - "action-tokens.service.ts"
Cohesion: 0.15
Nodes (8): ActionTokensService, AUTH_TOKEN_PURPOSES, AuthActionToken, AuthActionTokenDocument, AuthActionTokenSchema, AuthTokenPurpose, randomToken(), sha256()

### Community 3 - "auth-password-reset.e2e-spec.ts"
Cohesion: 0.20
Nodes (11): accountWithResetLink(), emailTo(), forgot(), cookieFrom(), PASSWORD, resetRateLimits(), settle(), signup() (+3 more)

### Community 4 - "password-hasher.ts"
Cohesion: 0.18
Nodes (10): invalidCredentials(), ARGON2_COST, derive(), encode(), normalize(), parse(), ParsedHash, PasswordHasher (+2 more)

### Community 5 - "auth.spec.ts"
Cohesion: 0.08
Nodes (37): app, document, target, children, databaseName, mailDir, migrate, mongoUri (+29 more)

### Community 6 - "Traced"
Cohesion: 0.12
Nodes (20): mailTransportProvider, FileMailTransport, MemoryMailTransport, MailTransport, OutgoingEmail, PermanentMailError, SentEmail, TransientMailError (+12 more)

### Community 7 - "login-form.tsx"
Cohesion: 0.18
Nodes (40): ForgotPasswordForm(), submit(), goTo(), useFocusFirstProblem(), useLinkToken(), alertFor(), LoginForm(), submit() (+32 more)

### Community 8 - "partner-invite.tsx"
Cohesion: 0.09
Nodes (41): DashboardPage(), metadata, Welcome(), CreateWeddingPage(), metadata, Step(), InvitePartnerPage(), metadata (+33 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, emitDecoratorMetadata, experimentalDecorators, incremental, module, moduleResolution, outDir (+11 more)

### Community 10 - "AuthenticatedUser"
Cohesion: 0.21
Nodes (4): AuthenticatedUser, MemberInviteDto, MemberInvitesController, ApiDataResponse()

### Community 11 - "api-exception.filter.ts"
Cohesion: 0.18
Nodes (9): ApiErrorDetailDto, ApiErrorDto, FieldErrorDto, ApiExceptionFilter, CODE_BY_STATUS, Dto, run(), createValidationPipe() (+1 more)

### Community 12 - "outbox.e2e-spec.ts"
Cohesion: 0.13
Nodes (13): FINAL_NOTIFICATION_STATES, Notification, NOTIFICATION_KINDS, NOTIFICATION_STATES, NotificationKind, NotificationSchema, NotificationState, NotificationsModule (+5 more)

### Community 13 - "with"
Cohesion: 0.07
Nodes (33): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, API_ORIGIN, jobs (+25 more)

### Community 14 - "Traced"
Cohesion: 0.16
Nodes (14): passwordChangedMessage(), passwordResetMessage(), verifyEmailMessage(), ComposedEmail, EmailComposer, EmailToCompose, BRAND, EmailLayout (+6 more)

### Community 15 - "weddings.module.ts"
Cohesion: 0.12
Nodes (9): WeddingMembership, Wedding, WeddingQuota, WeddingAccess, WeddingAccessService, ownerLimit(), ownersOnly(), PAST_DATE_MESSAGE (+1 more)

### Community 16 - "outbox-relay.ts"
Cohesion: 0.11
Nodes (13): OutboxEventDocument, DEFAULT_OUTBOX_RETRY, OUTBOX_HANDLERS, OUTBOX_RETRY, OutboxHandler, OutboxRetryOptions, OUTBOX_QUEUE, OutboxJobData (+5 more)

### Community 17 - "weddings.module.ts"
Cohesion: 0.10
Nodes (23): InvitePreviewDto, INVITE_EMAIL_STATUSES, INVITE_VIEW_STATUSES, MyInviteDto, INVITE_STATUSES, InviteStatus, MembershipInvite, MembershipInviteDocument (+15 more)

### Community 18 - "member-invites.service.ts"
Cohesion: 0.11
Nodes (17): CreateMemberInviteDto, WeddingDto, emailStatusOf(), inviteNotFound(), isExpired(), MemberInvitesService, ownerActiveLimitOnAccept(), StoredInvite (+9 more)

### Community 19 - "planning-features.tsx"
Cohesion: 0.16
Nodes (16): CEREMONY_TONE, celebrations, ceremonies, Ceremony, CeremonyTone, dashboard, expenses, linkHousehold (+8 more)

### Community 20 - "web/package.json"
Cohesion: 0.08
Nodes (33): devDependencies, @axe-core/playwright@^4.14.0, eslint@catalog:, eslint-config-next@16.4.6, eslint-config-prettier@catalog:, jsdom@^31.0.1, @playwright/test@^1.65.1, tailwindcss@4.3.5 (+25 more)

### Community 21 - "wedding-records.ts"
Cohesion: 0.57
Nodes (4): duplicateKeyOn(), DuplicateKey, duplicateKey(), parseObjectId()

### Community 22 - "tracing.ts"
Cohesion: 0.15
Nodes (25): addStep(), closeStep(), currentTrace(), describeError(), describeList(), describePositional(), describeTopLevel(), describeValue() (+17 more)

### Community 23 - "scripts"
Cohesion: 0.07
Nodes (28): description, devDependencies, prettier@catalog:, engines, node, pnpm, name, packageManager (+20 more)

### Community 24 - "api/package.json"
Cohesion: 0.12
Nodes (17): devDependencies, @nestjs/cli@^12.0.13, @nestjs/schematics@^12.0.13, @nestjs/testing@^12.5.0, supertest@^7.3.2, @types/express@^5.0.6, @types/node@catalog:, @types/supertest@^7.2.1 (+9 more)

### Community 25 - "@nestjs/common"
Cohesion: 0.15
Nodes (12): HealthModule, WeddingsHttpModule, RateLimitHit, RateLimitState, InjectRedis(), REDIS, RedisLifecycle, redisProviders (+4 more)

### Community 26 - "Icon"
Cohesion: 0.17
Nodes (15): goTo, post, PasswordField(), PasswordFieldProps, SelectField(), SelectFieldProps, describedBy(), FieldFrame() (+7 more)

### Community 27 - "migration-runner.ts"
Cohesion: 0.09
Nodes (17): IndexCheckModule, assertOrdered(), MigrationRecord, MigrationRunner, MIGRATIONS_COLLECTION, identityIndexes, inviteIndexes, messagingIndexes (+9 more)

### Community 28 - "(public)/page.tsx"
Cohesion: 0.25
Nodes (13): HomePage(), metadata, Celebrations(), GuestExperience(), HowItWorks(), Trust(), LOOK, TemplateId (+5 more)

### Community 29 - "copy.ts"
Cohesion: 0.15
Nodes (12): CARD_VISUALS, PhotosSnippet(), RsvpSnippet(), STEP_SNIPPETS, SectionHeadingProps, WIDTHS, GuestCardId, guestExperience (+4 more)

### Community 30 - "catalog"
Cohesion: 0.09
Nodes (21): allowBuilds, msgpackr-extract, @scarf/scarf, eslint-plugin-import>eslint, eslint-plugin-jsx-a11y>eslint, eslint-plugin-react>eslint, openapi-typescript>typescript, catalog (+13 more)

### Community 31 - "weddings.service.ts"
Cohesion: 0.17
Nodes (17): CreateWeddingDto, normalizeText, OptionalDateField(), TextLineField(), UpdateWeddingDto, isFallbackBase(), SLUG_PATTERN, slugBase() (+9 more)

### Community 32 - "healthcheck"
Cohesion: 0.11
Nodes (20): interval, retries, start_period, test, timeout, command, healthcheck, image (+12 more)

### Community 33 - "wedding-details-form.tsx"
Cohesion: 0.22
Nodes (16): Optional(), Required(), Wedding, WeddingDetailsForm(), submit(), OUTSIDE_INDIA, WEDDING_STATES, dateError() (+8 more)

### Community 34 - "contracts/package.json"
Cohesion: 0.14
Nodes (15): description, devDependencies, openapi-typescript@^7.13.0, typescript@catalog:, exports, ./openapi.json, typescript, name (+7 more)

### Community 35 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, bullmq@^6.7.7, class-validator@^0.15.1, ioredis@^6.0.0, mongoose@^9.12.1, @nestjs/common@^12.5.0, @nestjs/config@^12.1.1, @nestjs/core@^12.5.0 (+10 more)

### Community 36 - "tracing.spec.ts"
Cohesion: 0.24
Nodes (8): formatMs(), logTrace(), renderTrace(), accounts, Decorated, traced(), startTrace(), Trace

### Community 37 - "proxy.ts"
Cohesion: 0.19
Nodes (11): apiClientAsVisitor(), FORWARDED_HEADERS, safeNextPath(), SESSION_COOKIE, config, proxy(), Session, sessionOf() (+3 more)

### Community 38 - "auth-verification.e2e-spec.ts"
Cohesion: 0.12
Nodes (12): AuthEmailComposer, AuthModule, User, USER_STATUSES, UserDocument, UserSchema, UserStatus, EmailDeliveryModule (+4 more)

### Community 39 - "routes.ts"
Cohesion: 0.23
Nodes (10): AppLayout(), metadata, AuthLayout(), metadata, CopyrightYear(), LINKS, container, Wordmark() (+2 more)

### Community 40 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:migrate, dev, dev:worker, lint, openapi:export, start (+5 more)

### Community 41 - "hero.tsx"
Cohesion: 0.20
Nodes (13): Closing(), DashboardMockup(), Hero(), Metric(), ForVisitor(), StartPlanningLink(), StartPlanningLinkProps, faq (+5 more)

### Community 42 - "health.controller.ts"
Cohesion: 0.16
Nodes (5): HealthController, noTerminusDocs, toDto(), HealthDto, RedisHealthIndicator

### Community 43 - "legal-document.tsx"
Cohesion: 0.35
Nodes (7): metadata, PrivacyPage(), metadata, TermsPage(), LegalDocument(), LegalDocumentProps, readingContainer

### Community 44 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, noFallthroughCasesInSwitch, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+3 more)

### Community 46 - "env.ts"
Cohesion: 0.20
Nodes (10): reflect-metadata@^0.2.2, crossFieldProblems(), DEFAULT_TRACE_MODE, ENV_KEYS, MAIL_TRANSPORTS, MailTransportName, valid, validateEnv() (+2 more)

### Community 47 - "configure-app.ts"
Cohesion: 0.12
Nodes (18): API_PREFIX, configureApp(), createOpenApiDocument(), app, config, accessLog(), defaultHeaders(), logger (+10 more)

### Community 48 - "outbox-event.schema.ts"
Cohesion: 0.16
Nodes (7): OUTBOX_STATES, OutboxEvent, OutboxEventSchema, OutboxState, OutboxModule, NewOutboxEvent, OutboxService

### Community 49 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, @my-marriage/contracts@workspace:*, next@16.4.6, openapi-fetch@^0.17.0, react@19.3.1, react-dom@19.3.1, @my-marriage/contracts, openapi-fetch (+1 more)

### Community 50 - "wedding-details-form.test.tsx"
Cohesion: 0.25
Nodes (5): fill(), fillRequired(), goTo, patch, post

### Community 51 - "api/eslint.config.mjs"
Cohesion: 0.29
Nodes (4): @eslint/js@catalog:, typescript-eslint@catalog:, @eslint/js, typescript-eslint

### Community 52 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, start, test, test:browser, typecheck

### Community 53 - "planning-features.tsx"
Cohesion: 0.13
Nodes (16): Amount(), AVATAR, COLUMN_DOT, ExpensesPreview(), GuestsPreview(), HouseholdRow(), PlanningFeatures(), RSVP_LABEL (+8 more)

### Community 54 - "nest-cli.json"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 55 - "tsconfig.build.json"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, exclude, extends, include, ./tsconfig.json

### Community 56 - "accept-invitation.test.tsx"
Cohesion: 0.33
Nodes (6): answer(), get, me, post, preview, reply()

### Community 58 - "app/layout.tsx"
Cohesion: 0.33
Nodes (3): manrope, metadata, newsreader

### Community 59 - "schema.d.ts"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 61 - "ref_vitest"
Cohesion: 0.11
Nodes (11): AppModule, ProbeDto, VenueDto, createTestApp(), dropTestDatabase(), couple(), create(), created() (+3 more)

### Community 62 - "pending-invitations.tsx"
Cohesion: 0.29
Nodes (16): AcceptButton(), Detail(), Eyebrow(), firstName(), Heading(), initials(), MyInvite, PendingInvitations() (+8 more)

### Community 63 - "Accounts"
Cohesion: 0.24
Nodes (3): Accounts, Hasher, Traced()

### Community 67 - "auth.service.ts"
Cohesion: 0.21
Nodes (9): ClientContext, invalidLink(), rejectPassword(), AuthHttpModule, RATE_LIMITS, SignedIn, normalizeEmail(), passwordProblems() (+1 more)

### Community 68 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowJs, incremental, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 70 - "routes.ts"
Cohesion: 0.24
Nodes (11): ForgotPasswordPage(), metadata, LoginPage(), metadata, metadata, ResetPasswordPage(), metadata, SignupPage() (+3 more)

### Community 72 - "email-delivery.handler.ts"
Cohesion: 0.19
Nodes (6): EMAIL_COMPOSERS, EmailDeliveryHandler, NotificationDocument, DeliveryAttempt, OutboxEventView, @nestjs/config

### Community 73 - "sessions.service.ts"
Cohesion: 0.21
Nodes (7): RESET_PASSWORD_TTL_MS, SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, SESSION_TOUCH_MS, VERIFY_EMAIL_TTL_MS, NewSession, toAuthenticatedUser()

### Community 74 - "member-invites.e2e-spec.ts"
Cohesion: 0.20
Nodes (7): WeddingsModule, invitationEmail(), invite(), invited(), ownerWithWedding(), tag(), signupVerified()

### Community 77 - "site-header.tsx"
Cohesion: 0.27
Nodes (11): PublicLayout(), renderHome(), AccountHome, accountHome, HeaderAccount(), HeaderAccountPlaceholder(), SiteFooter(), NAV (+3 more)

### Community 78 - "api/package.json"
Cohesion: 0.15
Nodes (12): class-transformer@^0.5.1, eslint@catalog:, eslint-config-prettier@catalog:, typescript@catalog:, eslint, eslint-config-prettier, typescript, name (+4 more)

### Community 79 - "contracts/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, noEmit, extends, include, ../../tsconfig.base.json

### Community 80 - "@testing-library/react"
Cohesion: 0.29
Nodes (4): @testing-library/react@^16.3.3, invite, post, @testing-library/react

### Community 82 - "src/worker.ts"
Cohesion: 0.28
Nodes (4): AppLogger, JSON_LOGS, currentRequestId(), WorkerModule

### Community 83 - "auth-session.schema.ts"
Cohesion: 0.25
Nodes (3): AuthSession, AuthSessionDocument, AuthSessionSchema

### Community 84 - "pending-invitations.test.tsx"
Cohesion: 0.29
Nodes (6): failure(), goTo, invite, other, post, reply()

## Knowledge Gaps
- **4 isolated node(s):** `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 554 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `auth.controller.ts`, `action-tokens.service.ts`, `auth-password-reset.e2e-spec.ts`, `password-hasher.ts`, `Traced`, `api-exception.filter.ts`, `outbox.e2e-spec.ts`, `Traced`, `weddings.module.ts`, `outbox-relay.ts`, `weddings.module.ts`, `member-invites.service.ts`, `tracing.ts`, `migration-runner.ts`, `weddings.service.ts`, `dependencies`, `tracing.spec.ts`, `auth-verification.e2e-spec.ts`, `health.controller.ts`, `configure-app.ts`, `outbox-event.schema.ts`, `ref_vitest`, `auth.service.ts`, `email-delivery.handler.ts`, `sessions.service.ts`, `member-invites.e2e-spec.ts`, `api/package.json`, `src/worker.ts`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _4 weakly-connected nodes found - possible missing edges._
- **Should `auth.controller.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06265432098765432 - nodes in this community are weakly interconnected._
- **Why does `mongoose` connect `migration-runner.ts` to `action-tokens.service.ts`, `auth-password-reset.e2e-spec.ts`, `auth.spec.ts`, `outbox.e2e-spec.ts`, `Traced`, `weddings.module.ts`, `outbox-relay.ts`, `weddings.module.ts`, `member-invites.service.ts`, `wedding-records.ts`, `tracing.ts`, `@nestjs/common`, `weddings.service.ts`, `dependencies`, `tracing.spec.ts`, `auth-verification.e2e-spec.ts`, `outbox-event.schema.ts`, `ref_vitest`, `auth.service.ts`, `email-delivery.handler.ts`, `sessions.service.ts`, `member-invites.e2e-spec.ts`, `api/package.json`, `auth-session.schema.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.10887096774193548 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `wedding-details-form.tsx`, `routes.ts`, `login-form.tsx`, `partner-invite.tsx`, `hero.tsx`, `legal-document.tsx`, `site-header.tsx`, `dependencies`, `web/package.json`, `planning-features.tsx`, `Icon`, `copy.ts`, `pending-invitations.tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `auth.spec.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07878787878787878 - nodes in this community are weakly interconnected._