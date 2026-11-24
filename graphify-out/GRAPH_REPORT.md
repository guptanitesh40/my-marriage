# Graph Report - my-marriage  (2026-11-24)

## Corpus Check
- 637 files · ~540,302 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 2, .css 1)

## Summary
- 5048 nodes · 16773 edges · 187 communities (132 shown, 55 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 558 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `38f1b630`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- @nestjs/swagger
- ref_vitest
- builder.tsx
- @nestjs/mongoose
- guests.e2e-spec.ts
- checks.ts
- website.service.ts
- vendors.service.ts
- guests.service.ts
- compilerOptions
- dependencies
- vendors/server.tsx
- networkFailure
- with
- AuthenticatedUser
- sections.tsx
- app/layout.tsx
- RsvpPatchDto
- react
- expenses/server.tsx
- web/package.json
- create-task.dto.ts
- auth.controller.ts
- scripts
- support/worker.ts
- AuthenticatedUser
- TextLineField
- photos/server.tsx
- member-invites.service.ts
- AuthenticatedUser
- catalog
- media-errors.ts
- healthcheck
- website.controller.ts
- contracts/package.json
- auth.service.ts
- next.config.ts
- guest-directory.tsx
- .create
- onboarding/server.tsx
- albums.service.ts
- dashboard.service.ts
- expenses.service.ts
- wedding-details-form.test.tsx
- compilerOptions
- expenses.controller.ts
- .answer
- MediaExportsService
- auth/dto/fields.ts
- themed-site.tsx
- Traced
- albums.controller.ts
- nest-cli.json
- tsconfig.build.json
- guest.dto.ts
- IndexCheck
- guest-access.controller.ts
- schema.d.ts
- website/server.tsx
- .create
- guest-reminders.tsx
- @nestjs/common
- album.schema.ts
- health.controller.ts
- hero.tsx
- compilerOptions
- tracing.ts
- media-export.schema.ts
- api/package.json
- guest-upload.tsx
- website.module.ts
- team/server.tsx
- copy.ts
- migrations.ts
- contracts/tsconfig.json
- vendor-directory.test.tsx
- ImportCommitDto
- (public)/page.tsx
- PhotosController
- Env
- pending-invitations.tsx
- .complete
- reminder-scheduler.ts
- Header
- OutboxRelay
- mail.ts
- api-exception.filter.ts
- event-form.test.tsx
- guests/server.tsx
- .update
- upload-access.controller.ts
- LocalObjectStorage
- rsvp-theme.ts
- guest-emails.ts
- .require
- planning-features.tsx
- WeddingTask
- routes.ts
- GuestRemindersService
- event-card.tsx
- trace.interceptor.ts
- preview.tsx
- .create
- password-hasher.ts
- .ready
- Public
- configure-app.ts
- platform/validation.ts
- upload-links.controller.ts
- vercel.json
- signUpVerified
- vendor-form.test.tsx
- ApiDataResponse
- ledger-dialogs.tsx
- scripts
- @testing-library/react
- guest-transfer.tsx
- accept-invitation.test.tsx
- Header
- website-input.dto.ts
- website-images.service.ts
- expenses.service.ts
- rsvp-form.tsx
- VerifiedProbeController
- password-policy.ts
- website-input.dto.ts
- currentRequestId
- pending-invitations.test.tsx
- task-form.test.tsx
- vendors/input.ts
- scripts
- AlbumsService
- .receive
- journeys.ts
- event-browser.test.tsx
- reminder-schedule.ts
- api/eslint.config.mjs
- preview-tabs.test.tsx
- GuestAccessService
- Accounts
- event-actions.test.tsx
- guests/input.ts
- UpdateWeddingDto
- tasks/input.ts
- website-templates.tsx
- InjectRedis
- guest-form.test.tsx
- api/vercel.json
- web/vercel.json
- legal-document.tsx
- QuotaService
- ProbeDto
- VenueDto
- rsvp-page.tsx

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
- `SignedIn` --references--> `AuthenticatedUser`  [EXTRACTED]
  apps/api/src/modules/auth/auth.service.ts → apps/api/src/modules/auth/sessions.service.ts
- `addManager()` --calls--> `signupVerified()`  [EXTRACTED]
  apps/api/test/guests.e2e-spec.ts → apps/api/test/support/auth.ts
- `GlobalError()` --calls--> `ServerError()`  [EXTRACTED]
  apps/web/src/app/global-error.tsx → apps/web/src/components/errors/server-error.tsx
- `PhotosSnippet()` --calls--> `Icon()`  [EXTRACTED]
  apps/web/src/components/home/guest-experience.tsx → apps/web/src/components/ui/icon.tsx
- `RsvpSnippet()` --calls--> `Icon()`  [EXTRACTED]
  apps/web/src/components/home/guest-experience.tsx → apps/web/src/components/ui/icon.tsx

## Import Cycles
- None detected.

## Communities (187 total, 55 thin omitted)

### Community 0 - "@nestjs/swagger"
Cohesion: 0.12
Nodes (15): CreateMemberInviteDto, INVITABLE_ROLES, InvitePreviewDto, INVITE_EMAIL_STATUSES, INVITE_VIEW_STATUSES, MemberInviteDto, MemberLabelField(), TeamDto (+7 more)

### Community 1 - "ref_vitest"
Cohesion: 0.02
Nodes (116): PHOTO_UPLOADED, MEMBERSHIP_STATUSES, MembershipStatus, WeddingMembership, WeddingMembershipDocument, WeddingMembershipSchema, todayInIndia(), addManager() (+108 more)

### Community 2 - "builder.tsx"
Cohesion: 0.12
Nodes (26): CEREMONY_ICON_TONES, draftOf(), FaqButton(), GalleryChoice(), LIMITS, moved(), ReadinessRow(), same() (+18 more)

### Community 3 - "@nestjs/mongoose"
Cohesion: 0.05
Nodes (33): AuthEmailComposer, RESET_PASSWORD_TTL_MS, SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, SESSION_TOUCH_MS, VERIFY_EMAIL_TTL_MS, AUTH_TOKEN_PURPOSES, AuthActionToken (+25 more)

### Community 4 - "guests.e2e-spec.ts"
Cohesion: 0.15
Nodes (19): added(), addManager(), answer(), DetailBody, errorOf(), eventIn(), fieldsOf(), GuestBody (+11 more)

### Community 5 - "checks.ts"
Cohesion: 0.17
Nodes (19): PDF, PNG, apiPost(), privateLink(), JPEG, PAGES, collectErrors(), DESKTOP (+11 more)

### Community 6 - "website.service.ts"
Cohesion: 0.11
Nodes (14): CoverUploadDto, READINESS_KEYS, ReadinessCheckDto, ReadinessKey, SlugAvailabilityDto, WebsiteContentDto, WebsiteReadinessDto, WebsiteContent (+6 more)

### Community 7 - "vendors.service.ts"
Cohesion: 0.19
Nodes (20): PartySizeField(), CreateGuestDto, IMPORT_MODES, UpdateGuestDto, CATEGORY_EMPTY, CreateVendorDto, NAME_EMPTY, EventIdsField() (+12 more)

### Community 8 - "guests.service.ts"
Cohesion: 0.03
Nodes (73): passwordChangedMessage(), passwordResetMessage(), verifyEmailMessage(), GUEST_RSVP_CHOICES, GuestRsvpChoice, StoredInvitation, linkUnavailable(), GuestInviteComposer (+65 more)

### Community 9 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, declaration, emitDecoratorMetadata, experimentalDecorators, incremental, lib, module, moduleResolution (+13 more)

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (26): dependencies, archiver@^7.0.1, @aws-sdk/client-s3@^3.1175.0, @aws-sdk/lib-storage@^3.1175.0, @aws-sdk/s3-presigned-post@^3.1175.0, bullmq@^6.7.7, class-transformer@^0.5.1, class-validator@^0.15.1 (+18 more)

### Community 11 - "vendors/server.tsx"
Cohesion: 0.15
Nodes (24): avatarOf(), AVATARS, NoResults(), NotAdded(), VendorDirectory(), change(), VendorRow(), useVendorDrawer() (+16 more)

### Community 12 - "networkFailure"
Cohesion: 0.04
Nodes (134): goTo, post, ForgotPasswordForm(), submit(), goTo(), useFocusFirstProblem(), alertFor(), LoginForm() (+126 more)

### Community 13 - "with"
Cohesion: 0.07
Nodes (33): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, API_ORIGIN, jobs (+25 more)

### Community 14 - "AuthenticatedUser"
Cohesion: 0.22
Nodes (3): CurrentUser, GuestDetailDto, GuestsController

### Community 15 - "sections.tsx"
Cohesion: 0.08
Nodes (67): metadata, OverviewPage(), AboutWedding(), AttentionTasks(), CARD, Ceremonies, CeremonyRow(), Empty() (+59 more)

### Community 16 - "app/layout.tsx"
Cohesion: 0.14
Nodes (14): fontClasses, manrope, newsreader, GlobalError(), metadata, RootLayout(), destinationOf(), NavigationProgress() (+6 more)

### Community 18 - "react"
Cohesion: 0.04
Nodes (98): AcceptInvitationPage(), metadata, WeddingEvent, DrawerContext, EventDrawerApi, WeddingEvent, ExpenseDrawer(), announce() (+90 more)

### Community 19 - "expenses/server.tsx"
Cohesion: 0.07
Nodes (46): ExpenseDirectory(), change(), ExpenseRow(), Filter(), Money(), ExpenseDrawerApi, useExpenseDrawer(), del (+38 more)

### Community 20 - "web/package.json"
Cohesion: 0.06
Nodes (47): dependencies, @my-marriage/contracts@workspace:*, next@16.4.6, openapi-fetch@^0.17.0, qrcode@^1.5.4, react@19.3.1, react-dom@19.3.1, devDependencies (+39 more)

### Community 21 - "create-task.dto.ts"
Cohesion: 0.08
Nodes (37): OptionalTimeField(), CreateTaskDto, PRIORITY_MESSAGE, STATE_MESSAGE, OptionalChoiceField(), OptionalIdOrNoneField(), ListTasksQueryDto, TASK_SORTS (+29 more)

### Community 22 - "auth.controller.ts"
Cohesion: 0.19
Nodes (9): ALLOW_UNVERIFIED_KEY, PUBLIC_KEY, MeDto, SessionAuthGuard, clearSessionCookie(), cookieOptions(), readSessionCookie(), SESSION_COOKIE (+1 more)

### Community 23 - "scripts"
Cohesion: 0.07
Nodes (28): description, devDependencies, prettier@catalog:, engines, node, pnpm, name, packageManager (+20 more)

### Community 24 - "support/worker.ts"
Cohesion: 0.04
Nodes (49): EMAIL_COMPOSERS, EmailDeliveryHandler, EmailDeliveryModule, mailTransportProvider, FileMailTransport, MemoryMailTransport, MailTransport, OutgoingEmail (+41 more)

### Community 25 - "AuthenticatedUser"
Cohesion: 0.05
Nodes (30): AuthenticatedUser, DashboardDto, InviteTokenDto, MyInviteDto, WeddingDto, MemberInvitesController, emailStatusOf(), inviteNotFound() (+22 more)

### Community 26 - "TextLineField"
Cohesion: 0.05
Nodes (44): CreateEventDto, EventVenueInputDto, EventDto, EventLivestreamDto, EventVenueDto, OptionalLineField(), OptionalLinkField(), OptionalTimeZoneField() (+36 more)

### Community 27 - "photos/server.tsx"
Cohesion: 0.05
Nodes (94): AlbumPage(), metadata, metadata, PhotosPage(), metadata, SettingsPage(), AlbumCard(), AlbumGrid() (+86 more)

### Community 28 - "member-invites.service.ts"
Cohesion: 0.04
Nodes (40): ActorStampDto, DeletionRequestDto, WeddingVenueDto, RANK, StoredInvite, DELETION_STATES, DeletionJob, DeletionJobDocument (+32 more)

### Community 29 - "AuthenticatedUser"
Cohesion: 0.12
Nodes (7): AuthenticatedRequest, Authentication, MemberListDto, WeddingSettingsDto, WeddingLifecycleService, WeddingsController, ApiDataResponse()

### Community 30 - "catalog"
Cohesion: 0.09
Nodes (22): allowBuilds, msgpackr-extract, @scarf/scarf, sharp, eslint-plugin-import>eslint, eslint-plugin-jsx-a11y>eslint, eslint-plugin-react>eslint, openapi-typescript>typescript (+14 more)

### Community 31 - "media-errors.ts"
Cohesion: 0.16
Nodes (10): albumClosed(), eventAlbumTitle(), storageFull(), uploadExpired(), uploadLinkNotFound(), uploadNotFound(), uploadNotImage(), uploadNotReceived() (+2 more)

### Community 32 - "healthcheck"
Cohesion: 0.11
Nodes (20): interval, retries, start_period, test, timeout, command, healthcheck, image (+12 more)

### Community 33 - "website.controller.ts"
Cohesion: 0.26
Nodes (11): PublicDateRangeDto, PublicEventDto, PublicEventListDto, PublicVenueDto, PublicWebsiteDto, WebsiteFaqDto, contentDto(), projectWebsite() (+3 more)

### Community 34 - "contracts/package.json"
Cohesion: 0.14
Nodes (15): description, devDependencies, openapi-typescript@^7.13.0, typescript@catalog:, exports, ./openapi.json, typescript, name (+7 more)

### Community 35 - "auth.service.ts"
Cohesion: 0.10
Nodes (15): ActionTokensService, ClientContext, invalidLink(), rejectPassword(), RATE_LIMITS, SignedIn, normalizeEmail(), EmailVerificationService (+7 more)

### Community 37 - "guest-directory.tsx"
Cohesion: 0.10
Nodes (35): Filter(), GuestDirectory(), change(), GuestRow(), NotAdded(), alok, kavita, titles (+27 more)

### Community 39 - "onboarding/server.tsx"
Cohesion: 0.08
Nodes (40): InvitationsPage(), metadata, CreateWeddingPage(), metadata, Step(), InvitePartnerPage(), metadata, Step() (+32 more)

### Community 40 - "albums.service.ts"
Cohesion: 0.18
Nodes (10): AlbumStats, NO_PHOTOS, photoImageUrl(), StoredAlbum, AlbumCountsDto, CreateAlbumDto, UpdateAlbumDto, QuotaDto (+2 more)

### Community 41 - "dashboard.service.ts"
Cohesion: 0.09
Nodes (16): DashboardController, DASHBOARD_LIMITS, DashboardService, DASHBOARD_SECTIONS, DashboardCategoryDto, DashboardCeremoniesDto, DashboardCeremonyDto, DashboardExpensesDto (+8 more)

### Community 42 - "expenses.service.ts"
Cohesion: 0.05
Nodes (43): EntryPersonDto, EXPENSE_STATUSES, ExpenseDto, ExpenseEntryDto, ExpenseEventDto, ExpenseLedgerDto, ExpenseListDto, ExpenseStatus (+35 more)

### Community 43 - "wedding-details-form.test.tsx"
Cohesion: 0.25
Nodes (5): fill(), fillRequired(), goTo, patch, post

### Community 44 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, noFallthroughCasesInSwitch, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+3 more)

### Community 45 - "expenses.controller.ts"
Cohesion: 0.20
Nodes (23): OptionalTextBlockField(), CATEGORY_EMPTY, CreateExpenseDto, TITLE_EMPTY, VENDOR_MESSAGE, ChoiceField(), DayField(), IdField() (+15 more)

### Community 46 - ".answer"
Cohesion: 0.14
Nodes (4): GuestReminderChoiceDto, CurrentGuest, GuestAccessController, GuestContext

### Community 47 - "MediaExportsService"
Cohesion: 0.09
Nodes (7): MediaExportDto, MediaExportListDto, exportNotFound(), attachment(), MediaExportsController, MediaExportsService, safeName()

### Community 48 - "auth/dto/fields.ts"
Cohesion: 0.21
Nodes (12): CurrentPasswordField(), DisplayNameField(), EmailField(), LinkTokenField(), NewPasswordField(), trim, ForgotPasswordDto, LoginDto (+4 more)

### Community 49 - "themed-site.tsx"
Cohesion: 0.13
Nodes (37): CeremonyRow(), Livestream(), NO_CELEBRATIONS, PRIVATE_REPLY_NOTE, RSVP_CTA, SECTION_ANCHORS, SectionId, sectionsOf() (+29 more)

### Community 51 - "Traced"
Cohesion: 0.03
Nodes (69): AccountsService, ACTIVE, EXPORT_REQUESTED, StoredExport, EXPORT_KEEP_DAYS, EXPORTS_PER_DAY, GENERAL_ALBUM_TITLE, PHOTO_LIST_LIMIT (+61 more)

### Community 54 - "nest-cli.json"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 55 - "tsconfig.build.json"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, exclude, extends, include, ./tsconfig.json

### Community 56 - "guest.dto.ts"
Cohesion: 0.19
Nodes (13): GuestDetailInvitationDto, GuestDto, GuestEmailDto, GuestInvitationDto, ImportRowResultDto, LINK_STATES, LinkState, RsvpChangeDto (+5 more)

### Community 58 - "guest-access.controller.ts"
Cohesion: 0.32
Nodes (8): clearGuestCookie(), cookieOptions(), GUEST_COOKIE, readGuestCookie(), setGuestCookie(), guestSessionMissing(), GuestRequest, GuestSessionGuard

### Community 59 - "schema.d.ts"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 60 - "website/server.tsx"
Cohesion: 0.29
Nodes (9): metadata, WebsitePage(), WebsiteLoading(), WebsiteSection(), getWebsite(), getWebsitePreview(), PreviewResult, Website (+1 more)

### Community 62 - "guest-reminders.tsx"
Cohesion: 0.16
Nodes (16): Audience, AutoReminders(), DialogHeader(), OFFSETS, ReminderDialog(), load(), open(), RemindGuest() (+8 more)

### Community 63 - "@nestjs/common"
Cohesion: 0.04
Nodes (38): AppModule, AuthHttpModule, AuthModule, DashboardHttpModule, EventsHttpModule, EventsModule, EventVenueSchema, WeddingEvent (+30 more)

### Community 65 - "album.schema.ts"
Cohesion: 0.18
Nodes (6): AlbumEventDto, Album, ALBUM_KINDS, AlbumDocument, AlbumKind, AlbumSchema

### Community 66 - "health.controller.ts"
Cohesion: 0.19
Nodes (6): HealthController, noTerminusDocs, HealthModule, MongoHealthIndicator, RedisHealthIndicator, @nestjs/terminus

### Community 67 - "hero.tsx"
Cohesion: 0.13
Nodes (19): CEREMONY_TONE, DashboardMockup(), Metric(), celebrations, hero, Ceremony, CeremonyTone, couple (+11 more)

### Community 68 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowJs, incremental, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 69 - "tracing.ts"
Cohesion: 0.12
Nodes (28): addStep(), configureTracing(), describeError(), describeList(), describePositional(), describeTopLevel(), describeValue(), finishStep() (+20 more)

### Community 70 - "media-export.schema.ts"
Cohesion: 0.22
Nodes (7): CreateMediaExportDto, EXPORT_SCOPES, EXPORT_STATES, ExportScope, ExportState, MediaExportDocument, MediaExportSchema

### Community 71 - "api/package.json"
Cohesion: 0.09
Nodes (29): devDependencies, eslint@catalog:, eslint-config-prettier@catalog:, @nestjs/cli@^12.0.13, @nestjs/schematics@^12.0.13, @nestjs/testing@^12.5.0, supertest@^7.3.2, @types/archiver@^6.0.4 (+21 more)

### Community 72 - "guest-upload.tsx"
Cohesion: 0.08
Nodes (35): metadata, UploadPage(), Item, PhotoUploader(), choose(), pump(), retry(), update() (+27 more)

### Community 73 - "website.module.ts"
Cohesion: 0.09
Nodes (14): contentShape, WebsiteConfig, WebsiteConfigDocument, WebsiteConfigSchema, WebsiteFaq, WebsiteHttpModule, FILE_ASSET_KINDS, FILE_ASSET_STATES (+6 more)

### Community 74 - "team/server.tsx"
Cohesion: 0.11
Nodes (29): metadata, TeamPage(), InviteActions(), InviteButton(), close(), LabelField(), MemberActions(), saveLabel() (+21 more)

### Community 76 - "copy.ts"
Cohesion: 0.12
Nodes (18): CARD_VISUALS, PhotosSnippet(), RsvpSnippet(), STEP_SNIPPETS, container, faq, finalCta, footer (+10 more)

### Community 77 - "migrations.ts"
Cohesion: 0.10
Nodes (20): albumIndexes, deletionJobIndexes, eventIndexes, expenseEvents, expenseIndexes, fileAssetIndexes, guestIndexes, identityIndexes (+12 more)

### Community 79 - "contracts/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, noEmit, extends, include, ../../tsconfig.base.json

### Community 80 - "vendor-directory.test.tsx"
Cohesion: 0.20
Nodes (8): del, events, refresh, renderDirectory(), replaceState, rows(), vendors, VendorFilters

### Community 81 - "ImportCommitDto"
Cohesion: 0.25
Nodes (4): CreateLinkDto, ImportCommitDto, ImportPreviewDto, ImportRowDto

### Community 82 - "(public)/page.tsx"
Cohesion: 0.35
Nodes (11): HomePage(), metadata, Celebrations(), Closing(), GuestExperience(), Hero(), HowItWorks(), PlanningFeatures() (+3 more)

### Community 83 - "PhotosController"
Cohesion: 0.08
Nodes (15): BulkModerationDto, BulkModerationResultDto, MODERATION_ACTIONS, ModerationAction, PhotoDto, PhotoListDto, ReviewQueueDto, ModerationService (+7 more)

### Community 84 - "Env"
Cohesion: 0.04
Nodes (32): crossFieldProblems(), DEFAULT_TRACE_MODE, Env, ENV_KEYS, MAIL_TRANSPORTS, MailTransportName, valid, validateEnv() (+24 more)

### Community 85 - "pending-invitations.tsx"
Cohesion: 0.06
Nodes (60): SignOutButton(), signOut(), AcceptButton(), DeclineButton(), Detail(), Eyebrow(), Heading(), invitationKind() (+52 more)

### Community 88 - "reminder-scheduler.ts"
Cohesion: 0.16
Nodes (11): REMINDER_CHECK_MINUTES, REMINDER_QUEUE, ReminderScheduler, accessLog(), logger, finish(), createQueueConnection(), logTrace() (+3 more)

### Community 89 - "Header"
Cohesion: 0.14
Nodes (8): PublicAlbumDto, PublicGalleryDto, PublicPhotoDto, PublicPhotoListDto, PublicGalleryController, PublicGalleryService, publicImageUrl(), Header()

### Community 90 - "OutboxRelay"
Cohesion: 0.27
Nodes (3): OutboxEventDocument, OutboxRelay, untilAborted()

### Community 91 - "mail.ts"
Cohesion: 0.11
Nodes (12): app, document, target, children, databaseName, mailDir, migrate, mongoUri (+4 more)

### Community 92 - "api-exception.filter.ts"
Cohesion: 0.24
Nodes (6): ApiExceptionFilter, CODE_BY_STATUS, Dto, run(), RateLimitedException, getRequestId()

### Community 93 - "event-form.test.tsx"
Cohesion: 0.17
Nodes (8): haldi, onCancel, onSaved, patch, post, refresh, renderEdit(), renderForm()

### Community 94 - "guests/server.tsx"
Cohesion: 0.03
Nodes (123): EventsPage(), metadata, ExpensesPage(), metadata, GuestsPage(), metadata, metadata, TasksPage() (+115 more)

### Community 95 - ".update"
Cohesion: 0.09
Nodes (6): TeamController, TeamService, WeddingAccess, memberNotFound(), notYourself(), ownerProtected()

### Community 96 - "upload-access.controller.ts"
Cohesion: 0.05
Nodes (17): GuestAlbumDto, GuestUploadDto, UPLOAD_CLOSED_REASONS, UploadClosedReason, CreateUploadDto, trimmed, UploadFormDto, ExchangeUploadTokenDto (+9 more)

### Community 98 - "LocalObjectStorage"
Cohesion: 0.12
Nodes (3): LocalObjectStorage, notFound(), S3ObjectStorage

### Community 99 - "rsvp-theme.ts"
Cohesion: 0.18
Nodes (12): modern, royal, RSVP_SKINS, RsvpSkin, RsvpThemeId, traditional, modern, royal (+4 more)

### Community 101 - "guest-emails.ts"
Cohesion: 0.21
Nodes (18): answerNote(), C, card(), celebrationsOf(), eventLines(), eventRow(), eventTable(), guestInviteMessage() (+10 more)

### Community 102 - ".require"
Cohesion: 0.05
Nodes (26): GuestLinkDto, GuestListDto, guestNotFound(), partySizeConflict(), distinctIds(), GuestsService, UploadDto, UploadLinkDto (+18 more)

### Community 103 - "planning-features.tsx"
Cohesion: 0.23
Nodes (11): Amount(), AVATAR, COLUMN_DOT, ExpensesPreview(), GuestsPreview(), HouseholdRow(), RSVP_LABEL, TASK_ICON_COLOUR (+3 more)

### Community 106 - "routes.ts"
Cohesion: 0.05
Nodes (77): DashboardPage(), metadata, OpenWorkspace(), AppLayout(), metadata, ForgotPasswordPage(), metadata, AuthLayout() (+69 more)

### Community 107 - "GuestRemindersService"
Cohesion: 0.06
Nodes (34): ImportCommitResultDto, ImportPreviewResultDto, InvitationSelectionDto, ReminderPreviewDto, ReminderResultDto, ReminderScopeDto, ReminderSettingsDto, ReminderSkipsDto (+26 more)

### Community 108 - "event-card.tsx"
Cohesion: 0.19
Nodes (15): EventCard(), STATES, TaskCounts, TaskTiles(), base, TONES, WeddingEvent, missingDetails() (+7 more)

### Community 109 - "trace.interceptor.ts"
Cohesion: 0.25
Nodes (8): rxjs@^7.8.2, TraceInterceptor, closeStep(), currentTrace(), openStep(), recordResponse(), withinStep(), rxjs

### Community 110 - "preview.tsx"
Cohesion: 0.12
Nodes (21): metadata, WebsitePreviewPage(), cinzel, jakarta, mono, rsvpFonts, Draft, Device (+13 more)

### Community 111 - ".create"
Cohesion: 0.12
Nodes (5): taskNotFound(), timeWithoutDay(), unknownAssignee(), unknownEvent(), TasksController

### Community 112 - "password-hasher.ts"
Cohesion: 0.10
Nodes (12): AuthService, invalidCredentials(), ARGON2_COST, derive(), encode(), normalize(), parse(), ParsedHash (+4 more)

### Community 114 - "Public"
Cohesion: 0.24
Nodes (3): AuthController, AllowUnverified(), Public()

### Community 115 - "configure-app.ts"
Cohesion: 0.13
Nodes (14): @nestjs/core@^12.5.0, API_PREFIX, configureApp(), createOpenApiDocument(), bootstrap(), listener, RequestListener, defaultHeaders() (+6 more)

### Community 116 - "platform/validation.ts"
Cohesion: 0.31
Nodes (5): ApiErrorDetailDto, ApiErrorDto, FieldErrorDto, createValidationPipe(), toFieldErrors()

### Community 117 - "upload-links.controller.ts"
Cohesion: 0.13
Nodes (8): CreateUploadLinkDto, EmailUploadLinkDto, EmailUploadLinkResultDto, PHOTO_INVITE_AUDIENCES, PhotoInviteAudience, PhotoInviteAudienceDto, UploadLinksDto, UploadLinksController

### Community 118 - "vercel.json"
Cohesion: 0.20
Nodes (9): framework, root, rewrites, $schema, services, api, web, framework (+1 more)

### Community 119 - "signUpVerified"
Cohesion: 0.29
Nodes (15): ownerAtEvents(), ownerAtExpenses(), ownerAtGuests(), ownerAtOverview(), ownerAtPhotos(), ownerAtSettings(), createWedding(), signUpVerified() (+7 more)

### Community 120 - "vendor-form.test.tsx"
Cohesion: 0.17
Nodes (10): events, field(), onCancel, onSaved, patch, post, refresh, renderForm() (+2 more)

### Community 121 - "ApiDataResponse"
Cohesion: 0.14
Nodes (4): WebsiteDto, WebsiteController, websiteChanged(), isDuplicateKey()

### Community 122 - "ledger-dialogs.tsx"
Cohesion: 0.09
Nodes (50): DeleteExpenseDialog(), AddFiles(), ENTRY_ICONS, entryAmount(), entryCaption(), ExpenseDetails(), LinkChip(), AdjustAmountDialog() (+42 more)

### Community 124 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:migrate, dev, dev:worker, lint, openapi:export, start (+5 more)

### Community 125 - "@testing-library/react"
Cohesion: 0.10
Nodes (14): events, titles, invite, post, replace, search, handOver, MyInvite (+6 more)

### Community 126 - "guest-transfer.tsx"
Cohesion: 0.28
Nodes (11): ExportGuests(), download(), COLUMNS, csvCell(), downloadCsv(), ImportRow, parseCsv(), readGuestRows() (+3 more)

### Community 128 - "accept-invitation.test.tsx"
Cohesion: 0.33
Nodes (6): answer(), get, me, post, preview, reply()

### Community 130 - "Header"
Cohesion: 0.17
Nodes (3): PublicWebsiteController, PublicWebsiteService, websiteNotFound()

### Community 132 - "website-input.dto.ts"
Cohesion: 0.40
Nodes (7): GuestViewDto, COVER_MAX_BYTES, COVER_TYPES, CoverType, WEBSITE_LIMITS, WEBSITE_TEMPLATES, WebsiteTemplate

### Community 133 - "website-images.service.ts"
Cohesion: 0.15
Nodes (8): imageNotFound(), uploadRejected(), websiteNotReady(), draftCoverUrl(), StoredAsset, WebsiteImagesService, UPLOAD_FORM_SECONDS, UploadTarget

### Community 134 - "expenses.service.ts"
Cohesion: 0.07
Nodes (24): ExpenseDetailDto, alreadyReversed(), amountBelowPaid(), discountTooLarge(), entryNotFound(), expenseNotFound(), futureDate(), paymentTooLarge() (+16 more)

### Community 135 - "rsvp-form.tsx"
Cohesion: 0.11
Nodes (19): Answer, answerOf(), Choice, ChoiceGroup(), CHOICES, Counter(), Notice, RsvpForm() (+11 more)

### Community 137 - "password-policy.ts"
Cohesion: 0.24
Nodes (9): COMMON_BASE_WORDS, COMMON_PASSWORDS, isCommon(), LEET, lettersOf(), PASSWORD_MAX_LENGTH, PASSWORD_MESSAGES, PASSWORD_MIN_LENGTH (+1 more)

### Community 141 - "website-input.dto.ts"
Cohesion: 0.12
Nodes (7): blockText, CoverUploadRequestDto, lineText, PublishWebsiteDto, UpdateWebsiteDto, WebsiteContentInputDto, WebsiteFaqInputDto

### Community 143 - "pending-invitations.test.tsx"
Cohesion: 0.29
Nodes (6): failure(), goTo, invite, other, post, reply()

### Community 145 - "task-form.test.tsx"
Cohesion: 0.18
Nodes (7): choices, onCancel, onSaved, patch, post, refresh, task

### Community 146 - "vendors/input.ts"
Cohesion: 0.42
Nodes (7): isEmail(), isPhone(), empty, tooLong(), VENDOR_INPUT_LIMITS, VendorInput, vendorInputErrors()

### Community 147 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, start, test, test:browser, typecheck

### Community 152 - "AlbumsService"
Cohesion: 0.25
Nodes (4): EventBrief, AlbumsService, AlbumDto, AlbumListDto

### Community 158 - "journeys.ts"
Cohesion: 0.30
Nodes (10): AUTH_PAGES, expectHomeLeadsTo(), expectRedirectBeforeRender(), PARTNER_STEP, PASSWORD, signIn(), signUp(), verifyFromEmail() (+2 more)

### Community 162 - "reminder-schedule.ts"
Cohesion: 0.44
Nodes (6): REMINDER_SEND_HOUR, addDays(), dueOffsets(), isUpcoming(), localNow(), haldi

### Community 163 - "api/eslint.config.mjs"
Cohesion: 0.29
Nodes (4): @eslint/js@catalog:, typescript-eslint@catalog:, @eslint/js, typescript-eslint

### Community 164 - "preview-tabs.test.tsx"
Cohesion: 0.29
Nodes (3): PreviewTab, PreviewTabs(), tabs

### Community 165 - "GuestAccessService"
Cohesion: 0.17
Nodes (7): GuestViewEventDto, GuestAccessService, countTooLarge(), invitationNotFound(), rsvpChanged(), rsvpClosed(), Rsvp

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
Cohesion: 0.22
Nodes (7): LOOK, TemplateId, TemplatePreview(), SectionHeadingProps, WIDTHS, weddingWebsites, ceremonies

### Community 180 - "legal-document.tsx"
Cohesion: 0.32
Nodes (7): metadata, PrivacyPage(), metadata, TermsPage(), LegalDocument(), LegalDocumentProps, readingContainer

### Community 200 - "rsvp-page.tsx"
Cohesion: 0.17
Nodes (20): Invitation(), InvitationPage(), metadata, datesOf(), HeaderView, initials(), RsvpHeader(), RsvpHero() (+12 more)

## Knowledge Gaps
- **5 isolated node(s):** `RFC-4180`, `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1533 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **55 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthenticatedUser` connect `AuthenticatedUser` to `@nestjs/swagger`, `@nestjs/mongoose`, `expenses.service.ts`, `website.service.ts`, `guests.service.ts`, `AuthenticatedUser`, `create-task.dto.ts`, `auth.controller.ts`, `AlbumsService`, `TextLineField`, `member-invites.service.ts`, `AuthenticatedUser`, `media-errors.ts`, `website.controller.ts`, `auth.service.ts`, `.create`, `albums.service.ts`, `dashboard.service.ts`, `expenses.service.ts`, `MediaExportsService`, `Traced`, `albums.controller.ts`, `.create`, `PhotosController`, `.complete`, `.update`, `.require`, `GuestRemindersService`, `.create`, `Public`, `upload-links.controller.ts`, `ApiDataResponse`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `./tsconfig.json`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible missing edges._
- **Should `@nestjs/swagger` be split into smaller, more focused modules?**
  _Cohesion score 0.1226890756302521 - nodes in this community are weakly interconnected._
- **Why does `Icon()` connect `photos/server.tsx` to `builder.tsx`, `rsvp-form.tsx`, `vendors/server.tsx`, `networkFailure`, `sections.tsx`, `react`, `expenses/server.tsx`, `guest-directory.tsx`, `onboarding/server.tsx`, `website-templates.tsx`, `themed-site.tsx`, `legal-document.tsx`, `guest-reminders.tsx`, `hero.tsx`, `guest-upload.tsx`, `rsvp-page.tsx`, `team/server.tsx`, `copy.ts`, `(public)/page.tsx`, `pending-invitations.tsx`, `Header`, `guests/server.tsx`, `planning-features.tsx`, `routes.ts`, `event-card.tsx`, `preview.tsx`, `ledger-dialogs.tsx`, `guest-transfer.tsx`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Should `ref_vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.023420565688606926 - nodes in this community are weakly interconnected._
- **Why does `Header()` connect `Header` to `Header`, `expenses.service.ts`, `themed-site.tsx`, `PhotosController`, `ApiDataResponse`, `photos/server.tsx`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Should `builder.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12183908045977011 - nodes in this community are weakly interconnected._