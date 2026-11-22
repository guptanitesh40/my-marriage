# Graph Report - my-marriage  (2026-11-22)

## Corpus Check
- 564 files · ~462,743 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 2, .css 1)

## Summary
- 4457 nodes · 14415 edges · 162 communities (122 shown, 40 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 459 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a033976d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.controller.ts
- task-form.tsx
- builder.tsx
- auth-password-reset.e2e-spec.ts
- guests.e2e-spec.ts
- auth.spec.ts
- member-invites.controller.ts
- AlbumsService
- Traced
- compilerOptions
- ref_vitest
- vendor-directory.tsx
- Accounts
- with
- GuestsController
- guests.service.ts
- AuthenticatedUser
- @nestjs/common
- Icon
- event-form.test.tsx
- web/package.json
- create-task.dto.ts
- events/server.tsx
- scripts
- devDependencies
- media-exports.service.ts
- events.service.ts
- photos/server.tsx
- accept-invitation.tsx
- workspace/server.tsx
- catalog
- parseObjectId
- healthcheck
- slug.ts
- contracts/package.json
- dependencies
- UpdateWebsiteDto
- guests/server.tsx
- .create
- mongoose
- vendors.service.ts
- react
- browser.ts
- wedding-details-form.test.tsx
- compilerOptions
- guest-reminders.service.ts
- .answer
- NotificationsService
- Public
- themed-site.tsx
- mongo.ts
- preview.tsx
- nest-cli.json
- tsconfig.build.json
- website-input.dto.ts
- IndexCheck
- .consume
- schema.d.ts
- onboarding/server.tsx
- .create
- routes.ts
- auth.service.ts
- health.controller.ts
- planning-features.tsx
- compilerOptions
- guest-access.controller.ts
- @nestjs/common
- expenses.e2e-spec.ts
- partner-invite.test.tsx
- networkFailure
- support/worker.ts
- GuestRemindersService
- migrations.ts
- contracts/tsconfig.json
- guest-upload.tsx
- upload-links.controller.ts
- upload.ts
- PhotosController
- @nestjs/swagger
- accept-invitation.test.tsx
- RsvpPatchDto
- album-grid.tsx
- guest-form.tsx
- SessionAuthGuard
- OptionalTextBlockField
- GuestAccessService
- password-hasher.ts
- tasks/server.tsx
- api/eslint.config.mjs
- .initiate
- LocalObjectStorage
- review-queue.tsx
- tasks.e2e-spec.ts
- media-exports.controller.ts
- .update
- .create
- [slug]/page.tsx
- upload-links.e2e-spec.ts
- wedding.schema.ts
- vendors.e2e-spec.ts
- ref_vitest
- TasksService
- photo-uploads.e2e-spec.ts
- ProbeController
- .complete
- configure-app.ts
- vendor-form.test.tsx
- upload-access.service.ts
- WebsiteService
- ledger-dialogs.tsx
- scripts
- legal-document.tsx
- event.schema.ts
- website-projection.ts
- todayIn
- AuthenticatedUser
- ComposedEmail
- VerifiedProbeController
- password-policy.ts
- dependencies
- website.controller.ts
- event-actions.test.tsx
- pending-invitations.test.tsx
- .events
- task-form.test.tsx
- member-invites.e2e-spec.ts
- scripts
- preview-tabs.test.tsx
- reminder-schedule.ts
- guest-form.test.tsx
- website.dto.ts
- Vendor
- app/layout.tsx
- [albumId]/page.tsx

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 213 edges
2. `AuthenticatedUser` - 208 edges
3. `@nestjs/common` - 144 edges
4. `ApiDataResponse()` - 115 edges
5. `networkFailure()` - 112 edges
6. `toFailure()` - 110 edges
7. `@nestjs/mongoose` - 104 edges
8. `CurrentUser` - 103 edges
9. `Traced()` - 102 edges
10. `mongoose` - 102 edges

## Surprising Connections (you probably didn't know these)
- `choose()` --calls--> `photoProblem()`  [EXTRACTED]
  apps/web/src/components/upload/guest-upload.tsx → apps/web/src/lib/photos/upload.ts
- `SignedIn` --references--> `AuthenticatedUser`  [EXTRACTED]
  apps/api/src/modules/auth/auth.service.ts → apps/api/src/modules/auth/sessions.service.ts
- `EmailRequest` --references--> `NotificationKind`  [EXTRACTED]
  apps/api/src/modules/notifications/notifications.service.ts → apps/api/src/modules/notifications/notification.schema.ts
- `renderEdit()` --calls--> `EventForm()`  [EXTRACTED]
  apps/web/src/components/events/event-form.test.tsx → apps/web/src/components/events/event-form.tsx
- `renderForm()` --calls--> `EventForm()`  [EXTRACTED]
  apps/web/src/components/events/event-form.test.tsx → apps/web/src/components/events/event-form.tsx

## Import Cycles
- None detected.

## Communities (162 total, 40 thin omitted)

### Community 0 - "auth.controller.ts"
Cohesion: 0.13
Nodes (20): CurrentPasswordField(), DisplayNameField(), EmailField(), LinkTokenField(), NewPasswordField(), trim, ForgotPasswordDto, LoginDto (+12 more)

### Community 1 - "task-form.tsx"
Cohesion: 0.06
Nodes (56): EventForm(), send(), submit(), EventState, Mark(), STALE, STATES, WeddingEvent (+48 more)

### Community 2 - "builder.tsx"
Cohesion: 0.13
Nodes (24): CEREMONY_ICON_TONES, Draft, draftOf(), FaqButton(), LIMITS, moved(), ReadinessRow(), same() (+16 more)

### Community 3 - "auth-password-reset.e2e-spec.ts"
Cohesion: 0.08
Nodes (22): AuthEmailComposer, AuthActionToken, AuthSession, User, USER_STATUSES, UserDocument, UserSchema, UserStatus (+14 more)

### Community 4 - "guests.e2e-spec.ts"
Cohesion: 0.13
Nodes (20): GuestsModule, added(), addManager(), answer(), DetailBody, errorOf(), eventIn(), fieldsOf() (+12 more)

### Community 5 - "auth.spec.ts"
Cohesion: 0.09
Nodes (50): app, document, target, children, databaseName, mailDir, migrate, mongoUri (+42 more)

### Community 6 - "member-invites.controller.ts"
Cohesion: 0.06
Nodes (15): MemberListDto, MemberInviteDto, WeddingDto, MemberInvitesController, inviteNotFound(), isExpired(), MemberInvitesService, ownerActiveLimitOnAccept() (+7 more)

### Community 7 - "AlbumsService"
Cohesion: 0.09
Nodes (13): EventBrief, ReminderEvent, AlbumsService, AlbumDto, AlbumEventDto, AlbumListDto, QuotaDto, QuotaService (+5 more)

### Community 8 - "Traced"
Cohesion: 0.04
Nodes (45): SessionsService, EventsService, StoredInvitation, GuestInviteComposer, GuestLinks, GuestReminderComposer, EventInvitation, EventInvitationDocument (+37 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, emitDecoratorMetadata, experimentalDecorators, incremental, module, moduleResolution, outDir (+11 more)

### Community 10 - "ref_vitest"
Cohesion: 0.07
Nodes (21): ACTIVE_OWNED_INDEX, MEMBERSHIP_STATUSES, MembershipStatus, WeddingMembership, WeddingMembershipDocument, WeddingMembershipSchema, addManager(), AlbumBody (+13 more)

### Community 11 - "vendor-directory.tsx"
Cohesion: 0.06
Nodes (64): metadata, VendorsPage(), SearchParams, Stat(), VendorsEmpty(), VendorsLoading(), VendorsSection(), VendorStats() (+56 more)

### Community 13 - "with"
Cohesion: 0.07
Nodes (33): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, API_ORIGIN, jobs (+25 more)

### Community 14 - "GuestsController"
Cohesion: 0.21
Nodes (4): CurrentUser, GuestDetailDto, GuestsController, ApiDataResponse()

### Community 15 - "guests.service.ts"
Cohesion: 0.08
Nodes (31): EventRsvpTotalsDto, GuestDetailInvitationDto, GuestDto, GuestEmailDto, GuestInvitationDto, GuestListDto, GuestTotalsDto, ImportCommitResultDto (+23 more)

### Community 16 - "AuthenticatedUser"
Cohesion: 0.10
Nodes (12): AuthenticatedUser, EventDto, EventLivestreamDto, eventNotFound(), GuestLinkDto, guestNotFound(), distinctIds(), GuestsService (+4 more)

### Community 17 - "@nestjs/common"
Cohesion: 0.03
Nodes (61): crossFieldProblems(), DEFAULT_TRACE_MODE, Env, ENV_KEYS, MAIL_TRANSPORTS, MailTransportName, valid, validateEnv() (+53 more)

### Community 18 - "Icon"
Cohesion: 0.08
Nodes (43): AcceptButton(), Detail(), Eyebrow(), Heading(), MyInvite, PendingInvitations(), PrivacyNote(), Problem (+35 more)

### Community 19 - "event-form.test.tsx"
Cohesion: 0.17
Nodes (8): haldi, onCancel, onSaved, patch, post, refresh, renderEdit(), renderForm()

### Community 20 - "web/package.json"
Cohesion: 0.08
Nodes (35): devDependencies, @axe-core/playwright@^4.14.0, eslint@catalog:, eslint-config-next@16.4.6, eslint-config-prettier@catalog:, jsdom@^31.0.1, @playwright/test@^1.65.1, tailwindcss@4.3.5 (+27 more)

### Community 21 - "create-task.dto.ts"
Cohesion: 0.12
Nodes (31): OptionalTimeField(), CreateTaskDto, PRIORITY_MESSAGE, STATE_MESSAGE, OptionalChoiceField(), OptionalIdField(), OptionalIdOrNoneField(), ListTasksQueryDto (+23 more)

### Community 22 - "events/server.tsx"
Cohesion: 0.09
Nodes (30): EventsPage(), metadata, EventBrowser(), matches(), AddEventButton(), EventsEmpty(), EventsLoading(), EventsOverview() (+22 more)

### Community 23 - "scripts"
Cohesion: 0.07
Nodes (28): description, devDependencies, prettier@catalog:, engines, node, pnpm, name, packageManager (+20 more)

### Community 24 - "devDependencies"
Cohesion: 0.09
Nodes (30): devDependencies, eslint@catalog:, eslint-config-prettier@catalog:, @nestjs/cli@^12.0.13, @nestjs/schematics@^12.0.13, @nestjs/testing@^12.5.0, supertest@^7.3.2, @types/archiver@^6.0.4 (+22 more)

### Community 25 - "media-exports.service.ts"
Cohesion: 0.03
Nodes (43): CreateMediaExportDto, MediaExportDto, exportNotFound(), ACTIVE, EXPORT_REQUESTED, MediaExportsService, safeName(), StoredExport (+35 more)

### Community 26 - "events.service.ts"
Cohesion: 0.10
Nodes (17): CreateEventDto, EventVenueInputDto, OptionalLineField(), OptionalLinkField(), OptionalTimeZoneField(), UpdateEventDto, EVENT_LIMITS, EVENT_LIST_LIMIT (+9 more)

### Community 27 - "photos/server.tsx"
Cohesion: 0.10
Nodes (30): metadata, PhotosPage(), RefreshWhileProcessing(), AlbumsEmpty(), GalleryCard(), PendingCard(), PhotosLoading(), PhotosSection() (+22 more)

### Community 28 - "accept-invitation.tsx"
Cohesion: 0.10
Nodes (26): ForgotPasswordPage(), metadata, AcceptInvitationPage(), metadata, LoginPage(), metadata, metadata, ResetPasswordPage() (+18 more)

### Community 29 - "workspace/server.tsx"
Cohesion: 0.10
Nodes (25): DashboardPage(), metadata, OpenWorkspace(), metadata, WeddingWorkspaceLayout(), Workspace(), WorkspaceLoading(), WorkspaceProblem() (+17 more)

### Community 30 - "catalog"
Cohesion: 0.09
Nodes (22): allowBuilds, msgpackr-extract, @scarf/scarf, sharp, eslint-plugin-import>eslint, eslint-plugin-jsx-a11y>eslint, eslint-plugin-react>eslint, openapi-typescript>typescript (+14 more)

### Community 31 - "parseObjectId"
Cohesion: 0.03
Nodes (78): AlbumStats, NO_PHOTOS, photoImageUrl(), StoredAlbum, AlbumCountsDto, BulkModerationResultDto, MODERATION_ACTIONS, ModerationAction (+70 more)

### Community 32 - "healthcheck"
Cohesion: 0.11
Nodes (20): interval, retries, start_period, test, timeout, command, healthcheck, image (+12 more)

### Community 33 - "slug.ts"
Cohesion: 0.36
Nodes (7): isFallbackBase(), SLUG_LIMITS, SLUG_MESSAGE, SLUG_PATTERN, slugBase(), toWords(), withSuffix()

### Community 34 - "contracts/package.json"
Cohesion: 0.14
Nodes (15): description, devDependencies, openapi-typescript@^7.13.0, typescript@catalog:, exports, ./openapi.json, typescript, name (+7 more)

### Community 35 - "dependencies"
Cohesion: 0.08
Nodes (26): dependencies, archiver@^7.0.1, @aws-sdk/client-s3@^3.1175.0, @aws-sdk/lib-storage@^3.1175.0, @aws-sdk/s3-presigned-post@^3.1175.0, bullmq@^6.7.7, class-transformer@^0.5.1, class-validator@^0.15.1 (+18 more)

### Community 36 - "UpdateWebsiteDto"
Cohesion: 0.18
Nodes (4): blockText, lineText, WebsiteContentInputDto, WebsiteFaqInputDto

### Community 37 - "guests/server.tsx"
Cohesion: 0.05
Nodes (79): GuestsPage(), metadata, GuestDetails(), copyLink(), moment(), whatsappUrl(), Filter(), GuestDirectory() (+71 more)

### Community 39 - "mongoose"
Cohesion: 0.03
Nodes (49): RESET_PASSWORD_TTL_MS, SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, SESSION_TOUCH_MS, VERIFY_EMAIL_TTL_MS, NewSession, NOT_DELETED, StoredEvent (+41 more)

### Community 40 - "vendors.service.ts"
Cohesion: 0.24
Nodes (18): OptionalTextBlockField(), PartySizeField(), CreateGuestDto, IMPORT_MODES, UpdateGuestDto, CATEGORY_EMPTY, CreateVendorDto, NAME_EMPTY (+10 more)

### Community 41 - "react"
Cohesion: 0.06
Nodes (45): nextConfig, securityHeaders, EventActions(), WeddingEvent, Tab, TaskCounts, WeddingEvent, EventCard() (+37 more)

### Community 42 - "browser.ts"
Cohesion: 0.06
Nodes (50): Invitation(), InvitationPage(), metadata, ReminderChoice(), Answer, answerOf(), Choice, ChoiceGroup() (+42 more)

### Community 43 - "wedding-details-form.test.tsx"
Cohesion: 0.25
Nodes (5): fill(), fillRequired(), goTo, patch, post

### Community 44 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, noFallthroughCasesInSwitch, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+3 more)

### Community 45 - "guest-reminders.service.ts"
Cohesion: 0.08
Nodes (29): ReminderPreviewDto, ReminderSkipsDto, SkippedGuestsDto, UpdateReminderSettingsDto, dailyEmailLimit(), guestRemindersOff(), invitationLinkOff(), invitationNotShared() (+21 more)

### Community 46 - ".answer"
Cohesion: 0.14
Nodes (3): CurrentGuest, GuestAccessController, GuestContext

### Community 47 - "NotificationsService"
Cohesion: 0.11
Nodes (3): NotificationsService, MembershipInvite, OutboxService

### Community 48 - "Public"
Cohesion: 0.24
Nodes (3): AuthController, AllowUnverified(), Public()

### Community 49 - "themed-site.tsx"
Cohesion: 0.06
Nodes (53): PublicGalleryController, datesOf(), HeaderView, initials(), RsvpHeader(), RsvpHero(), CeremonyRow(), CoverImage() (+45 more)

### Community 51 - "mongo.ts"
Cohesion: 0.13
Nodes (12): duplicateKeyOn(), assertOrdered(), MigrationRecord, MigrationRunner, MIGRATIONS_COLLECTION, Migration, DuplicateKey, duplicateKey() (+4 more)

### Community 52 - "preview.tsx"
Cohesion: 0.17
Nodes (18): metadata, WebsitePreviewPage(), metadata, WebsitePage(), isTemplate(), Problem(), WebsitePreview(), WebsitePreviewLoading() (+10 more)

### Community 54 - "nest-cli.json"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 55 - "tsconfig.build.json"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, exclude, extends, include, ./tsconfig.json

### Community 56 - "website-input.dto.ts"
Cohesion: 0.18
Nodes (14): GuestViewDto, contentShape, WebsiteConfigDocument, WebsiteConfigSchema, WebsiteContent, WebsiteFaq, COVER_MAX_BYTES, COVER_TYPES (+6 more)

### Community 58 - ".consume"
Cohesion: 0.11
Nodes (5): ActionTokensService, PasswordResetService, AuthActionTokenDocument, AuthTokenPurpose, RateLimitedException

### Community 59 - "schema.d.ts"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 60 - "onboarding/server.tsx"
Cohesion: 0.09
Nodes (39): CreateWeddingPage(), metadata, Step(), InvitePartnerPage(), metadata, metadata, OverviewPage(), accountHome (+31 more)

### Community 61 - ".create"
Cohesion: 0.09
Nodes (9): unknownEvents(), VendorDto, VendorEventDto, VendorListDto, unknownVendorEvents(), vendorNotFound(), VendorsController, distinctIds() (+1 more)

### Community 62 - "routes.ts"
Cohesion: 0.10
Nodes (37): AppLayout(), metadata, AuthLayout(), metadata, metadata, OnboardingLayout(), PublicLayout(), renderHome() (+29 more)

### Community 63 - "auth.service.ts"
Cohesion: 0.13
Nodes (10): ClientContext, invalidLink(), rejectPassword(), AuthHttpModule, RATE_LIMITS, SignedIn, normalizeEmail(), EmailVerificationService (+2 more)

### Community 66 - "health.controller.ts"
Cohesion: 0.13
Nodes (8): @nestjs/terminus@^12.1.0, HealthController, noTerminusDocs, toDto(), HealthDto, HealthModule, RedisHealthIndicator, @nestjs/terminus

### Community 67 - "planning-features.tsx"
Cohesion: 0.06
Nodes (59): HomePage(), metadata, Celebrations(), CEREMONY_TONE, Closing(), CARD_VISUALS, GuestExperience(), PhotosSnippet() (+51 more)

### Community 68 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowJs, incremental, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 69 - "guest-access.controller.ts"
Cohesion: 0.25
Nodes (9): clearGuestCookie(), cookieOptions(), GUEST_COOKIE, readGuestCookie(), setGuestCookie(), guestSessionMissing(), GuestRequest, GuestSessionGuard (+1 more)

### Community 70 - "@nestjs/common"
Cohesion: 0.05
Nodes (39): AccountsService, AuthModule, AUTH_TOKEN_PURPOSES, AuthActionTokenSchema, AuthSessionDocument, AuthSessionSchema, EventsHttpModule, EventsModule (+31 more)

### Community 71 - "expenses.e2e-spec.ts"
Cohesion: 0.14
Nodes (13): addManager(), created(), detail(), DetailBody, EntryBody, errorOf(), ExpenseBody, fieldsOf() (+5 more)

### Community 73 - "networkFailure"
Cohesion: 0.07
Nodes (85): goTo, post, ForgotPasswordForm(), submit(), goTo(), useFocusFirstProblem(), alertFor(), LoginForm() (+77 more)

### Community 74 - "support/worker.ts"
Cohesion: 0.07
Nodes (33): EMAIL_COMPOSERS, EmailDeliveryHandler, EmailDeliveryModule, mailTransportProvider, FileMailTransport, MemoryMailTransport, MailTransport, OutgoingEmail (+25 more)

### Community 76 - "GuestRemindersService"
Cohesion: 0.20
Nodes (4): ReminderResultDto, ReminderScopeDto, SendReminderDto, GuestRemindersService

### Community 77 - "migrations.ts"
Cohesion: 0.11
Nodes (18): albumIndexes, eventIndexes, expenseEvents, expenseIndexes, fileAssetIndexes, guestIndexes, identityIndexes, inviteIndexes (+10 more)

### Community 79 - "contracts/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, noEmit, extends, include, ../../tsconfig.base.json

### Community 80 - "guest-upload.tsx"
Cohesion: 0.13
Nodes (18): metadata, UploadPage(), albumWhere(), GuestAlbum, GuestUpload(), choose(), send(), update() (+10 more)

### Community 81 - "upload-links.controller.ts"
Cohesion: 0.08
Nodes (16): GuestAlbumDto, UPLOAD_CLOSED_REASONS, UploadClosedReason, CreateUploadLinkDto, EmailUploadLinkDto, EmailUploadLinkResultDto, ExchangeUploadTokenDto, PHOTO_INVITE_AUDIENCES (+8 more)

### Community 82 - "upload.ts"
Cohesion: 0.16
Nodes (18): Item, PhotoUploader(), choose(), pump(), retry(), update(), Status, UploadRow() (+10 more)

### Community 83 - "PhotosController"
Cohesion: 0.14
Nodes (3): BulkModerationDto, PhotoDto, PhotosController

### Community 84 - "@nestjs/swagger"
Cohesion: 0.12
Nodes (15): ALLOW_UNVERIFIED_KEY, AuthenticatedRequest, PUBLIC_KEY, Authentication, TaskAssigneeDto, CreateMemberInviteDto, INVITABLE_ROLES, InvitePreviewDto (+7 more)

### Community 85 - "accept-invitation.test.tsx"
Cohesion: 0.33
Nodes (6): answer(), get, me, post, preview, reply()

### Community 87 - "RsvpPatchDto"
Cohesion: 0.15
Nodes (5): ExchangeTokenDto, GUEST_RSVP_CHOICES, GuestRsvpChoice, RsvpPatchDto, GUEST_LIMITS

### Community 88 - "album-grid.tsx"
Cohesion: 0.21
Nodes (16): AlbumCard(), AlbumGrid(), choose(), AlbumSection(), ShareUploadsButton(), Album, ALBUM_FILTERS, AlbumFilter (+8 more)

### Community 89 - "guest-form.tsx"
Cohesion: 0.11
Nodes (20): GuestForm(), fail(), submit(), STALE, Audience, OFFSETS, GUEST_INPUT_LIMITS, GuestInput (+12 more)

### Community 91 - "OptionalTextBlockField"
Cohesion: 0.09
Nodes (33): CATEGORY_EMPTY, CreateExpenseDto, TITLE_EMPTY, VENDOR_MESSAGE, EntryPersonDto, EXPENSE_STATUSES, ExpenseEntryDto, ExpenseEventDto (+25 more)

### Community 92 - "GuestAccessService"
Cohesion: 0.15
Nodes (9): GuestReminderChoiceDto, GuestViewEventDto, GuestAccessService, countTooLarge(), invitationNotFound(), linkUnavailable(), rsvpChanged(), rsvpClosed() (+1 more)

### Community 93 - "password-hasher.ts"
Cohesion: 0.12
Nodes (11): AuthService, invalidCredentials(), ARGON2_COST, derive(), encode(), normalize(), parse(), ParsedHash (+3 more)

### Community 94 - "tasks/server.tsx"
Cohesion: 0.07
Nodes (47): metadata, TasksPage(), NoResults(), SearchParams, Stat(), TaskPanel(), TasksEmpty(), TasksLoading() (+39 more)

### Community 95 - "api/eslint.config.mjs"
Cohesion: 0.29
Nodes (4): @eslint/js@catalog:, typescript-eslint@catalog:, @eslint/js, typescript-eslint

### Community 96 - ".initiate"
Cohesion: 0.15
Nodes (5): UploadAccessController, cookieOptions(), readUploadCookie(), setUploadCookie(), UPLOAD_COOKIE

### Community 98 - "LocalObjectStorage"
Cohesion: 0.07
Nodes (5): LocalUploadController, LocalObjectStorage, notFound(), S3ObjectStorage, StorageHttpModule

### Community 99 - "review-queue.tsx"
Cohesion: 0.26
Nodes (14): PhotoGrid(), move(), STATE, ACTIONS, addedBy(), PhotoViewer(), FilterChip(), ReviewQueue() (+6 more)

### Community 101 - "tasks.e2e-spec.ts"
Cohesion: 0.18
Nodes (12): addManager(), create(), created(), errorOf(), eventIn(), fieldsOf(), ListBody, listed() (+4 more)

### Community 102 - "media-exports.controller.ts"
Cohesion: 0.17
Nodes (3): MediaExportListDto, attachment(), MediaExportsController

### Community 106 - "[slug]/page.tsx"
Cohesion: 0.18
Nodes (14): metadata, PublicWeddingPage(), PublishedSite(), cinzel, jakarta, mono, rsvpFonts, Device (+6 more)

### Community 107 - "upload-links.e2e-spec.ts"
Cohesion: 0.17
Nodes (15): PHOTO_UPLOADED, addPhoto(), dataOf(), PublicAlbum, publishedWedding(), dataOf(), guestUpload(), GuestUploadBody (+7 more)

### Community 108 - "wedding.schema.ts"
Cohesion: 0.15
Nodes (10): Wedding, WEDDING_QUOTA_BYTES, WeddingDocument, WeddingQuota, WeddingQuotaSchema, WeddingSchema, couple(), create() (+2 more)

### Community 109 - "vendors.e2e-spec.ts"
Cohesion: 0.15
Nodes (7): addManager(), create(), created(), errorOf(), fieldsOf(), ownerWithWedding(), VendorBody

### Community 110 - "ref_vitest"
Cohesion: 0.12
Nodes (12): ProbeDto, VenueDto, answerHaldi(), asGuest(), ok(), plannedWedding(), PreviewBody, send() (+4 more)

### Community 111 - "TasksService"
Cohesion: 0.08
Nodes (11): TaskDto, TaskListDto, WeddingTask, taskNotFound(), timeWithoutDay(), unknownAssignee(), unknownEvent(), TasksController (+3 more)

### Community 112 - "photo-uploads.e2e-spec.ts"
Cohesion: 0.12
Nodes (6): OutboxEvent, initiate(), ownerWithAlbum(), PhotoBody, started(), UploadBody

### Community 115 - "configure-app.ts"
Cohesion: 0.06
Nodes (44): AppModule, API_PREFIX, configureApp(), createOpenApiDocument(), app, config, ApiErrorDetailDto, ApiErrorDto (+36 more)

### Community 119 - "vendor-form.test.tsx"
Cohesion: 0.17
Nodes (10): events, field(), onCancel, onSaved, patch, post, refresh, renderForm() (+2 more)

### Community 120 - "upload-access.service.ts"
Cohesion: 0.12
Nodes (11): DEVELOPMENT_LINK_SECRET, GuestUploadDto, uploadLinkUnavailable(), uploadSessionMissing(), UPLOAD_LINK_LIMITS, UPLOAD_SESSION_HOURS, GuestUploader, StoredCapability (+3 more)

### Community 121 - "WebsiteService"
Cohesion: 0.12
Nodes (7): WebsiteDto, WebsiteReadinessDto, WebsiteController, websiteChanged(), isDuplicateKey(), WebsiteService, isValidSlug()

### Community 122 - "ledger-dialogs.tsx"
Cohesion: 0.04
Nodes (91): ExpensesPage(), metadata, ENTRY_ICONS, entryAmount(), entryCaption(), ExpenseDetails(), LinkChip(), ExpenseDirectory() (+83 more)

### Community 124 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:migrate, dev, dev:worker, lint, openapi:export, start (+5 more)

### Community 125 - "legal-document.tsx"
Cohesion: 0.35
Nodes (7): metadata, PrivacyPage(), metadata, TermsPage(), LegalDocument(), LegalDocumentProps, readingContainer

### Community 126 - "event.schema.ts"
Cohesion: 0.13
Nodes (12): EventVenueDto, googleMapsUrl(), parse(), youtubeVideoId(), youtubeWatchUrl(), EVENT_STATES, EventState, EventVenue (+4 more)

### Community 128 - "website-projection.ts"
Cohesion: 0.30
Nodes (8): PublicDateRangeDto, PublicEventDto, PublicWebsiteDto, WebsiteFaqDto, contentDto(), projectWebsite(), publicEvent(), publicEvents()

### Community 133 - "todayIn"
Cohesion: 0.38
Nodes (9): DEFAULT_EVENT_TIME_ZONE, isTimeZone(), isWallTime(), offsetAt(), todayIn(), WallClock, wallClock(), wallClockAt() (+1 more)

### Community 134 - "AuthenticatedUser"
Cohesion: 0.08
Nodes (24): ExpenseDetailDto, ExpenseDto, ExpenseListDto, ExpenseTotalsDto, alreadyReversed(), amountBelowPaid(), discountTooLarge(), entryNotFound() (+16 more)

### Community 135 - "ComposedEmail"
Cohesion: 0.12
Nodes (26): passwordChangedMessage(), passwordResetMessage(), verifyEmailMessage(), answerNote(), C, card(), celebrationsOf(), eventLines() (+18 more)

### Community 137 - "password-policy.ts"
Cohesion: 0.27
Nodes (9): COMMON_BASE_WORDS, COMMON_PASSWORDS, isCommon(), LEET, lettersOf(), PASSWORD_MESSAGES, PASSWORD_MIN_LENGTH, passwordProblems() (+1 more)

### Community 138 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, @my-marriage/contracts@workspace:*, next@16.4.6, openapi-fetch@^0.17.0, qrcode@^1.5.4, react@19.3.1, react-dom@19.3.1, @my-marriage/contracts (+3 more)

### Community 141 - "website.controller.ts"
Cohesion: 0.31
Nodes (3): CoverUploadRequestDto, PublishWebsiteDto, UpdateWebsiteDto

### Community 142 - "event-actions.test.tsx"
Cohesion: 0.24
Nodes (9): confirmDelete(), del, event, openMenu(), refresh, renderActions(), EventDrawer(), close() (+1 more)

### Community 143 - "pending-invitations.test.tsx"
Cohesion: 0.29
Nodes (6): failure(), goTo, invite, other, post, reply()

### Community 144 - ".events"
Cohesion: 0.18
Nodes (3): PublicEventListDto, PublicWebsiteController, PublicWebsiteService

### Community 145 - "task-form.test.tsx"
Cohesion: 0.10
Nodes (12): @testing-library/react@^16.3.3, EventItem, items, base, choices, onCancel, onSaved, patch (+4 more)

### Community 146 - "member-invites.e2e-spec.ts"
Cohesion: 0.25
Nodes (5): invitationEmail(), invite(), invited(), ownerWithWedding(), tag()

### Community 147 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, start, test, test:browser, typecheck

### Community 148 - "preview-tabs.test.tsx"
Cohesion: 0.29
Nodes (3): PreviewTab, PreviewTabs(), tabs

### Community 149 - "reminder-schedule.ts"
Cohesion: 0.54
Nodes (5): addDays(), dueOffsets(), isUpcoming(), localNow(), haldi

### Community 152 - "website.dto.ts"
Cohesion: 0.29
Nodes (6): CoverUploadDto, READINESS_KEYS, ReadinessCheckDto, ReadinessKey, SlugAvailabilityDto, WebsiteContentDto

### Community 158 - "app/layout.tsx"
Cohesion: 0.33
Nodes (3): manrope, metadata, newsreader

### Community 159 - "[albumId]/page.tsx"
Cohesion: 0.67
Nodes (3): AlbumPage(), metadata, AlbumLoading()

## Knowledge Gaps
- **5 isolated node(s):** `RFC-4180`, `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1372 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthenticatedUser` connect `AuthenticatedUser` to `auth.controller.ts`, `website-projection.ts`, `AuthenticatedUser`, `AlbumsService`, `member-invites.controller.ts`, `website.controller.ts`, `GuestsController`, `guests.service.ts`, `create-task.dto.ts`, `media-exports.service.ts`, `events.service.ts`, `parseObjectId`, `.create`, `mongoose`, `vendors.service.ts`, `guest-reminders.service.ts`, `Public`, `.create`, `auth.service.ts`, `@nestjs/common`, `GuestRemindersService`, `upload-links.controller.ts`, `PhotosController`, `@nestjs/swagger`, `OptionalTextBlockField`, `media-exports.controller.ts`, `.update`, `.create`, `TasksService`, `.complete`, `WebsiteService`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `./tsconfig.json`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible missing edges._
- **Should `auth.controller.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1319073083778966 - nodes in this community are weakly interconnected._
- **Why does `Icon()` connect `Icon` to `task-form.tsx`, `builder.tsx`, `vendor-directory.tsx`, `events/server.tsx`, `photos/server.tsx`, `guests/server.tsx`, `react`, `browser.ts`, `themed-site.tsx`, `preview.tsx`, `onboarding/server.tsx`, `routes.ts`, `planning-features.tsx`, `networkFailure`, `guest-upload.tsx`, `upload.ts`, `album-grid.tsx`, `guest-form.tsx`, `tasks/server.tsx`, `review-queue.tsx`, `[slug]/page.tsx`, `ledger-dialogs.tsx`, `legal-document.tsx`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Should `task-form.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0578386605783866 - nodes in this community are weakly interconnected._
- **Why does `@nestjs/common` connect `@nestjs/common` to `auth.controller.ts`, `auth-password-reset.e2e-spec.ts`, `AuthenticatedUser`, `AlbumsService`, `Traced`, `website.controller.ts`, `GuestsController`, `guests.service.ts`, `@nestjs/common`, `member-invites.e2e-spec.ts`, `create-task.dto.ts`, `devDependencies`, `media-exports.service.ts`, `events.service.ts`, `parseObjectId`, `dependencies`, `mongoose`, `vendors.service.ts`, `guest-reminders.service.ts`, `mongo.ts`, `.create`, `auth.service.ts`, `health.controller.ts`, `guest-access.controller.ts`, `support/worker.ts`, `upload-links.controller.ts`, `@nestjs/swagger`, `OptionalTextBlockField`, `password-hasher.ts`, `LocalObjectStorage`, `media-exports.controller.ts`, `wedding.schema.ts`, `ref_vitest`, `TasksService`, `configure-app.ts`, `upload-access.service.ts`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Should `builder.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12561576354679804 - nodes in this community are weakly interconnected._