# Graph Report - my-marriage  (2026-11-25)

## Corpus Check
- 639 files · ~540,842 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 2, .css 1)

## Summary
- 5063 nodes · 16785 edges · 196 communities (127 shown, 69 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 558 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9cbb652c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- tasks/server.tsx
- signupVerified
- builder.tsx
- ref_vitest
- guests.e2e-spec.ts
- journeys.ts
- website-projection.ts
- vendors.service.ts
- Traced
- compilerOptions
- ExpensesService
- vendor-directory.tsx
- networkFailure
- with
- AuthenticatedUser
- sections.tsx
- app/layout.tsx
- RsvpPatchDto
- expense-drawer.tsx
- expenses/server.tsx
- web/package.json
- create-task.dto.ts
- auth.controller.ts
- scripts
- support/worker.ts
- MemberInvitesController
- events/dto/fields.ts
- photos/server.tsx
- member-invites.service.ts
- AuthenticatedUser
- catalog
- event-time.ts
- healthcheck
- public-website.dto.ts
- contracts/package.json
- auth.service.ts
- expenses.service.ts
- guest-directory.tsx
- .create
- proxy.ts
- member-invites.e2e-spec.ts
- dashboard.service.ts
- expenses.controller.ts
- wedding-details-form.test.tsx
- compilerOptions
- dashboard.e2e-spec.ts
- .answer
- MediaExportsService
- auth/dto/fields.ts
- themed-site.tsx
- uploads.service.ts
- albums.controller.ts
- nest-cli.json
- tsconfig.build.json
- dashboard/server.tsx
- IndexCheck
- guest-access.controller.ts
- schema.d.ts
- photo-uploads.e2e-spec.ts
- VendorsService
- guest-form.tsx
- @nestjs/common
- album.schema.ts
- health.controller.ts
- planning-features.tsx
- compilerOptions
- sanitize
- media-export.schema.ts
- api/package.json
- guest-upload.tsx
- expense-files.service.ts
- Icon
- copy.ts
- migrations.ts
- contracts/tsconfig.json
- upload-links.e2e-spec.ts
- GuestsService
- (public)/page.tsx
- PhotosController
- env.ts
- pending-invitations.tsx
- .complete
- reminder-scheduler.ts
- public-gallery.controller.ts
- outbox-relay.ts
- .update
- expenses.e2e-spec.ts
- event-form.test.tsx
- index.ts
- .update
- .initiate
- LocalObjectStorage
- tasks.e2e-spec.ts
- guest-emails.ts
- .require
- Env
- GuestRemindersService
- routes.ts
- guest-policy.ts
- UploadAccessService
- CreateUploadDto
- main.ts
- .create
- upload-link.dto.ts
- ServerError
- Public
- configure-app.ts
- hero.tsx
- upload-links.controller.ts
- vercel.json
- PublicGalleryController
- workspacePath
- ApiDataResponse
- ledger-dialogs.tsx
- scripts
- @testing-library/react
- dependencies
- accept-invitation.test.tsx
- Header
- website-policy.ts
- upload-access.controller.ts
- CurrentUser
- rsvp-form.test.tsx
- VerifiedProbeController
- password-policy.ts
- website-input.dto.ts
- currentRequestId
- pending-invitations.test.tsx
- task-form.test.tsx
- vendors/input.ts
- scripts
- tasks/format.ts
- .receive
- .me
- event-form.tsx
- reminder-schedule.ts
- PublicWebsiteService
- preview-tabs.test.tsx
- GuestAccessService
- Accounts
- event-actions.test.tsx
- guests/input.ts
- AuthActionToken
- UpdateWeddingDto
- tasks/input.ts
- website-templates.tsx
- InjectRedis
- auth-email.composer.ts
- guest-form.test.tsx
- api/vercel.json
- web/vercel.json
- legal-document.tsx
- AuditEvent
- ProbeDto
- VenueDto

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 279 edges
2. `AuthenticatedUser` - 244 edges
3. `@nestjs/common` - 156 edges
4. `networkFailure()` - 136 edges
5. `toFailure()` - 134 edges
6. `ApiDataResponse()` - 127 edges
7. `react` - 124 edges
8. `CurrentUser` - 119 edges
9. `@nestjs/mongoose` - 116 edges
10. `Traced()` - 114 edges

## Surprising Connections (you probably didn't know these)
- `member()` --calls--> `signupVerified()`  [EXTRACTED]
  apps/api/test/dashboard.e2e-spec.ts → apps/api/test/support/auth.ts
- `addManager()` --calls--> `signupVerified()`  [EXTRACTED]
  apps/api/test/expenses.e2e-spec.ts → apps/api/test/support/auth.ts
- `ownerWithWedding()` --calls--> `signupVerified()`  [EXTRACTED]
  apps/api/test/expenses.e2e-spec.ts → apps/api/test/support/auth.ts
- `ownerWithAlbum()` --calls--> `signupVerified()`  [EXTRACTED]
  apps/api/test/photo-uploads.e2e-spec.ts → apps/api/test/support/auth.ts
- `addManager()` --calls--> `signupVerified()`  [EXTRACTED]
  apps/api/test/guests.e2e-spec.ts → apps/api/test/support/auth.ts

## Import Cycles
- None detected.

## Communities (196 total, 69 thin omitted)

### Community 0 - "tasks/server.tsx"
Cohesion: 0.09
Nodes (39): metadata, TasksPage(), NoResults(), SearchParams, Stat(), TaskPanel(), TasksEmpty(), TasksLoading() (+31 more)

### Community 1 - "signupVerified"
Cohesion: 0.05
Nodes (27): WeddingMembership, addManager(), AlbumBody, ownerWithWedding(), addManager(), create(), createdId(), EventBody (+19 more)

### Community 2 - "builder.tsx"
Cohesion: 0.07
Nodes (49): metadata, WebsitePreviewPage(), metadata, WebsitePage(), cinzel, jakarta, mono, rsvpFonts (+41 more)

### Community 3 - "ref_vitest"
Cohesion: 0.07
Nodes (41): accountWithResetLink(), emailTo(), forgot(), emailsTo(), addPhoto(), dataOf(), PublicAlbum, publishedWedding() (+33 more)

### Community 4 - "guests.e2e-spec.ts"
Cohesion: 0.15
Nodes (19): added(), addManager(), answer(), DetailBody, errorOf(), eventIn(), fieldsOf(), GuestBody (+11 more)

### Community 5 - "journeys.ts"
Cohesion: 0.08
Nodes (56): app, document, target, children, databaseName, mailDir, migrate, mongoUri (+48 more)

### Community 6 - "website-projection.ts"
Cohesion: 0.20
Nodes (11): PublicVenueDto, READINESS_KEYS, ReadinessCheckDto, ReadinessKey, WebsiteContentDto, WebsiteReadinessDto, contentDto(), projectWebsite() (+3 more)

### Community 7 - "vendors.service.ts"
Cohesion: 0.09
Nodes (35): PartySizeField(), GUEST_RSVP_CHOICES, GuestRsvpChoice, CreateGuestDto, IMPORT_MODES, UpdateGuestDto, GUEST_LIMITS, CreateAlbumDto (+27 more)

### Community 8 - "Traced"
Cohesion: 0.04
Nodes (75): NewSession, DASHBOARD_LIMITS, EventBrief, EventsService, NOT_DELETED, StoredEvent, StoredInvitation, GuestLinks (+67 more)

### Community 9 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, declaration, emitDecoratorMetadata, experimentalDecorators, incremental, lib, module, moduleResolution (+13 more)

### Community 10 - "ExpensesService"
Cohesion: 0.13
Nodes (14): todayIn(), ExpenseDetailDto, ExpenseDto, ExpenseLedgerDto, ExpenseListDto, ExpenseTotalsDto, alreadyReversed(), expenseNotFound() (+6 more)

### Community 11 - "vendor-directory.tsx"
Cohesion: 0.05
Nodes (56): EventCard(), STATES, TaskCounts, TaskTiles(), base, TONES, WeddingEvent, avatarOf() (+48 more)

### Community 12 - "networkFailure"
Cohesion: 0.05
Nodes (114): ForgotPasswordPage(), metadata, AcceptInvitationPage(), metadata, LoginPage(), metadata, metadata, ResetPasswordPage() (+106 more)

### Community 13 - "with"
Cohesion: 0.07
Nodes (33): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, API_ORIGIN, jobs (+25 more)

### Community 14 - "AuthenticatedUser"
Cohesion: 0.18
Nodes (4): GuestDetailDto, ReminderPreviewDto, ReminderResultDto, GuestsController

### Community 15 - "sections.tsx"
Cohesion: 0.14
Nodes (29): CARD, Ceremonies, CeremonyRow(), ExpenseFigures(), Expenses, Guests, Hero(), PaidBar() (+21 more)

### Community 16 - "app/layout.tsx"
Cohesion: 0.22
Nodes (10): metadata, RootLayout(), destinationOf(), NavigationProgress(), clearTimers(), onClick(), start(), Phase (+2 more)

### Community 18 - "expense-drawer.tsx"
Cohesion: 0.05
Nodes (50): DrawerContext, EventDrawer(), close(), saved(), EventDrawerApi, WeddingEvent, ExpenseDrawer(), announce() (+42 more)

### Community 19 - "expenses/server.tsx"
Cohesion: 0.07
Nodes (46): ExpenseDirectory(), change(), ExpenseRow(), Filter(), Money(), ExpenseDrawerApi, useExpenseDrawer(), del (+38 more)

### Community 20 - "web/package.json"
Cohesion: 0.08
Nodes (35): devDependencies, @axe-core/playwright@^4.14.0, eslint@catalog:, eslint-config-next@16.4.6, eslint-config-prettier@catalog:, jsdom@^31.0.1, @playwright/test@^1.65.1, tailwindcss@4.3.5 (+27 more)

### Community 21 - "create-task.dto.ts"
Cohesion: 0.07
Nodes (41): CreateTaskDto, PRIORITY_MESSAGE, STATE_MESSAGE, OptionalChoiceField(), OptionalIdOrNoneField(), ListTasksQueryDto, TASK_SORTS, TASK_VIEWS (+33 more)

### Community 22 - "auth.controller.ts"
Cohesion: 0.21
Nodes (8): ALLOW_UNVERIFIED_KEY, PUBLIC_KEY, SessionAuthGuard, clearSessionCookie(), cookieOptions(), readSessionCookie(), SESSION_COOKIE, setSessionCookie()

### Community 23 - "scripts"
Cohesion: 0.07
Nodes (28): description, devDependencies, prettier@catalog:, engines, node, pnpm, name, packageManager (+20 more)

### Community 24 - "support/worker.ts"
Cohesion: 0.06
Nodes (36): EMAIL_COMPOSERS, EmailDeliveryHandler, EmailDeliveryModule, mailTransportProvider, FileMailTransport, MemoryMailTransport, MailTransport, OutgoingEmail (+28 more)

### Community 26 - "events/dto/fields.ts"
Cohesion: 0.14
Nodes (14): CreateEventDto, EventVenueInputDto, OptionalLineField(), OptionalLinkField(), OptionalTimeField(), OptionalTimeZoneField(), UpdateEventDto, googleMapsUrl() (+6 more)

### Community 27 - "photos/server.tsx"
Cohesion: 0.07
Nodes (54): AlbumPage(), metadata, metadata, PhotosPage(), AlbumCard(), AlbumGrid(), choose(), AlbumNameDialog() (+46 more)

### Community 28 - "member-invites.service.ts"
Cohesion: 0.03
Nodes (81): AccountsService, TeamService, CreateMemberInviteDto, INVITABLE_ROLES, InvitePreviewDto, MemberListDto, INVITE_EMAIL_STATUSES, INVITE_VIEW_STATUSES (+73 more)

### Community 29 - "AuthenticatedUser"
Cohesion: 0.19
Nodes (4): SignedIn, AuthenticatedUser, WeddingSettingsDto, WeddingsController

### Community 30 - "catalog"
Cohesion: 0.09
Nodes (22): allowBuilds, msgpackr-extract, @scarf/scarf, sharp, eslint-plugin-import>eslint, eslint-plugin-jsx-a11y>eslint, eslint-plugin-react>eslint, openapi-typescript>typescript (+14 more)

### Community 31 - "event-time.ts"
Cohesion: 0.10
Nodes (19): EventDto, EventListDto, EventLivestreamDto, EventVenueDto, DEFAULT_EVENT_TIME_ZONE, isTimeZone(), isWallTime(), offsetAt() (+11 more)

### Community 32 - "healthcheck"
Cohesion: 0.11
Nodes (20): interval, retries, start_period, test, timeout, command, healthcheck, image (+12 more)

### Community 33 - "public-website.dto.ts"
Cohesion: 0.43
Nodes (5): PublicDateRangeDto, PublicEventDto, PublicEventListDto, PublicWebsiteDto, WebsiteFaqDto

### Community 34 - "contracts/package.json"
Cohesion: 0.14
Nodes (15): description, devDependencies, openapi-typescript@^7.13.0, typescript@catalog:, exports, ./openapi.json, typescript, name (+7 more)

### Community 35 - "auth.service.ts"
Cohesion: 0.04
Nodes (42): ActionTokensService, ClientContext, invalidLink(), rejectPassword(), AuthHttpModule, RATE_LIMITS, RESET_PASSWORD_TTL_MS, SESSION_ABSOLUTE_MS (+34 more)

### Community 36 - "expenses.service.ts"
Cohesion: 0.10
Nodes (23): amountBelowPaid(), discountTooLarge(), entryNotFound(), futureDate(), paymentTooLarge(), reversalBelowPaid(), reversalNotReversible(), tooManyReceipts() (+15 more)

### Community 37 - "guest-directory.tsx"
Cohesion: 0.10
Nodes (36): Filter(), GuestDirectory(), change(), GuestRow(), NotAdded(), alok, kavita, titles (+28 more)

### Community 39 - "proxy.ts"
Cohesion: 0.10
Nodes (21): api, nextConfig, securityHeaders, apiClientAsVisitor(), FORWARDED_HEADERS, apiOrigin(), safeNextPath(), SESSION_COOKIE (+13 more)

### Community 40 - "member-invites.e2e-spec.ts"
Cohesion: 0.08
Nodes (11): AuthSession, User, USER_STATUSES, UserDocument, UserSchema, UserStatus, invitationEmail(), invite() (+3 more)

### Community 41 - "dashboard.service.ts"
Cohesion: 0.07
Nodes (16): DashboardController, DashboardService, DASHBOARD_SECTIONS, DashboardCategoryDto, DashboardCeremoniesDto, DashboardCeremonyDto, DashboardDto, DashboardExpensesDto (+8 more)

### Community 42 - "expenses.controller.ts"
Cohesion: 0.08
Nodes (41): OptionalTextBlockField(), CATEGORY_EMPTY, CreateExpenseDto, TITLE_EMPTY, VENDOR_MESSAGE, EntryPersonDto, EXPENSE_STATUSES, ExpenseEntryDto (+33 more)

### Community 43 - "wedding-details-form.test.tsx"
Cohesion: 0.25
Nodes (5): fill(), fillRequired(), goTo, patch, post

### Community 44 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, noFallthroughCasesInSwitch, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+3 more)

### Community 45 - "dashboard.e2e-spec.ts"
Cohesion: 0.10
Nodes (18): INVITE_TTL_MS, MAX_OWNERS, todayInIndia(), WEDDING_RATE_LIMITS, WEDDING_TIME_ZONE, addEvent(), Dashboard, dataOf() (+10 more)

### Community 46 - ".answer"
Cohesion: 0.14
Nodes (4): GuestReminderChoiceDto, CurrentGuest, GuestAccessController, GuestContext

### Community 47 - "MediaExportsService"
Cohesion: 0.18
Nodes (3): MediaExportListDto, attachment(), MediaExportsController

### Community 48 - "auth/dto/fields.ts"
Cohesion: 0.21
Nodes (12): CurrentPasswordField(), DisplayNameField(), EmailField(), LinkTokenField(), NewPasswordField(), trim, ForgotPasswordDto, LoginDto (+4 more)

### Community 49 - "themed-site.tsx"
Cohesion: 0.04
Nodes (96): Invitation(), InvitationPage(), metadata, ReminderChoice(), datesOf(), HeaderView, initials(), RsvpHeader() (+88 more)

### Community 51 - "uploads.service.ts"
Cohesion: 0.03
Nodes (66): photoImageUrl(), MODERATION_ACTIONS, ModerationAction, UploadDto, albumClosed(), albumLimit(), eventAlbumTitle(), storageFull() (+58 more)

### Community 52 - "albums.controller.ts"
Cohesion: 0.13
Nodes (3): AlbumsController, QuotaDto, QuotaService

### Community 54 - "nest-cli.json"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 55 - "tsconfig.build.json"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, exclude, extends, include, ./tsconfig.json

### Community 56 - "dashboard/server.tsx"
Cohesion: 0.19
Nodes (20): metadata, OverviewPage(), AboutWedding(), AttentionTasks(), Empty(), ExpenseOverview(), Panel(), RsvpSnapshot() (+12 more)

### Community 58 - "guest-access.controller.ts"
Cohesion: 0.26
Nodes (9): clearGuestCookie(), cookieOptions(), GUEST_COOKIE, readGuestCookie(), setGuestCookie(), guestSessionMissing(), GuestRequest, GuestSessionGuard (+1 more)

### Community 59 - "schema.d.ts"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 60 - "photo-uploads.e2e-spec.ts"
Cohesion: 0.10
Nodes (9): OUTBOX_STATES, OutboxEvent, OutboxEventSchema, OutboxState, initiate(), ownerWithAlbum(), PhotoBody, started() (+1 more)

### Community 61 - "VendorsService"
Cohesion: 0.09
Nodes (8): VendorDto, VendorEventDto, VendorListDto, Vendor, unknownVendorEvents(), VendorsController, distinctIds(), VendorsService

### Community 62 - "guest-form.tsx"
Cohesion: 0.07
Nodes (33): GuestDetails(), confirm(), copyLink(), ensureLink(), shareWhatsApp(), moment(), whatsappUrl(), GuestDrawer() (+25 more)

### Community 63 - "@nestjs/common"
Cohesion: 0.03
Nodes (56): AuthModule, AuthSessionDocument, AuthSessionSchema, DashboardHttpModule, EventsHttpModule, EventsModule, ExpensesHttpModule, ExpensesModule (+48 more)

### Community 65 - "album.schema.ts"
Cohesion: 0.18
Nodes (6): AlbumEventDto, Album, ALBUM_KINDS, AlbumDocument, AlbumKind, AlbumSchema

### Community 66 - "health.controller.ts"
Cohesion: 0.12
Nodes (8): HealthController, noTerminusDocs, toDto(), HealthDto, HealthModule, MongoHealthIndicator, RedisHealthIndicator, @nestjs/terminus

### Community 67 - "planning-features.tsx"
Cohesion: 0.13
Nodes (24): Amount(), AVATAR, COLUMN_DOT, ExpensesPreview(), GuestsPreview(), HouseholdRow(), RSVP_LABEL, TASK_ICON_COLOUR (+16 more)

### Community 68 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowJs, incremental, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 69 - "sanitize"
Cohesion: 0.18
Nodes (17): addStep(), closeStep(), describeError(), describeList(), describePositional(), describeTopLevel(), describeValue(), finishStep() (+9 more)

### Community 70 - "media-export.schema.ts"
Cohesion: 0.18
Nodes (9): CreateMediaExportDto, MediaExportDto, EXPORT_SCOPES, EXPORT_STATES, ExportScope, ExportState, MediaExport, MediaExportDocument (+1 more)

### Community 71 - "api/package.json"
Cohesion: 0.04
Nodes (56): dependencies, archiver@^7.0.1, @aws-sdk/client-s3@^3.1175.0, @aws-sdk/lib-storage@^3.1175.0, @aws-sdk/s3-presigned-post@^3.1175.0, class-transformer@^0.5.1, class-validator@^0.15.1, mongoose@^9.12.1 (+48 more)

### Community 72 - "guest-upload.tsx"
Cohesion: 0.06
Nodes (53): metadata, UploadPage(), count(), PhotoGrid(), move(), removeChosen(), STATE, Item (+45 more)

### Community 73 - "expense-files.service.ts"
Cohesion: 0.04
Nodes (33): receiptNotFound(), receiptRejected(), ExpenseFilesService, StoredAsset, PhotoProcessor, WebsiteConfig, imageNotFound(), uploadRejected() (+25 more)

### Community 74 - "Icon"
Cohesion: 0.06
Nodes (66): metadata, SettingsPage(), metadata, TeamPage(), Action, ArchiveAction(), CancelDeletionAction(), DeletionAction() (+58 more)

### Community 76 - "copy.ts"
Cohesion: 0.13
Nodes (15): CEREMONY_TONE, CARD_VISUALS, PhotosSnippet(), RsvpSnippet(), container, celebrations, faq, finalCta (+7 more)

### Community 77 - "migrations.ts"
Cohesion: 0.06
Nodes (28): assertOrdered(), MigrationRunner, MIGRATIONS_COLLECTION, albumIndexes, deletionJobIndexes, eventIndexes, expenseEvents, expenseIndexes (+20 more)

### Community 79 - "contracts/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, noEmit, extends, include, ../../tsconfig.base.json

### Community 80 - "upload-links.e2e-spec.ts"
Cohesion: 0.15
Nodes (16): EXPORT_REQUESTED, PHOTO_UPLOADED, dataOf(), ExportBody, exported(), weddingWithPhotos(), dataOf(), guestUpload() (+8 more)

### Community 81 - "GuestsService"
Cohesion: 0.07
Nodes (26): GuestDetailInvitationDto, GuestDto, GuestEmailDto, GuestInvitationDto, GuestLinkDto, GuestListDto, ImportCommitResultDto, ImportPreviewResultDto (+18 more)

### Community 82 - "(public)/page.tsx"
Cohesion: 0.38
Nodes (10): HomePage(), metadata, Celebrations(), Closing(), GuestExperience(), HowItWorks(), PlanningFeatures(), Trust() (+2 more)

### Community 83 - "PhotosController"
Cohesion: 0.10
Nodes (10): AuthenticatedRequest, Authentication, BulkModerationDto, BulkModerationResultDto, PhotoDto, PhotoListDto, ReviewQueueDto, MediaHttpModule (+2 more)

### Community 84 - "env.ts"
Cohesion: 0.19
Nodes (11): reflect-metadata@^0.2.2, crossFieldProblems(), DEFAULT_TRACE_MODE, ENV_KEYS, isLocalOrigin(), MAIL_TRANSPORTS, MailTransportName, valid (+3 more)

### Community 85 - "pending-invitations.tsx"
Cohesion: 0.10
Nodes (38): AcceptButton(), DeclineButton(), Detail(), Eyebrow(), Heading(), invitationKind(), joiningAs(), MyInvite (+30 more)

### Community 88 - "reminder-scheduler.ts"
Cohesion: 0.10
Nodes (19): bullmq@^6.7.7, ioredis@^6.0.0, REMINDER_QUEUE, ReminderScheduler, MEDIA_SWEEP_QUEUE, MediaSweeper, accessLog(), logger (+11 more)

### Community 89 - "public-gallery.controller.ts"
Cohesion: 0.22
Nodes (6): PublicAlbumDto, PublicGalleryDto, PublicPhotoDto, PublicPhotoListDto, PublicGalleryService, publicImageUrl()

### Community 90 - "outbox-relay.ts"
Cohesion: 0.12
Nodes (11): OutboxEventDocument, DEFAULT_OUTBOX_RETRY, OUTBOX_HANDLERS, OUTBOX_RETRY, OutboxHandler, OutboxRetryOptions, OUTBOX_QUEUE, OutboxJobData (+3 more)

### Community 92 - "expenses.e2e-spec.ts"
Cohesion: 0.14
Nodes (13): addManager(), created(), detail(), DetailBody, EntryBody, errorOf(), ExpenseBody, fieldsOf() (+5 more)

### Community 93 - "event-form.test.tsx"
Cohesion: 0.17
Nodes (8): haldi, onCancel, onSaved, patch, post, refresh, renderEdit(), renderForm()

### Community 94 - "index.ts"
Cohesion: 0.05
Nodes (71): ExpensesPage(), metadata, GuestsPage(), metadata, metadata, VendorsPage(), AddExpenseButton(), ExpensesEmpty() (+63 more)

### Community 98 - "LocalObjectStorage"
Cohesion: 0.12
Nodes (3): LocalObjectStorage, notFound(), S3ObjectStorage

### Community 99 - "tasks.e2e-spec.ts"
Cohesion: 0.18
Nodes (12): addManager(), create(), created(), errorOf(), eventIn(), fieldsOf(), ListBody, listed() (+4 more)

### Community 101 - "guest-emails.ts"
Cohesion: 0.20
Nodes (19): answerNote(), C, card(), celebrationsOf(), eventLines(), eventRow(), eventTable(), guestInviteMessage() (+11 more)

### Community 102 - ".require"
Cohesion: 0.05
Nodes (29): eventNotFound(), guestNotFound(), nothingToInviteTo(), partySizeConflict(), AlbumsService, AlbumDto, AlbumListDto, albumNotFound() (+21 more)

### Community 104 - "GuestRemindersService"
Cohesion: 0.30
Nodes (3): reminderEventUnavailable(), GuestRemindersService, isDuplicateKey()

### Community 106 - "routes.ts"
Cohesion: 0.06
Nodes (76): DashboardPage(), metadata, OpenWorkspace(), AppLayout(), metadata, AuthLayout(), metadata, metadata (+68 more)

### Community 107 - "guest-policy.ts"
Cohesion: 0.11
Nodes (13): ReminderScopeDto, ReminderSkipsDto, SendReminderDto, SkippedGuestsDto, UpdateReminderSettingsDto, GUEST_LIST_LIMIT, GUEST_SESSION_DAYS, REMINDER_CHECK_MINUTES (+5 more)

### Community 108 - "UploadAccessService"
Cohesion: 0.25
Nodes (3): GuestUploadDto, uploadLinkUnavailable(), UploadAccessService

### Community 109 - "CreateUploadDto"
Cohesion: 0.14
Nodes (3): CreateUploadDto, trimmed, UploadFormDto

### Community 110 - "main.ts"
Cohesion: 0.18
Nodes (7): AppModule, API_PREFIX, createOpenApiDocument(), bootstrap(), listener, RequestListener, AppLogger

### Community 112 - "upload-link.dto.ts"
Cohesion: 0.21
Nodes (10): GuestAlbumDto, UPLOAD_CLOSED_REASONS, UploadClosedReason, PHOTO_INVITE_AUDIENCES, CAPABILITY_SCOPES, CAPABILITY_STATUSES, CapabilityScope, CapabilityStatus (+2 more)

### Community 113 - "ServerError"
Cohesion: 0.21
Nodes (7): Error(), fontClasses, manrope, newsreader, GlobalError(), referenceOf(), ServerError()

### Community 115 - "configure-app.ts"
Cohesion: 0.10
Nodes (22): configureApp(), ApiErrorDetailDto, ApiErrorDto, FieldErrorDto, ApiExceptionFilter, CODE_BY_STATUS, Dto, run() (+14 more)

### Community 116 - "hero.tsx"
Cohesion: 0.26
Nodes (11): AccountHome, accountHome, DashboardMockup(), Hero(), Metric(), ForVisitor(), StartPlanningLink(), StartPlanningLinkProps (+3 more)

### Community 117 - "upload-links.controller.ts"
Cohesion: 0.11
Nodes (9): CreateUploadLinkDto, EmailUploadLinkDto, EmailUploadLinkResultDto, PhotoInviteAudience, PhotoInviteAudienceDto, UploadLinkDto, UploadLinksDto, UploadLinksController (+1 more)

### Community 118 - "vercel.json"
Cohesion: 0.20
Nodes (9): framework, root, rewrites, $schema, services, api, web, framework (+1 more)

### Community 120 - "workspacePath"
Cohesion: 0.39
Nodes (11): GettingStarted(), QuickActions(), StatCards(), WORKSPACE_NAV, eventsPath(), expensesPath(), guestsPath(), settingsPath() (+3 more)

### Community 121 - "ApiDataResponse"
Cohesion: 0.15
Nodes (3): CoverUploadDto, SlugAvailabilityDto, WebsiteController

### Community 122 - "ledger-dialogs.tsx"
Cohesion: 0.04
Nodes (102): AddFiles(), ENTRY_ICONS, entryAmount(), entryCaption(), ExpenseDetails(), LinkChip(), ExpenseForm(), submit() (+94 more)

### Community 124 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:migrate, dev, dev:worker, lint, openapi:export, start (+5 more)

### Community 125 - "@testing-library/react"
Cohesion: 0.08
Nodes (16): @testing-library/react@^16.3.3, items, events, titles, invite, post, replace, search (+8 more)

### Community 126 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, @my-marriage/contracts@workspace:*, next@16.4.6, openapi-fetch@^0.17.0, qrcode@^1.5.4, react@19.3.1, react-dom@19.3.1, @my-marriage/contracts (+3 more)

### Community 128 - "accept-invitation.test.tsx"
Cohesion: 0.33
Nodes (6): answer(), get, me, post, preview, reply()

### Community 132 - "website-policy.ts"
Cohesion: 0.18
Nodes (10): contentShape, WebsiteConfigDocument, WebsiteConfigSchema, WebsiteContent, WebsiteFaq, COVER_TYPES, DEFAULT_TEMPLATE, UPLOAD_FORM_SECONDS (+2 more)

### Community 133 - "upload-access.controller.ts"
Cohesion: 0.28
Nodes (4): ExchangeUploadTokenDto, cookieOptions(), setUploadCookie(), UPLOAD_COOKIE

### Community 135 - "rsvp-form.test.tsx"
Cohesion: 0.29
Nodes (3): patch, refresh, view

### Community 137 - "password-policy.ts"
Cohesion: 0.24
Nodes (10): COMMON_BASE_WORDS, COMMON_PASSWORDS, isCommon(), LEET, lettersOf(), PASSWORD_MAX_LENGTH, PASSWORD_MESSAGES, PASSWORD_MIN_LENGTH (+2 more)

### Community 141 - "website-input.dto.ts"
Cohesion: 0.13
Nodes (7): blockText, CoverUploadRequestDto, lineText, PublishWebsiteDto, UpdateWebsiteDto, WebsiteContentInputDto, WebsiteFaqInputDto

### Community 143 - "pending-invitations.test.tsx"
Cohesion: 0.29
Nodes (6): failure(), goTo, invite, other, post, reply()

### Community 145 - "task-form.test.tsx"
Cohesion: 0.17
Nodes (8): TaskChoices, choices, onCancel, onSaved, patch, post, refresh, task

### Community 146 - "vendors/input.ts"
Cohesion: 0.42
Nodes (7): isEmail(), isPhone(), empty, tooLong(), VENDOR_INPUT_LIMITS, VendorInput, vendorInputErrors()

### Community 147 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, start, test, test:browser, typecheck

### Community 152 - "tasks/format.ts"
Cohesion: 0.36
Nodes (6): TaskRow(), clock(), dueLabel(), DueTone, shortDay(), open

### Community 161 - "event-form.tsx"
Cohesion: 0.07
Nodes (42): EventsPage(), metadata, EventActions(), renderActions(), EventBrowser(), EventItem, matches(), Tab (+34 more)

### Community 162 - "reminder-schedule.ts"
Cohesion: 0.54
Nodes (5): addDays(), dueOffsets(), isUpcoming(), localNow(), haldi

### Community 164 - "preview-tabs.test.tsx"
Cohesion: 0.29
Nodes (3): PreviewTab, PreviewTabs(), tabs

### Community 165 - "GuestAccessService"
Cohesion: 0.11
Nodes (16): GuestViewDto, GuestViewEventDto, GuestAccessService, countTooLarge(), guestRemindersOff(), invitationLinkOff(), invitationNotFound(), invitationNotShared() (+8 more)

### Community 167 - "event-actions.test.tsx"
Cohesion: 0.40
Nodes (5): confirmDelete(), del, event, openMenu(), refresh

### Community 170 - "guests/input.ts"
Cohesion: 0.36
Nodes (6): GUEST_INPUT_LIMITS, GuestInput, guestInputErrors(), isEmail(), isPhone(), blank

### Community 173 - "tasks/input.ts"
Cohesion: 0.38
Nodes (5): TASK_INPUT_LIMITS, TaskInput, taskInputErrors(), blank, tooLong()

### Community 174 - "website-templates.tsx"
Cohesion: 0.15
Nodes (12): STEP_SNIPPETS, LOOK, TemplateId, TemplatePreview(), SectionHeadingProps, WIDTHS, howItWorks, HowItWorksStepId (+4 more)

### Community 175 - "InjectRedis"
Cohesion: 0.20
Nodes (5): @nestjs/config@^12.1.1, InjectRedis(), RedisLifecycle, redisProviders, @nestjs/config

### Community 176 - "auth-email.composer.ts"
Cohesion: 0.14
Nodes (16): AuthEmailComposer, passwordChangedMessage(), passwordResetMessage(), verifyEmailMessage(), ComposedEmail, EmailToCompose, BRAND, EmailLayout (+8 more)

### Community 180 - "legal-document.tsx"
Cohesion: 0.32
Nodes (7): metadata, PrivacyPage(), metadata, TermsPage(), LegalDocument(), LegalDocumentProps, readingContainer

## Knowledge Gaps
- **5 isolated node(s):** `RFC-4180`, `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1544 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **69 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icon()` connect `Icon` to `tasks/server.tsx`, `builder.tsx`, `Header`, `vendor-directory.tsx`, `networkFailure`, `sections.tsx`, `expense-drawer.tsx`, `expenses/server.tsx`, `tasks/format.ts`, `photos/server.tsx`, `event-form.tsx`, `guest-directory.tsx`, `website-templates.tsx`, `themed-site.tsx`, `legal-document.tsx`, `dashboard/server.tsx`, `guest-form.tsx`, `planning-features.tsx`, `guest-upload.tsx`, `copy.ts`, `(public)/page.tsx`, `pending-invitations.tsx`, `index.ts`, `routes.ts`, `ServerError`, `hero.tsx`, `workspacePath`, `ledger-dialogs.tsx`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `./tsconfig.json`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible missing edges._
- **Should `tasks/server.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._
- **Why does `AuthenticatedUser` connect `AuthenticatedUser` to `CurrentUser`, `vendors.service.ts`, `Traced`, `ExpensesService`, `AuthenticatedUser`, `create-task.dto.ts`, `auth.controller.ts`, `MemberInvitesController`, `events/dto/fields.ts`, `member-invites.service.ts`, `.me`, `event-time.ts`, `auth.service.ts`, `expenses.service.ts`, `.create`, `dashboard.service.ts`, `expenses.controller.ts`, `MediaExportsService`, `uploads.service.ts`, `albums.controller.ts`, `VendorsService`, `expense-files.service.ts`, `GuestsService`, `PhotosController`, `.complete`, `.update`, `.update`, `.require`, `GuestRemindersService`, `.create`, `upload-links.controller.ts`, `ApiDataResponse`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Should `signupVerified` be split into smaller, more focused modules?**
  _Cohesion score 0.04983164983164983 - nodes in this community are weakly interconnected._
- **Why does `Header()` connect `Header` to `CurrentUser`, `Icon`, `themed-site.tsx`, `PhotosController`, `PublicGalleryController`, `ApiDataResponse`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Should `builder.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0672316384180791 - nodes in this community are weakly interconnected._