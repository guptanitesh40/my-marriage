# Graph Report - my-marriage  (2026-11-19)

## Corpus Check
- 249 files · ~134,771 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 2, .css 1)

## Summary
- 1608 nodes · 4433 edges · 79 communities (67 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `78ed934c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.controller.ts
- react
- mongoose
- member-invites.e2e-spec.ts
- password-hasher.ts
- auth.spec.ts
- Traced
- login-form.tsx
- partner-invite.tsx
- compilerOptions
- ApiDataResponse
- api-exception.filter.ts
- @nestjs/mongoose
- with
- Traced
- weddings.module.ts
- outbox-relay.ts
- member-invites.controller.ts
- member-invites.service.ts
- planning-features.tsx
- web/package.json
- member-invites.service.ts
- tracing.ts
- scripts
- api/package.json
- @nestjs/common
- text-field.tsx
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
- .login
- routes.ts
- scripts
- hero.tsx
- health.controller.ts
- legal-document.tsx
- compilerOptions
- Env
- env.ts
- weddings.controller.ts
- password-policy.ts
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
- (onboarding)/layout.tsx
- Accounts
- auth.service.ts
- compilerOptions
- sha256
- accept-invitation.tsx
- .create
- VenueDto
- sessions.service.ts
- RateLimiter
- ProbeController
- contracts/tsconfig.json
- @testing-library/react
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
- `configureApp()` --indirect_call--> `accessLog()`  [INFERRED]
  apps/api/src/configure-app.ts → apps/api/src/platform/http-middleware.ts
- `SignedIn` --references--> `AuthenticatedUser`  [EXTRACTED]
  apps/api/src/modules/auth/auth.service.ts → apps/api/src/modules/auth/sessions.service.ts
- `signOut()` --calls--> `goTo()`  [EXTRACTED]
  apps/web/src/components/auth/sign-out-button.tsx → apps/web/src/components/auth/hooks.ts
- `Env` --references--> `TraceMode`  [EXTRACTED]
  apps/api/src/config/env.ts → apps/api/src/platform/tracing.ts
- `configureApp()` --indirect_call--> `defaultHeaders()`  [INFERRED]
  apps/api/src/configure-app.ts → apps/api/src/platform/http-middleware.ts

## Import Cycles
- None detected.

## Communities (79 total, 12 thin omitted)

### Community 0 - "auth.controller.ts"
Cohesion: 0.11
Nodes (23): ALLOW_UNVERIFIED_KEY, AuthenticatedRequest, PUBLIC_KEY, CurrentPasswordField(), DisplayNameField(), EmailField(), LinkTokenField(), NewPasswordField() (+15 more)

### Community 1 - "react"
Cohesion: 0.19
Nodes (17): metadata, VerifyEmailPage(), useLinkToken(), LinkProblem(), InboxPanel(), hasKeptInvitation(), nextStep(), Outcome (+9 more)

### Community 2 - "mongoose"
Cohesion: 0.13
Nodes (8): AUTH_TOKEN_PURPOSES, AuthActionToken, AuthActionTokenSchema, AuthSession, AuthSessionDocument, AuthSessionSchema, UserSchema, randomToken()

### Community 3 - "member-invites.e2e-spec.ts"
Cohesion: 0.08
Nodes (31): AuthModule, User, USER_STATUSES, UserDocument, UserStatus, accountWithResetLink(), emailTo(), forgot() (+23 more)

### Community 4 - "password-hasher.ts"
Cohesion: 0.18
Nodes (10): invalidCredentials(), ARGON2_COST, derive(), encode(), normalize(), parse(), ParsedHash, PasswordHasher (+2 more)

### Community 5 - "auth.spec.ts"
Cohesion: 0.08
Nodes (37): app, document, target, children, databaseName, mailDir, migrate, mongoUri (+29 more)

### Community 6 - "Traced"
Cohesion: 0.09
Nodes (23): EmailDeliveryHandler, EmailDeliveryModule, mailTransportProvider, FileMailTransport, MemoryMailTransport, MailTransport, OutgoingEmail, PermanentMailError (+15 more)

### Community 7 - "login-form.tsx"
Cohesion: 0.18
Nodes (31): goTo, post, ForgotPasswordForm(), submit(), goTo(), useFocusFirstProblem(), alertFor(), LoginForm() (+23 more)

### Community 8 - "partner-invite.tsx"
Cohesion: 0.09
Nodes (38): CreateWeddingPage(), metadata, InvitePartnerPage(), metadata, AccountHome, accountHome, currentUserOrNull, ForVisitor() (+30 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, emitDecoratorMetadata, experimentalDecorators, incremental, module, moduleResolution, outDir (+11 more)

### Community 10 - "ApiDataResponse"
Cohesion: 0.20
Nodes (4): CurrentUser, InviteTokenDto, MemberInvitesController, ApiDataResponse()

### Community 11 - "api-exception.filter.ts"
Cohesion: 0.10
Nodes (21): API_PREFIX, configureApp(), createOpenApiDocument(), app, config, ApiErrorDetailDto, ApiErrorDto, FieldErrorDto (+13 more)

### Community 12 - "@nestjs/mongoose"
Cohesion: 0.08
Nodes (25): EMAIL_COMPOSERS, EmailComposer, FINAL_NOTIFICATION_STATES, Notification, NOTIFICATION_KINDS, NOTIFICATION_STATES, NotificationDocument, NotificationKind (+17 more)

### Community 13 - "with"
Cohesion: 0.07
Nodes (33): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, API_ORIGIN, jobs (+25 more)

### Community 14 - "Traced"
Cohesion: 0.11
Nodes (15): AccountsService, AuthEmailComposer, passwordChangedMessage(), passwordResetMessage(), verifyEmailMessage(), ComposedEmail, EmailToCompose, BRAND (+7 more)

### Community 15 - "weddings.module.ts"
Cohesion: 0.08
Nodes (18): INVITE_STATUSES, InviteStatus, MembershipInviteDocument, MembershipInviteSchema, WeddingMembership, WeddingMembershipSchema, Wedding, WEDDING_QUOTA_BYTES (+10 more)

### Community 16 - "outbox-relay.ts"
Cohesion: 0.12
Nodes (12): OutboxEventDocument, DEFAULT_OUTBOX_RETRY, OUTBOX_HANDLERS, OUTBOX_RETRY, OutboxHandler, OutboxRetryOptions, OUTBOX_QUEUE, OutboxJobData (+4 more)

### Community 17 - "member-invites.controller.ts"
Cohesion: 0.16
Nodes (12): CreateMemberInviteDto, INVITABLE_ROLES, InvitePreviewDto, INVITE_EMAIL_STATUSES, INVITE_VIEW_STATUSES, MemberInviteDto, MEMBERSHIP_ROLES, MEMBERSHIP_STATUSES (+4 more)

### Community 18 - "member-invites.service.ts"
Cohesion: 0.22
Nodes (9): AuthenticatedUser, isExpired(), MemberInvitesService, ownerActiveLimitOnAccept(), toInviteDto(), inviteEmailMismatch(), inviteInvalid(), ownerLimit() (+1 more)

### Community 19 - "planning-features.tsx"
Cohesion: 0.12
Nodes (25): Amount(), AVATAR, COLUMN_DOT, ExpensesPreview(), GuestsPreview(), HouseholdRow(), RSVP_LABEL, TASK_ICON_COLOUR (+17 more)

### Community 20 - "web/package.json"
Cohesion: 0.09
Nodes (31): devDependencies, @axe-core/playwright@^4.14.0, eslint@catalog:, eslint-config-next@16.4.6, eslint-config-prettier@catalog:, jsdom@^31.0.1, @playwright/test@^1.65.1, tailwindcss@4.3.5 (+23 more)

### Community 21 - "member-invites.service.ts"
Cohesion: 0.14
Nodes (14): NotificationState, emailStatusOf(), inviteNotFound(), StoredInvite, ACTIVE_OWNED_INDEX, INVITE_TTL_MS, MAX_OWNERS, WEDDING_RATE_LIMITS (+6 more)

### Community 22 - "tracing.ts"
Cohesion: 0.13
Nodes (28): JSON_LOGS, TraceInterceptor, addStep(), closeStep(), configureTracing(), currentTrace(), describeError(), describeList() (+20 more)

### Community 23 - "scripts"
Cohesion: 0.07
Nodes (28): description, devDependencies, prettier@catalog:, engines, node, pnpm, name, packageManager (+20 more)

### Community 24 - "api/package.json"
Cohesion: 0.10
Nodes (27): devDependencies, eslint@catalog:, eslint-config-prettier@catalog:, @nestjs/cli@^12.0.13, @nestjs/schematics@^12.0.13, @nestjs/testing@^12.5.0, supertest@^7.3.2, @types/express@^5.0.6 (+19 more)

### Community 25 - "@nestjs/common"
Cohesion: 0.08
Nodes (21): AppModule, HealthModule, WeddingsHttpModule, WeddingsModule, IndexCheckModule, AppLogger, PlatformModule, RateLimitedException (+13 more)

### Community 26 - "text-field.tsx"
Cohesion: 0.36
Nodes (8): PasswordFieldProps, SelectField(), SelectFieldProps, describedBy(), FieldFrame(), FieldProps, inputClass, TextFieldProps

### Community 27 - "migration-runner.ts"
Cohesion: 0.11
Nodes (15): assertOrdered(), MigrationRecord, MigrationRunner, MIGRATIONS_COLLECTION, identityIndexes, inviteIndexes, messagingIndexes, Migration (+7 more)

### Community 28 - "copy.ts"
Cohesion: 0.15
Nodes (16): STEP_SNIPPETS, LOOK, TemplateId, IconName, IconProps, ICONS, faq, finalCta (+8 more)

### Community 29 - "Icon"
Cohesion: 0.18
Nodes (19): HomePage(), metadata, Celebrations(), Closing(), CARD_VISUALS, GuestExperience(), PhotosSnippet(), RsvpSnippet() (+11 more)

### Community 30 - "catalog"
Cohesion: 0.09
Nodes (21): allowBuilds, msgpackr-extract, @scarf/scarf, eslint-plugin-import>eslint, eslint-plugin-jsx-a11y>eslint, eslint-plugin-react>eslint, openapi-typescript>typescript, catalog (+13 more)

### Community 31 - "weddings.service.ts"
Cohesion: 0.29
Nodes (11): isFallbackBase(), SLUG_PATTERN, slugBase(), toWords(), withSuffix(), fieldError(), ownerActiveLimit(), todayInIndia() (+3 more)

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
Cohesion: 0.12
Nodes (17): dependencies, bullmq@^6.7.7, ioredis@^6.0.0, mongoose@^9.12.1, @nestjs/common@^12.5.0, @nestjs/config@^12.1.1, @nestjs/core@^12.5.0, @nestjs/mongoose@^12.0.1 (+9 more)

### Community 36 - "tracing.spec.ts"
Cohesion: 0.16
Nodes (13): accessLog(), logger, finish(), formatMs(), logTrace(), renderTrace(), accounts, Decorated (+5 more)

### Community 37 - "proxy.ts"
Cohesion: 0.19
Nodes (11): apiClientAsVisitor(), FORWARDED_HEADERS, safeNextPath(), SESSION_COOKIE, config, proxy(), Session, sessionOf() (+3 more)

### Community 38 - ".login"
Cohesion: 0.24
Nodes (3): AuthController, AllowUnverified(), Public()

### Community 39 - "routes.ts"
Cohesion: 0.17
Nodes (18): AppLayout(), metadata, AuthLayout(), metadata, PublicLayout(), renderHome(), CopyrightYear(), HeaderAccount() (+10 more)

### Community 40 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:migrate, dev, dev:worker, lint, openapi:export, start (+5 more)

### Community 41 - "hero.tsx"
Cohesion: 0.24
Nodes (10): CEREMONY_TONE, DashboardMockup(), Hero(), Metric(), StartPlanningLink(), celebrations, CeremonyTone, recentReply (+2 more)

### Community 42 - "health.controller.ts"
Cohesion: 0.16
Nodes (5): HealthController, noTerminusDocs, toDto(), HealthDto, RedisHealthIndicator

### Community 43 - "legal-document.tsx"
Cohesion: 0.32
Nodes (7): metadata, PrivacyPage(), metadata, TermsPage(), LegalDocument(), LegalDocumentProps, readingContainer

### Community 44 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, noFallthroughCasesInSwitch, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+3 more)

### Community 46 - "env.ts"
Cohesion: 0.14
Nodes (14): class-transformer@^0.5.1, class-validator@^0.15.1, reflect-metadata@^0.2.2, crossFieldProblems(), DEFAULT_TRACE_MODE, ENV_KEYS, MAIL_TRANSPORTS, MailTransportName (+6 more)

### Community 47 - "weddings.controller.ts"
Cohesion: 0.44
Nodes (5): CreateWeddingDto, normalizeText, OptionalDateField(), TextLineField(), UpdateWeddingDto

### Community 48 - "password-policy.ts"
Cohesion: 0.24
Nodes (9): COMMON_BASE_WORDS, COMMON_PASSWORDS, isCommon(), LEET, lettersOf(), PASSWORD_MAX_LENGTH, PASSWORD_MESSAGES, PASSWORD_MIN_LENGTH (+1 more)

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

### Community 62 - "(onboarding)/layout.tsx"
Cohesion: 0.39
Nodes (6): metadata, OnboardingLayout(), SignOutButton(), signOut(), AccountChip(), LogoMark()

### Community 67 - "auth.service.ts"
Cohesion: 0.10
Nodes (13): ClientContext, invalidLink(), rejectPassword(), AuthHttpModule, RATE_LIMITS, AuthService, SignedIn, normalizeEmail() (+5 more)

### Community 68 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowJs, incremental, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 69 - "sha256"
Cohesion: 0.12
Nodes (6): ActionTokensService, PasswordResetService, AuthActionTokenDocument, AuthTokenPurpose, SessionsService, sha256()

### Community 70 - "accept-invitation.tsx"
Cohesion: 0.11
Nodes (28): nextConfig, securityHeaders, DashboardPage(), metadata, Welcome(), ForgotPasswordPage(), metadata, AcceptInvitationPage() (+20 more)

### Community 71 - ".create"
Cohesion: 0.11
Nodes (4): WeddingDto, WeddingStatus, WeddingsController, WeddingsService

### Community 73 - "sessions.service.ts"
Cohesion: 0.27
Nodes (6): RESET_PASSWORD_TTL_MS, SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, SESSION_TOUCH_MS, VERIFY_EMAIL_TTL_MS, NewSession

### Community 79 - "contracts/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, noEmit, extends, include, ../../tsconfig.base.json

### Community 80 - "@testing-library/react"
Cohesion: 0.29
Nodes (4): @testing-library/react@^16.3.3, invite, post, @testing-library/react

## Knowledge Gaps
- **4 isolated node(s):** `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 533 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `auth.controller.ts`, `mongoose`, `member-invites.e2e-spec.ts`, `password-hasher.ts`, `Traced`, `api-exception.filter.ts`, `@nestjs/mongoose`, `Traced`, `weddings.module.ts`, `outbox-relay.ts`, `member-invites.controller.ts`, `member-invites.service.ts`, `tracing.ts`, `api/package.json`, `migration-runner.ts`, `weddings.service.ts`, `dependencies`, `tracing.spec.ts`, `health.controller.ts`, `weddings.controller.ts`, `auth.service.ts`, `.create`, `sessions.service.ts`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _4 weakly-connected nodes found - possible missing edges._
- **Should `auth.controller.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10801393728222997 - nodes in this community are weakly interconnected._
- **Why does `mongoose` connect `@nestjs/mongoose` to `mongoose`, `auth.service.ts`, `dependencies`, `member-invites.e2e-spec.ts`, `tracing.spec.ts`, `auth.spec.ts`, `sessions.service.ts`, `Traced`, `weddings.module.ts`, `outbox-relay.ts`, `member-invites.controller.ts`, `member-invites.service.ts`, `tracing.ts`, `api/package.json`, `@nestjs/common`, `migration-runner.ts`, `weddings.service.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `mongoose` be split into smaller, more focused modules?**
  _Cohesion score 0.12648221343873517 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `wedding-details-form.tsx`, `accept-invitation.tsx`, `routes.ts`, `partner-invite.tsx`, `login-form.tsx`, `hero.tsx`, `legal-document.tsx`, `dependencies`, `web/package.json`, `preview-tabs.test.tsx`, `text-field.tsx`, `copy.ts`, `Icon`, `(onboarding)/layout.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `member-invites.e2e-spec.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0814111261872456 - nodes in this community are weakly interconnected._