# Graph Report - my-marriage  (2026-11-20)

## Corpus Check
- 471 files · ~369,949 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 2, .css 1)

## Summary
- 3427 nodes · 11024 edges · 172 communities (115 shown, 57 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 296 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1af2f0bc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.controller.ts
- accept-invitation.tsx
- guest.dto.ts
- ref_vitest
- guests.e2e-spec.ts
- auth.spec.ts
- member-invites.service.ts
- networkFailure
- expenses.service.ts
- compilerOptions
- AuthenticatedUser
- vendor-directory.tsx
- Accounts
- with
- GuestsController
- .require
- wedding-details-form.tsx
- guest-reminders.service.ts
- tasks/server.tsx
- event-form.test.tsx
- web/package.json
- guests/server.tsx
- (public)/page.tsx
- scripts
- devDependencies
- events.service.ts
- OptionalTextBlockField
- events/server.tsx
- guest-details.tsx
- pending-invitations.tsx
- catalog
- @nestjs/swagger
- healthcheck
- weddings.service.ts
- contracts/package.json
- public-website.service.ts
- request-context.ts
- guest-directory.tsx
- create-task.dto.ts
- @nestjs/common
- vendors.service.ts
- Icon
- expense-details.tsx
- wedding-details-form.test.tsx
- compilerOptions
- configure-app.ts
- guest-access.controller.ts
- guest-access.service.ts
- Public
- .update
- ComposedEmail
- nest-cli.json
- tsconfig.build.json
- website.service.ts
- IndexCheck
- app/layout.tsx
- schema.d.ts
- routes.ts
- Vendor
- next
- as-visitor.ts
- health.controller.ts
- vendor-form.test.tsx
- compilerOptions
- planning-features.tsx
- database.e2e-spec.ts
- auth.service.ts
- task-form.test.tsx
- guest-form.test.tsx
- email-delivery.handler.ts
- health.module.ts
- vendors/server.tsx
- contracts/tsconfig.json
- tracing.spec.ts
- guest-input.dto.ts
- tasks.e2e-spec.ts
- member-invites.controller.ts
- guests/input.ts
- expenses.e2e-spec.ts
- sanitize
- index.ts
- env.ts
- rsvp-page.tsx
- session-auth.guard.ts
- WebsiteService
- expenses/directory.ts
- weddings.module.ts
- scripts
- legal-document.tsx
- migrations.ts
- dependencies
- api-exception.filter.ts
- planning-features.tsx
- scripts
- accept-invitation.test.tsx
- fieldError
- ComposedEmail
- VerifiedProbeController
- guest-reminders.tsx
- @nestjs/common
- OutboxRelay
- EventActions
- pending-invitations.test.tsx
- password-hasher.ts
- expenses/server.tsx
- formatInr
- website-input.dto.ts
- event-browser.tsx
- expense-details.tsx
- event-card.tsx
- ActionTokensService
- csv.ts
- password-policy.ts
- ProbeController
- (public)/page.tsx
- @nestjs/mongoose
- .events
- guests/directory.test.ts
- vendors/input.ts
- website-templates.tsx
- api/eslint.config.mjs
- WebsiteConfig
- rsvp-form.test.tsx
- plannedWedding
- expenses/input.ts
- partner-invite.test.tsx

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 150 edges
2. `AuthenticatedUser` - 141 edges
3. `@nestjs/common` - 117 edges
4. `networkFailure()` - 87 edges
5. `toFailure()` - 86 edges
6. `react` - 82 edges
7. `@nestjs/mongoose` - 80 edges
8. `ApiDataResponse()` - 79 edges
9. `mongoose` - 78 edges
10. `Traced()` - 71 edges

## Surprising Connections (you probably didn't know these)
- `OptionalTimeField()` --indirect_call--> `isWallTime()`  [INFERRED]
  apps/api/src/modules/events/dto/fields.ts → apps/api/src/modules/events/event-time.ts
- `OptionalTimeZoneField()` --indirect_call--> `isTimeZone()`  [INFERRED]
  apps/api/src/modules/events/dto/fields.ts → apps/api/src/modules/events/event-time.ts
- `finalState()` --calls--> `waitFor()`  [EXTRACTED]
  apps/api/test/outbox.e2e-spec.ts → apps/api/test/support/worker.ts
- `SignedIn` --references--> `AuthenticatedUser`  [EXTRACTED]
  apps/api/src/modules/auth/auth.service.ts → apps/api/src/modules/auth/sessions.service.ts
- `ExpenseDrawerApi` --references--> `Expense`  [EXTRACTED]
  apps/web/src/components/expenses/expense-drawer.tsx → apps/web/src/lib/expenses/directory.ts

## Import Cycles
- None detected.

## Communities (172 total, 57 thin omitted)

### Community 0 - "auth.controller.ts"
Cohesion: 0.16
Nodes (15): CurrentPasswordField(), DisplayNameField(), EmailField(), LinkTokenField(), NewPasswordField(), trim, ForgotPasswordDto, LoginDto (+7 more)

### Community 1 - "accept-invitation.tsx"
Cohesion: 0.11
Nodes (26): ForgotPasswordPage(), metadata, AcceptInvitationPage(), metadata, LoginPage(), metadata, metadata, ResetPasswordPage() (+18 more)

### Community 2 - "guest.dto.ts"
Cohesion: 0.14
Nodes (16): EventRsvpTotalsDto, GuestDetailInvitationDto, GuestDto, GuestEmailDto, GuestInvitationDto, GuestListDto, GuestTotalsDto, ImportCommitResultDto (+8 more)

### Community 3 - "ref_vitest"
Cohesion: 0.07
Nodes (35): AuthEmailComposer, AuthModule, AuthActionToken, AuthSession, AuthSessionDocument, AuthSessionSchema, User, USER_STATUSES (+27 more)

### Community 4 - "guests.e2e-spec.ts"
Cohesion: 0.16
Nodes (18): added(), answer(), DetailBody, errorOf(), eventIn(), fieldsOf(), GuestBody, InvitationBody (+10 more)

### Community 5 - "auth.spec.ts"
Cohesion: 0.09
Nodes (47): app, document, target, children, databaseName, mailDir, migrate, mongoUri (+39 more)

### Community 6 - "member-invites.service.ts"
Cohesion: 0.10
Nodes (18): emailStatusOf(), inviteNotFound(), isExpired(), MemberInvitesService, ownerActiveLimitOnAccept(), StoredInvite, toInviteDto(), inviteEmailMismatch() (+10 more)

### Community 7 - "networkFailure"
Cohesion: 0.08
Nodes (72): goTo, post, ForgotPasswordForm(), submit(), goTo(), useFocusFirstProblem(), alertFor(), LoginForm() (+64 more)

### Community 8 - "expenses.service.ts"
Cohesion: 0.06
Nodes (52): EntryPersonDto, EXPENSE_STATUSES, ExpenseDto, ExpenseEntryDto, ExpenseEventDto, ExpenseLedgerDto, ExpenseListDto, ExpenseStatus (+44 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, emitDecoratorMetadata, experimentalDecorators, incremental, module, moduleResolution, outDir (+11 more)

### Community 10 - "AuthenticatedUser"
Cohesion: 0.13
Nodes (10): AuthenticatedUser, EventsController, ExpenseDetailDto, ExpensesController, TasksController, VendorsController, WebsiteController, InviteTokenDto (+2 more)

### Community 11 - "vendor-directory.tsx"
Cohesion: 0.11
Nodes (29): avatarOf(), AVATARS, NoResults(), NotAdded(), del, events, refresh, renderDirectory() (+21 more)

### Community 13 - "with"
Cohesion: 0.07
Nodes (33): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, API_ORIGIN, jobs (+25 more)

### Community 15 - ".require"
Cohesion: 0.09
Nodes (17): EventBrief, expenseNotFound(), GuestLinkDto, ImportPreviewResultDto, guestNotFound(), distinctIds(), folded(), GuestsService (+9 more)

### Community 16 - "wedding-details-form.tsx"
Cohesion: 0.11
Nodes (24): EventState, Mark(), STALE, STATES, WeddingEvent, Optional(), Required(), Wedding (+16 more)

### Community 17 - "guest-reminders.service.ts"
Cohesion: 0.06
Nodes (47): CurrentUser, ReminderPreviewDto, ReminderResultDto, ReminderScopeDto, ReminderSettingsDto, ReminderSkipsDto, SendReminderDto, SkippedGuestsDto (+39 more)

### Community 18 - "tasks/server.tsx"
Cohesion: 0.04
Nodes (80): metadata, TasksPage(), NoResults(), SearchParams, Stat(), TaskPanel(), TasksEmpty(), TasksLoading() (+72 more)

### Community 19 - "event-form.test.tsx"
Cohesion: 0.17
Nodes (8): haldi, onCancel, onSaved, patch, post, refresh, renderEdit(), renderForm()

### Community 20 - "web/package.json"
Cohesion: 0.08
Nodes (33): devDependencies, @axe-core/playwright@^4.14.0, eslint@catalog:, eslint-config-next@16.4.6, eslint-config-prettier@catalog:, jsdom@^31.0.1, @playwright/test@^1.65.1, tailwindcss@4.3.5 (+25 more)

### Community 21 - "guests/server.tsx"
Cohesion: 0.16
Nodes (19): GuestsPage(), metadata, AddGuestButton(), RemindGuests(), GuestsEmpty(), GuestsLoading(), GuestsSection(), GuestStats() (+11 more)

### Community 22 - "(public)/page.tsx"
Cohesion: 0.13
Nodes (17): CARD_VISUALS, PhotosSnippet(), RsvpSnippet(), STEP_SNIPPETS, container, SectionHeadingProps, WIDTHS, faq (+9 more)

### Community 23 - "scripts"
Cohesion: 0.07
Nodes (28): description, devDependencies, prettier@catalog:, engines, node, pnpm, name, packageManager (+20 more)

### Community 24 - "devDependencies"
Cohesion: 0.10
Nodes (28): devDependencies, eslint@catalog:, eslint-config-prettier@catalog:, @nestjs/cli@^12.0.13, @nestjs/schematics@^12.0.13, @nestjs/testing@^12.5.0, supertest@^7.3.2, @types/express@^5.0.6 (+20 more)

### Community 25 - "events.service.ts"
Cohesion: 0.09
Nodes (26): EventDto, EventListDto, EventLivestreamDto, EventVenueDto, eventNotFound(), googleMapsUrl(), parse(), youtubeVideoId() (+18 more)

### Community 26 - "OptionalTextBlockField"
Cohesion: 0.12
Nodes (28): CreateEventDto, EventVenueInputDto, OptionalLineField(), OptionalLinkField(), OptionalTextBlockField(), OptionalTimeField(), OptionalTimeZoneField(), UpdateEventDto (+20 more)

### Community 27 - "events/server.tsx"
Cohesion: 0.22
Nodes (16): EventsPage(), metadata, AddEventButton(), EventsEmpty(), EventsLoading(), EventsOverview(), EventsSection(), EventStats() (+8 more)

### Community 28 - "guest-details.tsx"
Cohesion: 0.15
Nodes (17): GuestDetails(), copyLink(), moment(), whatsappUrl(), GuestDrawer(), announce(), saved(), GuestDrawerApi (+9 more)

### Community 29 - "pending-invitations.tsx"
Cohesion: 0.07
Nodes (57): CreateWeddingPage(), metadata, Step(), InvitePartnerPage(), metadata, metadata, OverviewPage(), OverviewIntro() (+49 more)

### Community 30 - "catalog"
Cohesion: 0.09
Nodes (21): allowBuilds, msgpackr-extract, @scarf/scarf, eslint-plugin-import>eslint, eslint-plugin-jsx-a11y>eslint, eslint-plugin-react>eslint, openapi-typescript>typescript, catalog (+13 more)

### Community 31 - "@nestjs/swagger"
Cohesion: 0.24
Nodes (11): PublicDateRangeDto, PublicEventDto, PublicWebsiteDto, READINESS_KEYS, ReadinessKey, SlugAvailabilityDto, WebsiteContentDto, WebsiteFaqDto (+3 more)

### Community 32 - "healthcheck"
Cohesion: 0.11
Nodes (20): interval, retries, start_period, test, timeout, command, healthcheck, image (+12 more)

### Community 33 - "weddings.service.ts"
Cohesion: 0.06
Nodes (30): MemberListDto, UpdateWeddingDto, WeddingDto, ACTIVE_OWNED_INDEX, WEDDING_QUOTA_BYTES, WEDDING_STATUSES, WeddingStatus, isFallbackBase() (+22 more)

### Community 34 - "contracts/package.json"
Cohesion: 0.14
Nodes (15): description, devDependencies, openapi-typescript@^7.13.0, typescript@catalog:, exports, ./openapi.json, typescript, name (+7 more)

### Community 35 - "public-website.service.ts"
Cohesion: 0.19
Nodes (8): PublicEventListDto, PublicWebsiteService, websiteNotFound(), websiteNotReady(), contentDto(), projectWebsite(), publicEvent(), publicEvents()

### Community 36 - "request-context.ts"
Cohesion: 0.17
Nodes (8): AppLogger, JSON_LOGS, currentRequestId(), REQUEST_ID_HEADER, RequestContext, storage, WorkerModule, @nestjs/core

### Community 37 - "guest-directory.tsx"
Cohesion: 0.16
Nodes (24): Filter(), GuestDirectory(), change(), GuestRow(), NotAdded(), useGuestDrawer(), DELIVERY_STYLES, DeliveryChip() (+16 more)

### Community 38 - "create-task.dto.ts"
Cohesion: 0.08
Nodes (30): OptionalIdOrNoneField(), ListTasksQueryDto, TASK_SORTS, TASK_VIEWS, TaskSort, TaskView, EventTaskCountsDto, TaskAssigneeDto (+22 more)

### Community 39 - "@nestjs/common"
Cohesion: 0.06
Nodes (24): AppModule, EventsHttpModule, EventsModule, EventVenueSchema, WeddingEventDocument, WeddingEventSchema, ExpensesHttpModule, ExpensesModule (+16 more)

### Community 40 - "vendors.service.ts"
Cohesion: 0.17
Nodes (23): PartySizeField(), CreateGuestDto, IMPORT_MODES, UpdateGuestDto, GUEST_LIMITS, CATEGORY_EMPTY, CreateVendorDto, NAME_EMPTY (+15 more)

### Community 41 - "Icon"
Cohesion: 0.07
Nodes (53): WeddingEvent, DrawerContext, EventDrawerApi, useEventDrawer(), WeddingEvent, isListed(), STALE, TONES (+45 more)

### Community 42 - "expense-details.tsx"
Cohesion: 0.13
Nodes (11): del, detail, expense, get, onChanged, patch, person, post (+3 more)

### Community 43 - "wedding-details-form.test.tsx"
Cohesion: 0.25
Nodes (5): fill(), fillRequired(), goTo, patch, post

### Community 44 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, noFallthroughCasesInSwitch, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+3 more)

### Community 45 - "configure-app.ts"
Cohesion: 0.21
Nodes (10): API_PREFIX, configureApp(), createOpenApiDocument(), app, config, defaultHeaders(), requestContext(), ResponseEnvelopeInterceptor (+2 more)

### Community 46 - "guest-access.controller.ts"
Cohesion: 0.07
Nodes (20): ExchangeTokenDto, GUEST_RSVP_CHOICES, GuestRsvpChoice, RsvpPatchDto, RsvpDto, GuestReminderChoiceDto, GuestViewDto, GuestViewEventDto (+12 more)

### Community 47 - "guest-access.service.ts"
Cohesion: 0.06
Nodes (41): StoredInvitation, GuestInviteComposer, GuestLinks, GUEST_RATE_LIMITS, GuestReminderComposer, ACTIVE, CheckedRow, StoredGuest (+33 more)

### Community 48 - "Public"
Cohesion: 0.17
Nodes (8): AuthController, AllowUnverified(), Public(), clearSessionCookie(), cookieOptions(), readSessionCookie(), SESSION_COOKIE, setSessionCookie()

### Community 51 - "ComposedEmail"
Cohesion: 0.15
Nodes (11): passwordChangedMessage(), passwordResetMessage(), verifyEmailMessage(), ComposedEmail, EmailToCompose, BRAND, EmailLayout, renderEmail() (+3 more)

### Community 54 - "nest-cli.json"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 55 - "tsconfig.build.json"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, exclude, extends, include, ./tsconfig.json

### Community 56 - "website.service.ts"
Cohesion: 0.17
Nodes (11): ReadinessCheckDto, contentShape, WebsiteConfigDocument, WebsiteConfigSchema, WebsiteContent, WebsiteFaq, DEFAULT_TEMPLATE, WEBSITE_LIMITS (+3 more)

### Community 58 - "app/layout.tsx"
Cohesion: 0.33
Nodes (3): manrope, metadata, newsreader

### Community 59 - "schema.d.ts"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 60 - "routes.ts"
Cohesion: 0.39
Nodes (7): DashboardMockup(), Hero(), Metric(), StartPlanningLink(), hero, recentReply, publicWeddingUrl()

### Community 62 - "next"
Cohesion: 0.09
Nodes (43): nextConfig, securityHeaders, AppLayout(), metadata, AuthLayout(), metadata, metadata, VerifyEmailPage() (+35 more)

### Community 63 - "as-visitor.ts"
Cohesion: 0.22
Nodes (9): dependencies, @my-marriage/contracts@workspace:*, next@16.4.6, openapi-fetch@^0.17.0, react@19.3.1, react-dom@19.3.1, @my-marriage/contracts, openapi-fetch (+1 more)

### Community 66 - "health.controller.ts"
Cohesion: 0.21
Nodes (4): HealthController, noTerminusDocs, toDto(), HealthDto

### Community 67 - "vendor-form.test.tsx"
Cohesion: 0.17
Nodes (10): events, field(), onCancel, onSaved, patch, post, refresh, renderForm() (+2 more)

### Community 68 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowJs, incremental, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 69 - "planning-features.tsx"
Cohesion: 0.20
Nodes (13): CEREMONY_TONE, celebrations, ceremonies, Ceremony, CeremonyTone, dashboard, expenses, linkHousehold (+5 more)

### Community 70 - "database.e2e-spec.ts"
Cohesion: 0.14
Nodes (10): assertOrdered(), MigrationRecord, MigrationRunner, MIGRATIONS_COLLECTION, Migration, MIGRATIONS, createProbeIndex, probeModel (+2 more)

### Community 71 - "auth.service.ts"
Cohesion: 0.08
Nodes (14): ClientContext, invalidLink(), rejectPassword(), AuthHttpModule, RATE_LIMITS, AuthService, SignedIn, normalizeEmail() (+6 more)

### Community 72 - "task-form.test.tsx"
Cohesion: 0.12
Nodes (10): @testing-library/react@^16.3.3, tabs, choices, onCancel, onSaved, patch, post, refresh (+2 more)

### Community 74 - "email-delivery.handler.ts"
Cohesion: 0.08
Nodes (27): EMAIL_COMPOSERS, EmailComposer, EmailDeliveryHandler, EmailDeliveryModule, mailTransportProvider, FileMailTransport, MemoryMailTransport, MailTransport (+19 more)

### Community 76 - "health.module.ts"
Cohesion: 0.16
Nodes (6): @nestjs/terminus@^12.1.0, HealthModule, RedisHealthIndicator, InjectRedis(), RedisLifecycle, @nestjs/terminus

### Community 77 - "vendors/server.tsx"
Cohesion: 0.20
Nodes (15): metadata, VendorsPage(), SearchParams, Stat(), VendorsEmpty(), VendorsLoading(), VendorsSection(), VendorStats() (+7 more)

### Community 79 - "contracts/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, noEmit, extends, include, ../../tsconfig.base.json

### Community 80 - "tracing.spec.ts"
Cohesion: 0.18
Nodes (12): accessLog(), logger, finish(), formatMs(), logTrace(), renderTrace(), accounts, Decorated (+4 more)

### Community 81 - "guest-input.dto.ts"
Cohesion: 0.18
Nodes (6): CreateLinkDto, ImportCommitDto, ImportPreviewDto, ImportRowDto, InvitationSelectionDto, ProbeDto

### Community 82 - "tasks.e2e-spec.ts"
Cohesion: 0.05
Nodes (33): addManager(), create(), createdId(), EventBody, ownerWithWedding(), addManager(), ownerWithWedding(), addManager() (+25 more)

### Community 83 - "member-invites.controller.ts"
Cohesion: 0.22
Nodes (8): InvitePreviewDto, INVITE_EMAIL_STATUSES, INVITE_VIEW_STATUSES, MemberInviteDto, MyInviteDto, MEMBERSHIP_ROLES, MembershipRole, WeddingAccess

### Community 85 - "guests/input.ts"
Cohesion: 0.36
Nodes (6): GUEST_INPUT_LIMITS, GuestInput, guestInputErrors(), isEmail(), isPhone(), blank

### Community 114 - "expenses.e2e-spec.ts"
Cohesion: 0.16
Nodes (11): created(), detail(), DetailBody, EntryBody, errorOf(), ExpenseBody, fieldsOf(), get() (+3 more)

### Community 115 - "sanitize"
Cohesion: 0.16
Nodes (23): addStep(), closeStep(), describeError(), describeList(), describePositional(), describeTopLevel(), describeValue(), finishStep() (+15 more)

### Community 116 - "index.ts"
Cohesion: 0.06
Nodes (49): DashboardPage(), metadata, OpenWorkspace(), metadata, WebsitePage(), CHECK_LABELS, WebsiteLoading(), WebsiteSection() (+41 more)

### Community 117 - "env.ts"
Cohesion: 0.18
Nodes (11): reflect-metadata@^0.2.2, crossFieldProblems(), DEFAULT_TRACE_MODE, ENV_KEYS, MAIL_TRANSPORTS, MailTransportName, valid, validateEnv() (+3 more)

### Community 119 - "rsvp-page.tsx"
Cohesion: 0.11
Nodes (24): Invitation(), InvitationPage(), metadata, ReminderChoice(), Answer, answerOf(), Choice, ChoiceGroup() (+16 more)

### Community 120 - "session-auth.guard.ts"
Cohesion: 0.11
Nodes (12): ALLOW_UNVERIFIED_KEY, AuthenticatedRequest, PUBLIC_KEY, RESET_PASSWORD_TTL_MS, SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, SESSION_TOUCH_MS, VERIFY_EMAIL_TTL_MS (+4 more)

### Community 121 - "WebsiteService"
Cohesion: 0.32
Nodes (4): WebsiteDto, websiteChanged(), isDuplicateKey(), WebsiteService

### Community 122 - "expenses/directory.ts"
Cohesion: 0.13
Nodes (30): ExpenseDirectory(), change(), ExpenseRow(), Filter(), Money(), StatusPill(), STYLES, categoriesOf() (+22 more)

### Community 123 - "weddings.module.ts"
Cohesion: 0.05
Nodes (24): AccountsService, InviteEmailComposer, INVITE_STATUSES, InviteStatus, MembershipInvite, MembershipInviteDocument, MembershipInviteSchema, MEMBERSHIP_STATUSES (+16 more)

### Community 124 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:migrate, dev, dev:worker, lint, openapi:export, start (+5 more)

### Community 125 - "legal-document.tsx"
Cohesion: 0.32
Nodes (7): metadata, PrivacyPage(), metadata, TermsPage(), LegalDocument(), LegalDocumentProps, readingContainer

### Community 126 - "migrations.ts"
Cohesion: 0.15
Nodes (12): eventIndexes, expenseEvents, expenseIndexes, guestIndexes, identityIndexes, inviteIndexes, messagingIndexes, reminderIndexes (+4 more)

### Community 127 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, class-transformer@^0.5.1, class-validator@^0.15.1, ioredis@^6.0.0, mongoose@^9.12.1, @nestjs/common@^12.5.0, @nestjs/config@^12.1.1, @nestjs/core@^12.5.0 (+7 more)

### Community 128 - "api-exception.filter.ts"
Cohesion: 0.16
Nodes (12): ApiErrorDetailDto, ApiErrorDto, FieldErrorDto, ApiExceptionFilter, CODE_BY_STATUS, Dto, run(), getRequestId() (+4 more)

### Community 129 - "planning-features.tsx"
Cohesion: 0.13
Nodes (17): Amount(), AVATAR, COLUMN_DOT, ExpensesPreview(), GuestsPreview(), HouseholdRow(), RSVP_LABEL, TASK_ICON_COLOUR (+9 more)

### Community 132 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, start, test, test:browser, typecheck

### Community 133 - "accept-invitation.test.tsx"
Cohesion: 0.33
Nodes (6): answer(), get, me, post, preview, reply()

### Community 134 - "fieldError"
Cohesion: 0.30
Nodes (7): noEmailAddress(), unknownEvents(), taskNotFound(), timeWithoutDay(), unknownAssignee(), unknownEvent(), fieldError()

### Community 135 - "ComposedEmail"
Cohesion: 0.22
Nodes (17): answerNote(), C, card(), celebrationsOf(), eventLines(), eventRow(), eventTable(), guestInviteMessage() (+9 more)

### Community 137 - "guest-reminders.tsx"
Cohesion: 0.24
Nodes (8): isUpcoming(), offsetsText(), ReminderPreview, ReminderResult, ReminderSettings, SKIP_ORDER, SKIP_TEXT, SkipReason

### Community 138 - "@nestjs/common"
Cohesion: 0.06
Nodes (24): bullmq@^6.7.7, Env, REMINDER_QUEUE, ReminderScheduler, IndexCheckModule, DEFAULT_OUTBOX_RETRY, OUTBOX_HANDLERS, OUTBOX_RETRY (+16 more)

### Community 141 - "OutboxRelay"
Cohesion: 0.27
Nodes (3): OutboxEventDocument, OutboxRelay, untilAborted()

### Community 142 - "EventActions"
Cohesion: 0.19
Nodes (10): EventActions(), confirmDelete(), del, event, openMenu(), refresh, renderActions(), EventDrawer() (+2 more)

### Community 143 - "pending-invitations.test.tsx"
Cohesion: 0.29
Nodes (6): failure(), goTo, invite, other, post, reply()

### Community 144 - "password-hasher.ts"
Cohesion: 0.18
Nodes (10): invalidCredentials(), ARGON2_COST, derive(), encode(), normalize(), parse(), ParsedHash, PasswordHasher (+2 more)

### Community 145 - "expenses/server.tsx"
Cohesion: 0.15
Nodes (18): ExpensesPage(), metadata, AddExpenseButton(), ExpenseDrawer(), announce(), saved(), ExpenseDrawerApi, ExpenseDrawerContext (+10 more)

### Community 146 - "formatInr"
Cohesion: 0.15
Nodes (23): AdjustAmountDialog(), submit(), AmountField(), Context(), Done, Kind, KINDS, LedgerDialog() (+15 more)

### Community 147 - "website-input.dto.ts"
Cohesion: 0.15
Nodes (7): blockText, lineText, PublishWebsiteDto, UpdateWebsiteDto, WebsiteContentInputDto, WebsiteFaqInputDto, VenueDto

### Community 148 - "event-browser.tsx"
Cohesion: 0.23
Nodes (8): EventBrowser(), EventItem, matches(), Tab, TaskCounts, items, WeddingEvent, isUpcoming()

### Community 149 - "expense-details.tsx"
Cohesion: 0.30
Nodes (9): ENTRY_ICONS, entryAmount(), entryCaption(), ExpenseDetails(), LinkChip(), entryName(), ReverseEntryDialog(), submit() (+1 more)

### Community 150 - "event-card.tsx"
Cohesion: 0.18
Nodes (16): EventCard(), STATES, TaskCounts, TaskTiles(), base, TONES, WeddingEvent, missingDetails() (+8 more)

### Community 151 - "ActionTokensService"
Cohesion: 0.19
Nodes (7): ActionTokensService, AUTH_TOKEN_PURPOSES, AuthActionTokenDocument, AuthActionTokenSchema, AuthTokenPurpose, randomToken(), sha256()

### Community 152 - "csv.ts"
Cohesion: 0.28
Nodes (11): ExportGuests(), download(), COLUMNS, csvCell(), downloadCsv(), ImportRow, parseCsv(), readGuestRows() (+3 more)

### Community 153 - "password-policy.ts"
Cohesion: 0.24
Nodes (9): COMMON_BASE_WORDS, COMMON_PASSWORDS, isCommon(), LEET, lettersOf(), PASSWORD_MAX_LENGTH, PASSWORD_MESSAGES, PASSWORD_MIN_LENGTH (+1 more)

### Community 155 - "(public)/page.tsx"
Cohesion: 0.40
Nodes (10): HomePage(), metadata, Celebrations(), Closing(), GuestExperience(), HowItWorks(), PlanningFeatures(), Trust() (+2 more)

### Community 156 - "@nestjs/mongoose"
Cohesion: 0.11
Nodes (15): FINAL_NOTIFICATION_STATES, Notification, NOTIFICATION_KINDS, NotificationKind, NotificationSchema, EMAIL_REQUESTED, EmailRequest, OUTBOX_STATES (+7 more)

### Community 158 - "guests/directory.test.ts"
Cohesion: 0.18
Nodes (7): alok, kavita, titles, GuestInvitation, NO_FILTERS, kavya, rajesh

### Community 160 - "vendors/input.ts"
Cohesion: 0.42
Nodes (7): isEmail(), isPhone(), empty, tooLong(), VENDOR_INPUT_LIMITS, VendorInput, vendorInputErrors()

### Community 161 - "website-templates.tsx"
Cohesion: 0.33
Nodes (5): LOOK, TemplateId, TemplatePreview(), weddingWebsites, couple

### Community 162 - "api/eslint.config.mjs"
Cohesion: 0.29
Nodes (4): @eslint/js@catalog:, typescript-eslint@catalog:, @eslint/js, typescript-eslint

### Community 164 - "rsvp-form.test.tsx"
Cohesion: 0.25
Nodes (4): patch, refresh, view, GuestView

### Community 165 - "plannedWedding"
Cohesion: 0.40
Nodes (6): answerHaldi(), asGuest(), ok(), plannedWedding(), send(), tokenOf()

### Community 166 - "expenses/input.ts"
Cohesion: 0.47
Nodes (4): EXPENSE_INPUT_LIMITS, ExpenseInput, expenseInputErrors(), tooLong()

## Knowledge Gaps
- **5 isolated node(s):** `RFC-4180`, `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1050 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `auth.controller.ts`, `api-exception.filter.ts`, `ref_vitest`, `fieldError`, `member-invites.service.ts`, `expenses.service.ts`, `.require`, `password-hasher.ts`, `guest-reminders.service.ts`, `ActionTokensService`, `devDependencies`, `events.service.ts`, `OptionalTextBlockField`, `@nestjs/mongoose`, `@nestjs/swagger`, `weddings.service.ts`, `public-website.service.ts`, `request-context.ts`, `create-task.dto.ts`, `@nestjs/common`, `vendors.service.ts`, `guest-access.controller.ts`, `guest-access.service.ts`, `website.service.ts`, `health.controller.ts`, `database.e2e-spec.ts`, `auth.service.ts`, `email-delivery.handler.ts`, `health.module.ts`, `tracing.spec.ts`, `member-invites.controller.ts`, `sanitize`, `session-auth.guard.ts`, `weddings.module.ts`, `dependencies`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `./tsconfig.json`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible missing edges._
- **Should `accept-invitation.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10634920634920635 - nodes in this community are weakly interconnected._
- **Why does `AuthenticatedUser` connect `AuthenticatedUser` to `auth.controller.ts`, `fieldError`, `member-invites.service.ts`, `expenses.service.ts`, `GuestsController`, `.require`, `guest-reminders.service.ts`, `events.service.ts`, `@nestjs/swagger`, `weddings.service.ts`, `public-website.service.ts`, `create-task.dto.ts`, `vendors.service.ts`, `guest-access.service.ts`, `Public`, `.update`, `website.service.ts`, `auth.service.ts`, `member-invites.controller.ts`, `session-auth.guard.ts`, `WebsiteService`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `guest.dto.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13725490196078433 - nodes in this community are weakly interconnected._
- **Why does `mongoose` connect `guest-access.service.ts` to `ref_vitest`, `guests.e2e-spec.ts`, `auth.spec.ts`, `member-invites.service.ts`, `expenses.service.ts`, `@nestjs/common`, `guest-reminders.service.ts`, `ActionTokensService`, `devDependencies`, `events.service.ts`, `@nestjs/mongoose`, `weddings.service.ts`, `public-website.service.ts`, `create-task.dto.ts`, `@nestjs/common`, `vendors.service.ts`, `website.service.ts`, `database.e2e-spec.ts`, `auth.service.ts`, `email-delivery.handler.ts`, `tracing.spec.ts`, `tasks.e2e-spec.ts`, `expenses.e2e-spec.ts`, `sanitize`, `session-auth.guard.ts`, `weddings.module.ts`, `migrations.ts`, `dependencies`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `ref_vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.06511761331038439 - nodes in this community are weakly interconnected._