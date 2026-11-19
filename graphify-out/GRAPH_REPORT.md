# Graph Report - my-marriage  (2026-11-19)

## Corpus Check
- 249 files · ~133,723 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 2, .css 1)

## Summary
- 1598 nodes · 4416 edges · 83 communities (67 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8303630b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.controller.ts
- auth/server.tsx
- mongoose
- ref_vitest
- password-hasher.ts
- auth.spec.ts
- support/worker.ts
- login-form.tsx
- partner-invite.tsx
- compilerOptions
- ApiDataResponse
- api-exception.filter.ts
- @nestjs/mongoose
- with
- Traced
- WeddingMembership
- outbox-relay.ts
- member-invites.controller.ts
- member-invites.service.ts
- planning-features.tsx
- web/package.json
- rate-limit.ts
- tracing.ts
- scripts
- api/package.json
- @nestjs/common
- react
- migration-runner.ts
- copy.ts
- Icon
- catalog
- weddings.service.ts
- healthcheck
- wedding-details-form.tsx
- contracts/package.json
- dependencies
- tracing.spec.ts
- proxy.ts
- configure-app.ts
- routes.ts
- scripts
- hero.tsx
- wedding-access.service.ts
- legal-document.tsx
- compilerOptions
- Env
- BackgroundTasks
- weddings.controller.ts
- auth-password-reset.e2e-spec.ts
- dependencies
- wedding-details-form.test.tsx
- api/eslint.config.mjs
- scripts
- preview-tabs.test.tsx
- nest-cli.json
- tsconfig.build.json
- accept-invitation.test.tsx
- IndexCheck
- app/layout.tsx
- schema.d.ts
- VerifiedProbeController
- ProbeDto
- accept-invitation.tsx
- next.config.ts
- auth.service.ts
- compilerOptions
- sha256
- routes
- .create
- email-delivery.handler.ts
- sessions.service.ts
- SessionsService
- RateLimiter
- ProbeController
- member-invites.e2e-spec.ts
- EmailVerificationService
- contracts/tsconfig.json
- @testing-library/react
- trace.interceptor.ts
- @vitejs/plugin-react

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 71 edges
2. `mongoose` - 46 edges
3. `@nestjs/mongoose` - 43 edges
4. `Traced()` - 43 edges
5. `Icon()` - 42 edges
6. `react` - 38 edges
7. `next` - 33 edges
8. `Env` - 29 edges
9. `toFailure()` - 29 edges
10. `networkFailure()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `EmailRequest` --references--> `NotificationKind`  [EXTRACTED]
  apps/api/src/modules/notifications/notifications.service.ts → apps/api/src/modules/notifications/notification.schema.ts
- `invitationEmail()` --calls--> `waitFor()`  [EXTRACTED]
  apps/api/test/member-invites.e2e-spec.ts → apps/api/test/support/worker.ts
- `AcceptInvitationPage()` --calls--> `AcceptInvitation()`  [EXTRACTED]
  apps/web/src/app/(auth)/invitations/accept/page.tsx → apps/web/src/components/onboarding/accept-invitation.tsx
- `RsvpSnippet()` --calls--> `Icon()`  [EXTRACTED]
  apps/web/src/components/home/guest-experience.tsx → apps/web/src/components/ui/icon.tsx
- `PhotosSnippet()` --calls--> `Icon()`  [EXTRACTED]
  apps/web/src/components/home/guest-experience.tsx → apps/web/src/components/ui/icon.tsx

## Import Cycles
- None detected.

## Communities (83 total, 16 thin omitted)

### Community 0 - "auth.controller.ts"
Cohesion: 0.05
Nodes (40): HealthController, noTerminusDocs, toDto(), HealthDto, RedisHealthIndicator, AuthController, ALLOW_UNVERIFIED_KEY, AllowUnverified() (+32 more)

### Community 1 - "auth/server.tsx"
Cohesion: 0.14
Nodes (18): metadata, VerifyEmailPage(), AccountHome, accountHome, currentUserOrNull, InboxPanel(), hasKeptInvitation(), nextStep() (+10 more)

### Community 2 - "mongoose"
Cohesion: 0.10
Nodes (12): AUTH_TOKEN_PURPOSES, AuthActionToken, AuthActionTokenSchema, AuthSession, AuthSessionDocument, AuthSessionSchema, User, USER_STATUSES (+4 more)

### Community 3 - "ref_vitest"
Cohesion: 0.16
Nodes (13): createTestApp(), cookieFrom(), PASSWORD, resetRateLimits(), signup(), signupVerified(), uniqueEmail(), couple() (+5 more)

### Community 4 - "password-hasher.ts"
Cohesion: 0.18
Nodes (10): invalidCredentials(), ARGON2_COST, derive(), encode(), normalize(), parse(), ParsedHash, PasswordHasher (+2 more)

### Community 5 - "auth.spec.ts"
Cohesion: 0.08
Nodes (37): app, document, target, children, databaseName, mailDir, migrate, mongoUri (+29 more)

### Community 6 - "support/worker.ts"
Cohesion: 0.15
Nodes (14): EmailDeliveryModule, mailTransportProvider, FileMailTransport, MemoryMailTransport, MailTransport, OutgoingEmail, PermanentMailError, SentEmail (+6 more)

### Community 7 - "login-form.tsx"
Cohesion: 0.19
Nodes (37): ForgotPasswordForm(), submit(), useFocusFirstProblem(), useLinkToken(), alertFor(), LoginForm(), submit(), ResendVerification() (+29 more)

### Community 8 - "partner-invite.tsx"
Cohesion: 0.10
Nodes (33): DashboardPage(), metadata, Welcome(), CreateWeddingPage(), metadata, InvitePartnerPage(), metadata, TONES (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, emitDecoratorMetadata, experimentalDecorators, incremental, module, moduleResolution, outDir (+11 more)

### Community 10 - "ApiDataResponse"
Cohesion: 0.19
Nodes (3): CurrentUser, MemberInvitesController, ApiDataResponse()

### Community 11 - "api-exception.filter.ts"
Cohesion: 0.16
Nodes (11): ApiErrorDetailDto, ApiErrorDto, FieldErrorDto, ApiExceptionFilter, CODE_BY_STATUS, Dto, run(), currentTrace() (+3 more)

### Community 12 - "@nestjs/mongoose"
Cohesion: 0.07
Nodes (22): FINAL_NOTIFICATION_STATES, Notification, NOTIFICATION_KINDS, NOTIFICATION_STATES, NotificationSchema, NotificationState, NotificationsModule, EMAIL_REQUESTED (+14 more)

### Community 13 - "with"
Cohesion: 0.07
Nodes (33): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, API_ORIGIN, jobs (+25 more)

### Community 14 - "Traced"
Cohesion: 0.13
Nodes (18): AccountsService, AuthEmailComposer, passwordChangedMessage(), passwordResetMessage(), verifyEmailMessage(), ComposedEmail, EmailComposer, EmailToCompose (+10 more)

### Community 16 - "outbox-relay.ts"
Cohesion: 0.12
Nodes (12): OutboxEventDocument, DEFAULT_OUTBOX_RETRY, OUTBOX_HANDLERS, OUTBOX_RETRY, OutboxHandler, OutboxRetryOptions, OUTBOX_QUEUE, OutboxJobData (+4 more)

### Community 17 - "member-invites.controller.ts"
Cohesion: 0.21
Nodes (7): CreateMemberInviteDto, INVITABLE_ROLES, InvitePreviewDto, INVITE_EMAIL_STATUSES, INVITE_VIEW_STATUSES, MEMBERSHIP_ROLES, @nestjs/swagger

### Community 18 - "member-invites.service.ts"
Cohesion: 0.15
Nodes (14): SignedIn, AuthenticatedUser, MemberInviteDto, emailStatusOf(), inviteNotFound(), isExpired(), MemberInvitesService, ownerActiveLimitOnAccept() (+6 more)

### Community 19 - "planning-features.tsx"
Cohesion: 0.12
Nodes (24): Amount(), AVATAR, COLUMN_DOT, ExpensesPreview(), RSVP_LABEL, TASK_ICON_COLOUR, TaskBoard(), TaskCard() (+16 more)

### Community 20 - "web/package.json"
Cohesion: 0.09
Nodes (31): devDependencies, @axe-core/playwright@^4.14.0, eslint@catalog:, eslint-config-next@16.4.6, eslint-config-prettier@catalog:, jsdom@^31.0.1, @playwright/test@^1.65.1, tailwindcss@4.3.5 (+23 more)

### Community 21 - "rate-limit.ts"
Cohesion: 0.12
Nodes (9): INVITE_TTL_MS, MAX_OWNERS, WEDDING_RATE_LIMITS, WEDDING_TIME_ZONE, RateLimitHit, RateLimitRule, RateLimitState, InjectRedis() (+1 more)

### Community 22 - "tracing.ts"
Cohesion: 0.14
Nodes (24): JSON_LOGS, addStep(), closeStep(), describeError(), describeList(), describePositional(), describeTopLevel(), describeValue() (+16 more)

### Community 23 - "scripts"
Cohesion: 0.07
Nodes (28): description, devDependencies, prettier@catalog:, engines, node, pnpm, name, packageManager (+20 more)

### Community 24 - "api/package.json"
Cohesion: 0.10
Nodes (27): devDependencies, eslint@catalog:, eslint-config-prettier@catalog:, @nestjs/cli@^12.0.13, @nestjs/schematics@^12.0.13, @nestjs/testing@^12.5.0, supertest@^7.3.2, @types/express@^5.0.6 (+19 more)

### Community 25 - "@nestjs/common"
Cohesion: 0.07
Nodes (26): AppModule, HealthModule, app, config, WeddingsHttpModule, WeddingsModule, IndexCheckModule, AppLogger (+18 more)

### Community 26 - "react"
Cohesion: 0.16
Nodes (15): goTo, post, PasswordField(), PasswordFieldProps, SelectField(), SelectFieldProps, describedBy(), FieldFrame() (+7 more)

### Community 27 - "migration-runner.ts"
Cohesion: 0.17
Nodes (11): assertOrdered(), MigrationRecord, identityIndexes, inviteIndexes, messagingIndexes, Migration, MIGRATIONS, weddingIndexes (+3 more)

### Community 28 - "copy.ts"
Cohesion: 0.12
Nodes (19): CARD_VISUALS, PhotosSnippet(), RsvpSnippet(), STEP_SNIPPETS, LOOK, TemplateId, container, SectionHeadingProps (+11 more)

### Community 29 - "Icon"
Cohesion: 0.31
Nodes (14): HomePage(), metadata, Celebrations(), Closing(), GuestExperience(), HowItWorks(), GuestsPreview(), HouseholdRow() (+6 more)

### Community 30 - "catalog"
Cohesion: 0.09
Nodes (21): allowBuilds, msgpackr-extract, @scarf/scarf, eslint-plugin-import>eslint, eslint-plugin-jsx-a11y>eslint, eslint-plugin-react>eslint, openapi-typescript>typescript, catalog (+13 more)

### Community 31 - "weddings.service.ts"
Cohesion: 0.16
Nodes (16): WEDDING_QUOTA_BYTES, isFallbackBase(), SLUG_PATTERN, slugBase(), toWords(), withSuffix(), fieldError(), inviteEmailMismatch() (+8 more)

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
Nodes (18): dependencies, class-transformer@^0.5.1, class-validator@^0.15.1, ioredis@^6.0.0, mongoose@^9.12.1, @nestjs/common@^12.5.0, @nestjs/config@^12.1.1, @nestjs/core@^12.5.0 (+10 more)

### Community 36 - "tracing.spec.ts"
Cohesion: 0.14
Nodes (9): formatMs(), renderTrace(), Accounts, accounts, Decorated, Hasher, traced(), startTrace() (+1 more)

### Community 37 - "proxy.ts"
Cohesion: 0.21
Nodes (11): apiClientAsVisitor(), FORWARDED_HEADERS, safeNextPath(), loginThenReturnTo(), config, proxy(), Session, sessionOf() (+3 more)

### Community 38 - "configure-app.ts"
Cohesion: 0.15
Nodes (16): API_PREFIX, configureApp(), createOpenApiDocument(), accessLog(), defaultHeaders(), logger, finish(), getRequestId() (+8 more)

### Community 39 - "routes.ts"
Cohesion: 0.17
Nodes (17): AppLayout(), metadata, AuthLayout(), metadata, PublicLayout(), renderHome(), CopyrightYear(), HeaderAccount() (+9 more)

### Community 40 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:migrate, dev, dev:worker, lint, openapi:export, start (+5 more)

### Community 41 - "hero.tsx"
Cohesion: 0.22
Nodes (11): CEREMONY_TONE, DashboardMockup(), Hero(), Metric(), StartPlanningLink(), celebrations, hero, CeremonyTone (+3 more)

### Community 42 - "wedding-access.service.ts"
Cohesion: 0.15
Nodes (16): WeddingDto, ACTIVE_OWNED_INDEX, MEMBERSHIP_STATUSES, MembershipRole, MembershipStatus, WeddingMembershipDocument, WeddingMembershipSchema, Wedding (+8 more)

### Community 43 - "legal-document.tsx"
Cohesion: 0.35
Nodes (7): metadata, PrivacyPage(), metadata, TermsPage(), LegalDocument(), LegalDocumentProps, readingContainer

### Community 44 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, noFallthroughCasesInSwitch, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+3 more)

### Community 45 - "Env"
Cohesion: 0.08
Nodes (10): crossFieldProblems(), DEFAULT_TRACE_MODE, Env, ENV_KEYS, MAIL_TRANSPORTS, MailTransportName, valid, validateEnv() (+2 more)

### Community 47 - "weddings.controller.ts"
Cohesion: 0.44
Nodes (5): CreateWeddingDto, normalizeText, OptionalDateField(), TextLineField(), UpdateWeddingDto

### Community 48 - "auth-password-reset.e2e-spec.ts"
Cohesion: 0.14
Nodes (11): accountWithResetLink(), emailTo(), forgot(), emailsTo(), finalState(), ProbeComposerModule, settle(), tokenFromEmail() (+3 more)

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

### Community 53 - "preview-tabs.test.tsx"
Cohesion: 0.29
Nodes (3): PreviewTab, PreviewTabs(), tabs

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

### Community 62 - "accept-invitation.tsx"
Cohesion: 0.15
Nodes (15): AcceptInvitationPage(), metadata, metadata, OnboardingLayout(), goTo(), SignOutButton(), signOut(), Me (+7 more)

### Community 67 - "auth.service.ts"
Cohesion: 0.25
Nodes (8): ClientContext, invalidLink(), rejectPassword(), AuthHttpModule, RATE_LIMITS, normalizeEmail(), passwordProblems(), NotificationsService

### Community 68 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowJs, incremental, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 69 - "sha256"
Cohesion: 0.23
Nodes (5): ActionTokensService, AuthActionTokenDocument, AuthTokenPurpose, randomToken(), sha256()

### Community 70 - "routes"
Cohesion: 0.25
Nodes (11): ForgotPasswordPage(), metadata, LoginPage(), metadata, metadata, ResetPasswordPage(), metadata, SignupPage() (+3 more)

### Community 72 - "email-delivery.handler.ts"
Cohesion: 0.23
Nodes (7): bullmq@^6.7.7, EMAIL_COMPOSERS, EmailDeliveryHandler, NotificationDocument, DeliveryAttempt, OutboxEventView, bullmq

### Community 73 - "sessions.service.ts"
Cohesion: 0.21
Nodes (7): RESET_PASSWORD_TTL_MS, SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, SESSION_TOUCH_MS, VERIFY_EMAIL_TTL_MS, NewSession, toAuthenticatedUser()

### Community 77 - "member-invites.e2e-spec.ts"
Cohesion: 0.22
Nodes (4): AuthModule, invitationEmail(), ownerWithWedding(), tag()

### Community 79 - "contracts/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, noEmit, extends, include, ../../tsconfig.base.json

### Community 80 - "@testing-library/react"
Cohesion: 0.29
Nodes (4): @testing-library/react@^16.3.3, invite, post, @testing-library/react

## Knowledge Gaps
- **4 isolated node(s):** `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 530 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `auth.controller.ts`, `mongoose`, `ref_vitest`, `password-hasher.ts`, `support/worker.ts`, `api-exception.filter.ts`, `@nestjs/mongoose`, `Traced`, `outbox-relay.ts`, `member-invites.controller.ts`, `member-invites.service.ts`, `rate-limit.ts`, `tracing.ts`, `api/package.json`, `migration-runner.ts`, `weddings.service.ts`, `dependencies`, `tracing.spec.ts`, `configure-app.ts`, `wedding-access.service.ts`, `Env`, `weddings.controller.ts`, `auth-password-reset.e2e-spec.ts`, `auth.service.ts`, `email-delivery.handler.ts`, `sessions.service.ts`, `member-invites.e2e-spec.ts`, `trace.interceptor.ts`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _4 weakly-connected nodes found - possible missing edges._
- **Should `auth.controller.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05119214586255259 - nodes in this community are weakly interconnected._
- **Why does `mongoose` connect `mongoose` to `ref_vitest`, `auth.spec.ts`, `@nestjs/mongoose`, `Traced`, `outbox-relay.ts`, `member-invites.service.ts`, `tracing.ts`, `api/package.json`, `@nestjs/common`, `migration-runner.ts`, `weddings.service.ts`, `dependencies`, `tracing.spec.ts`, `wedding-access.service.ts`, `auth-password-reset.e2e-spec.ts`, `auth.service.ts`, `email-delivery.handler.ts`, `sessions.service.ts`, `member-invites.e2e-spec.ts`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `auth/server.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13666666666666666 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `auth/server.tsx`, `wedding-details-form.tsx`, `routes`, `routes.ts`, `partner-invite.tsx`, `login-form.tsx`, `hero.tsx`, `legal-document.tsx`, `dependencies`, `web/package.json`, `preview-tabs.test.tsx`, `copy.ts`, `accept-invitation.tsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `mongoose` be split into smaller, more focused modules?**
  _Cohesion score 0.1032258064516129 - nodes in this community are weakly interconnected._