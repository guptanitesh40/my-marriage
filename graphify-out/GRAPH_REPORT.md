# Graph Report - my-marriage  (2026-11-23)

## Corpus Check
- 622 files · ~537,084 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 2, .css 1)

## Summary
- 5012 nodes · 16622 edges · 215 communities (129 shown, 86 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 554 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `77df9e97`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- settings/server.tsx
- media-exports.service.ts
- builder.tsx
- ref_vitest
- guests.e2e-spec.ts
- checks.ts
- MemberInvitesService
- .compose
- mongoose
- compilerOptions
- preview.tsx
- vendors/server.tsx
- details-form.tsx
- with
- AuthenticatedUser
- sections.tsx
- sessions.service.ts
- moderation.service.ts
- react
- event-form.test.tsx
- web/package.json
- create-task.dto.ts
- events/server.tsx
- scripts
- support/worker.ts
- @nestjs/swagger
- TextLineField
- Icon
- mongoose
- AuthenticatedUser
- catalog
- uploads.service.ts
- healthcheck
- website.controller.ts
- contracts/package.json
- auth.service.ts
- guests/server.tsx
- .create
- guest-reminders.service.ts
- ImportCommitDto
- event-time.ts
- TasksService
- wedding-details-form.test.tsx
- compilerOptions
- TextLineField
- guest-access.service.ts
- MediaExportsService
- auth.controller.ts
- themed-site.tsx
- ObjectStorage
- albums.controller.ts
- nest-cli.json
- tsconfig.build.json
- upload-access.service.ts
- IndexCheck
- slug.ts
- schema.d.ts
- onboarding/server.tsx
- .create
- networkFailure
- @nestjs/common
- expenses.e2e-spec.ts
- health.controller.ts
- planning-features.tsx
- compilerOptions
- tracing.ts
- vendors.e2e-spec.ts
- api/package.json
- team/server.tsx
- formatBytes
- @nestjs/mongoose
- auth.decorators.ts
- migrations.ts
- contracts/tsconfig.json
- RateLimiter
- .require
- proxy.ts
- PhotosController
- mail.ts
- pending-invitations.tsx
- .complete
- tracing.ts
- public-gallery.controller.ts
- OutboxRelay
- guest-upload.tsx
- PartnerStep
- sha256
- tasks/server.tsx
- team.service.ts
- .initiate
- LocalObjectStorage
- site.ts
- guest-emails.ts
- UploadAccessService
- guest-transfer.tsx
- member-invites.service.ts
- site-header.tsx
- GuestRemindersService
- signUpVerified
- dashboard.e2e-spec.ts
- [slug]/page.tsx
- .create
- password-hasher.ts
- response-envelope.ts
- Public
- api-exception.filter.ts
- tasks.e2e-spec.ts
- upload-links.controller.ts
- journeys.ts
- EventForm
- vendor-form.test.tsx
- ApiDataResponse
- ledger-dialogs.tsx
- scripts
- @testing-library/react
- expense-entry.schema.ts
- accept-invitation.test.tsx
- Header
- trace.interceptor.ts
- plannedWedding
- expenses.service.ts
- guests.ts
- VerifiedProbeController
- password-policy.ts
- guest-form.test.tsx
- website-input.dto.ts
- currentRequestId
- pending-invitations.test.tsx
- event-browser.test.tsx
- task-form.test.tsx
- vendors/input.ts
- scripts
- albums.service.ts
- .receive
- app/layout.tsx
- tracing.spec.ts
- preview-tabs.test.tsx
- ProbeDto
- legal-document.tsx
- tasks/format.ts
- rsvp-chrome.tsx

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 275 edges
2. `AuthenticatedUser` - 244 edges
3. `@nestjs/common` - 155 edges
4. `networkFailure()` - 136 edges
5. `toFailure()` - 134 edges
6. `ApiDataResponse()` - 127 edges
7. `react` - 118 edges
8. `@nestjs/mongoose` - 115 edges
9. `mongoose` - 113 edges
10. `Traced()` - 112 edges

## Surprising Connections (you probably didn't know these)
- `Context` --references--> `MemberDto`  [EXTRACTED]
  apps/api/src/modules/tasks/tasks.service.ts → apps/api/src/modules/weddings/dto/member.dto.ts
- `SignedIn` --references--> `AuthenticatedUser`  [EXTRACTED]
  apps/api/src/modules/auth/auth.service.ts → apps/api/src/modules/auth/sessions.service.ts
- `ownerWithAlbum()` --calls--> `signupVerified()`  [EXTRACTED]
  apps/api/test/photo-uploads.e2e-spec.ts → apps/api/test/support/auth.ts
- `member()` --calls--> `signupVerified()`  [EXTRACTED]
  apps/api/test/dashboard.e2e-spec.ts → apps/api/test/support/auth.ts
- `commit()` --indirect_call--> `rows()`  [INFERRED]
  apps/web/src/components/guests/guest-transfer.tsx → apps/web/src/components/vendors/vendor-directory.test.tsx

## Import Cycles
- None detected.

## Communities (215 total, 86 thin omitted)

### Community 0 - "settings/server.tsx"
Cohesion: 0.23
Nodes (16): metadata, SettingsPage(), Banner(), Lifecycle(), LinkCard(), SettingsLoading(), SettingsSection(), StatusBanner() (+8 more)

### Community 1 - "media-exports.service.ts"
Cohesion: 0.04
Nodes (49): sharp@^0.34.5, ACTIVE, EXPORT_REQUESTED, StoredExport, PhotoProcessor, Rendition, StoredIntent, EXPORT_SCOPES (+41 more)

### Community 2 - "builder.tsx"
Cohesion: 0.10
Nodes (31): CEREMONY_ICON_TONES, Draft, draftOf(), FaqButton(), GalleryChoice(), LIMITS, moved(), ReadinessRow() (+23 more)

### Community 3 - "ref_vitest"
Cohesion: 0.04
Nodes (70): AuthEmailComposer, AuthModule, AuthSession, AuthSessionDocument, AuthSessionSchema, USER_STATUSES, UserDocument, UserSchema (+62 more)

### Community 4 - "guests.e2e-spec.ts"
Cohesion: 0.13
Nodes (20): GuestInviteComposer, added(), addManager(), answer(), DetailBody, errorOf(), eventIn(), fieldsOf() (+12 more)

### Community 5 - "checks.ts"
Cohesion: 0.17
Nodes (19): PDF, PNG, apiPost(), privateLink(), JPEG, PAGES, collectErrors(), DESKTOP (+11 more)

### Community 6 - "MemberInvitesService"
Cohesion: 0.07
Nodes (21): InviteTokenDto, MemberInviteDto, MyInviteDto, MemberInvitesController, inviteNotFound(), isExpired(), MemberInvitesService, toInviteDto() (+13 more)

### Community 8 - "mongoose"
Cohesion: 0.03
Nodes (46): DASHBOARD_LIMITS, DashboardService, DASHBOARD_SECTIONS, DashboardCategoryDto, DashboardCeremoniesDto, DashboardCeremonyDto, DashboardExpensesDto, DashboardGuestsDto (+38 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, emitDecoratorMetadata, experimentalDecorators, incremental, module, moduleResolution, outDir (+11 more)

### Community 10 - "preview.tsx"
Cohesion: 0.20
Nodes (14): metadata, WebsitePreviewPage(), metadata, WebsitePage(), isTemplate(), Problem(), WebsitePreview(), WebsitePreviewLoading() (+6 more)

### Community 11 - "vendors/server.tsx"
Cohesion: 0.07
Nodes (55): metadata, VendorsPage(), IconName, SearchParams, Stat(), VendorsEmpty(), VendorsLoading(), VendorsSection() (+47 more)

### Community 12 - "details-form.tsx"
Cohesion: 0.09
Nodes (37): PasswordFieldProps, SelectField(), SelectFieldProps, describedBy(), FieldFrame(), FieldProps, inputClass, TextFieldProps (+29 more)

### Community 13 - "with"
Cohesion: 0.07
Nodes (33): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, API_ORIGIN, jobs (+25 more)

### Community 14 - "AuthenticatedUser"
Cohesion: 0.13
Nodes (16): GuestDetailDto, GuestDetailInvitationDto, GuestDto, GuestEmailDto, GuestInvitationDto, GuestListDto, ImportCommitResultDto, ImportPreviewResultDto (+8 more)

### Community 15 - "sections.tsx"
Cohesion: 0.10
Nodes (54): metadata, OverviewPage(), AboutWedding(), AttentionTasks(), CARD, Ceremonies, CeremonyRow(), Empty() (+46 more)

### Community 16 - "sessions.service.ts"
Cohesion: 0.10
Nodes (13): ALLOW_UNVERIFIED_KEY, AuthenticatedRequest, PUBLIC_KEY, RESET_PASSWORD_TTL_MS, SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, SESSION_TOUCH_MS, VERIFY_EMAIL_TTL_MS (+5 more)

### Community 17 - "moderation.service.ts"
Cohesion: 0.09
Nodes (22): BulkModerationDto, BulkModerationResultDto, MODERATION_ACTIONS, ModerationAction, PhotoDto, PhotoListDto, ReviewQueueDto, PHOTO_LIST_LIMIT (+14 more)

### Community 18 - "react"
Cohesion: 0.04
Nodes (91): nextConfig, securityHeaders, Invitation(), InvitationPage(), metadata, WeddingEvent, DrawerContext, EventDrawerApi (+83 more)

### Community 19 - "event-form.test.tsx"
Cohesion: 0.17
Nodes (8): haldi, onCancel, onSaved, patch, post, refresh, renderEdit(), renderForm()

### Community 20 - "web/package.json"
Cohesion: 0.06
Nodes (47): dependencies, @my-marriage/contracts@workspace:*, next@16.4.6, openapi-fetch@^0.17.0, qrcode@^1.5.4, react@19.3.1, react-dom@19.3.1, devDependencies (+39 more)

### Community 21 - "create-task.dto.ts"
Cohesion: 0.11
Nodes (34): CreateTaskDto, PRIORITY_MESSAGE, STATE_MESSAGE, OptionalChoiceField(), OptionalIdField(), OptionalIdOrNoneField(), ListTasksQueryDto, TASK_SORTS (+26 more)

### Community 22 - "events/server.tsx"
Cohesion: 0.06
Nodes (52): EventsPage(), metadata, EventActions(), confirmDelete(), del, event, openMenu(), refresh (+44 more)

### Community 23 - "scripts"
Cohesion: 0.07
Nodes (28): description, devDependencies, prettier@catalog:, engines, node, pnpm, name, packageManager (+20 more)

### Community 24 - "support/worker.ts"
Cohesion: 0.11
Nodes (21): EmailDeliveryModule, mailTransportProvider, FileMailTransport, MemoryMailTransport, MailTransport, OutgoingEmail, PermanentMailError, SentEmail (+13 more)

### Community 25 - "@nestjs/swagger"
Cohesion: 0.09
Nodes (18): GUEST_RSVP_CHOICES, GuestRsvpChoice, GUEST_LIMITS, CreateAlbumDto, UpdateAlbumDto, CreateMemberInviteDto, INVITABLE_ROLES, CreateWeddingDto (+10 more)

### Community 26 - "TextLineField"
Cohesion: 0.09
Nodes (24): CreateEventDto, EventVenueInputDto, EventListDto, EventLivestreamDto, EventVenueDto, OptionalLineField(), OptionalLinkField(), OptionalTimeField() (+16 more)

### Community 27 - "Icon"
Cohesion: 0.08
Nodes (47): AlbumPage(), metadata, metadata, PhotosPage(), AlbumCard(), AlbumGrid(), choose(), RefreshWhileProcessing() (+39 more)

### Community 28 - "mongoose"
Cohesion: 0.04
Nodes (49): AccountsService, ActorStampDto, DeletionRequestDto, WeddingVenueDto, InviteEmailComposer, DELETION_STATES, DeletionJob, DeletionJobDocument (+41 more)

### Community 29 - "AuthenticatedUser"
Cohesion: 0.13
Nodes (9): AuthenticatedUser, DashboardDto, WeddingDto, WeddingSettingsDto, deletionPending(), WeddingLifecycleService, toWeddingDto(), venueOf() (+1 more)

### Community 30 - "catalog"
Cohesion: 0.09
Nodes (22): allowBuilds, msgpackr-extract, @scarf/scarf, sharp, eslint-plugin-import>eslint, eslint-plugin-jsx-a11y>eslint, eslint-plugin-react>eslint, openapi-typescript>typescript (+14 more)

### Community 31 - "uploads.service.ts"
Cohesion: 0.08
Nodes (30): albumClosed(), storageFull(), uploadExpired(), uploadLinkNotFound(), uploadNotFound(), uploadNotImage(), uploadNotReceived(), uploadTooLarge() (+22 more)

### Community 32 - "healthcheck"
Cohesion: 0.11
Nodes (20): interval, retries, start_period, test, timeout, command, healthcheck, image (+12 more)

### Community 33 - "website.controller.ts"
Cohesion: 0.09
Nodes (39): GuestViewDto, PublicDateRangeDto, PublicEventDto, PublicVenueDto, PublicWebsiteDto, READINESS_KEYS, ReadinessCheckDto, ReadinessKey (+31 more)

### Community 34 - "contracts/package.json"
Cohesion: 0.14
Nodes (15): description, devDependencies, openapi-typescript@^7.13.0, typescript@catalog:, exports, ./openapi.json, typescript, name (+7 more)

### Community 35 - "auth.service.ts"
Cohesion: 0.13
Nodes (11): ClientContext, invalidLink(), rejectPassword(), RATE_LIMITS, AuthService, SignedIn, normalizeEmail(), EmailVerificationService (+3 more)

### Community 37 - "guests/server.tsx"
Cohesion: 0.04
Nodes (95): GuestsPage(), metadata, CEREMONIES_SHOWN, CeremonyConfirmed, ConfirmedByCeremony(), events, titles, GuestDetails() (+87 more)

### Community 39 - "guest-reminders.service.ts"
Cohesion: 0.07
Nodes (33): dailyEmailLimit(), guestRemindersOff(), invitationLinkOff(), invitationNotShared(), nobodyToRemind(), noEmailAddress(), noReminderEmail(), nothingToInviteTo() (+25 more)

### Community 40 - "ImportCommitDto"
Cohesion: 0.25
Nodes (4): CreateLinkDto, ImportCommitDto, ImportPreviewDto, ImportRowDto

### Community 41 - "event-time.ts"
Cohesion: 0.22
Nodes (11): DEFAULT_EVENT_TIME_ZONE, isTimeZone(), isWallTime(), offsetAt(), todayIn(), WallClock, wallClock(), wallClockAt() (+3 more)

### Community 42 - "TasksService"
Cohesion: 0.11
Nodes (10): TaskAssigneeDto, TaskDto, WeddingTask, taskNotFound(), timeWithoutDay(), unknownAssignee(), unknownEvent(), TasksService (+2 more)

### Community 43 - "wedding-details-form.test.tsx"
Cohesion: 0.25
Nodes (5): fill(), fillRequired(), goTo, patch, post

### Community 44 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, noFallthroughCasesInSwitch, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+3 more)

### Community 45 - "TextLineField"
Cohesion: 0.12
Nodes (41): OptionalTextBlockField(), CATEGORY_EMPTY, CreateExpenseDto, TITLE_EMPTY, VENDOR_MESSAGE, ChoiceField(), DayField(), IdField() (+33 more)

### Community 46 - "guest-access.service.ts"
Cohesion: 0.05
Nodes (30): ExchangeTokenDto, RsvpPatchDto, RsvpDto, GuestReminderChoiceDto, GuestViewEventDto, CurrentGuest, GuestAccessController, GuestAccessService (+22 more)

### Community 47 - "MediaExportsService"
Cohesion: 0.12
Nodes (6): CreateMediaExportDto, MediaExportDto, MediaExportListDto, exportNotFound(), attachment(), MediaExportsController

### Community 48 - "auth.controller.ts"
Cohesion: 0.14
Nodes (18): CurrentPasswordField(), DisplayNameField(), EmailField(), LinkTokenField(), NewPasswordField(), trim, ForgotPasswordDto, LoginDto (+10 more)

### Community 49 - "themed-site.tsx"
Cohesion: 0.12
Nodes (28): NO_CELEBRATIONS, PRIVATE_REPLY_NOTE, RSVP_CTA, SECTION_ANCHORS, SectionId, sectionsOf(), GalleryAlbum, SiteGallery() (+20 more)

### Community 51 - "ObjectStorage"
Cohesion: 0.06
Nodes (4): UploadIntent, WebsiteImagesService, ObjectStorage, UploadTarget

### Community 54 - "nest-cli.json"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 55 - "tsconfig.build.json"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, exclude, extends, include, ./tsconfig.json

### Community 56 - "upload-access.service.ts"
Cohesion: 0.09
Nodes (14): GuestAlbumDto, UPLOAD_CLOSED_REASONS, UploadClosedReason, CAPABILITY_SCOPES, CAPABILITY_STATUSES, CapabilityStatus, UploadCapability, UploadCapabilityDocument (+6 more)

### Community 58 - "slug.ts"
Cohesion: 0.22
Nodes (8): isFallbackBase(), isValidSlug(), SLUG_LIMITS, SLUG_MESSAGE, SLUG_PATTERN, slugBase(), toWords(), withSuffix()

### Community 59 - "schema.d.ts"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 60 - "onboarding/server.tsx"
Cohesion: 0.11
Nodes (31): DashboardPage(), metadata, OpenWorkspace(), metadata, WeddingWorkspaceLayout(), currentUserOrNull, InboxPanel(), onboardingVisitor() (+23 more)

### Community 61 - ".create"
Cohesion: 0.09
Nodes (11): VendorDto, VendorEventDto, VendorListDto, unknownVendorEvents(), vendorNotFound(), VendorsController, distinctIds(), NOT_DELETED (+3 more)

### Community 62 - "networkFailure"
Cohesion: 0.05
Nodes (120): ForgotPasswordPage(), metadata, AcceptInvitationPage(), metadata, LoginPage(), metadata, metadata, ResetPasswordPage() (+112 more)

### Community 63 - "@nestjs/common"
Cohesion: 0.04
Nodes (39): AppModule, AuthHttpModule, DashboardHttpModule, EventsHttpModule, EventsModule, ExpensesHttpModule, ExpensesModule, GuestsHttpModule (+31 more)

### Community 65 - "expenses.e2e-spec.ts"
Cohesion: 0.10
Nodes (16): Expense, ExpenseDocument, ExpenseSchema, addManager(), created(), detail(), DetailBody, EntryBody (+8 more)

### Community 66 - "health.controller.ts"
Cohesion: 0.11
Nodes (10): @nestjs/terminus@^12.1.0, HealthController, noTerminusDocs, toDto(), HealthDto, HealthModule, RedisHealthIndicator, InjectRedis() (+2 more)

### Community 67 - "planning-features.tsx"
Cohesion: 0.06
Nodes (68): AppLayout(), metadata, HomePage(), metadata, Celebrations(), CEREMONY_TONE, Closing(), CARD_VISUALS (+60 more)

### Community 68 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowJs, incremental, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 69 - "tracing.ts"
Cohesion: 0.15
Nodes (24): addStep(), configureTracing(), currentTrace(), describeError(), describeList(), describePositional(), describeTopLevel(), describeValue() (+16 more)

### Community 70 - "vendors.e2e-spec.ts"
Cohesion: 0.11
Nodes (10): Vendor, VendorDocument, VendorSchema, addManager(), create(), created(), errorOf(), fieldsOf() (+2 more)

### Community 71 - "api/package.json"
Cohesion: 0.04
Nodes (63): dependencies, archiver@^7.0.1, @aws-sdk/client-s3@^3.1175.0, @aws-sdk/lib-storage@^3.1175.0, @aws-sdk/s3-presigned-post@^3.1175.0, bullmq@^6.7.7, class-transformer@^0.5.1, class-validator@^0.15.1 (+55 more)

### Community 72 - "team/server.tsx"
Cohesion: 0.16
Nodes (22): metadata, TeamPage(), Avatar(), Count(), ForTheCoupleOnly(), HelperRow(), InviteRow(), OwnerCard() (+14 more)

### Community 73 - "formatBytes"
Cohesion: 0.23
Nodes (16): count(), PhotoGrid(), move(), removeChosen(), STATE, ACTIONS, addedBy(), PhotoViewer() (+8 more)

### Community 74 - "@nestjs/mongoose"
Cohesion: 0.07
Nodes (26): PhotoInviteComposer, ComposedEmail, EMAIL_COMPOSERS, EmailComposer, EmailToCompose, EmailDeliveryHandler, FINAL_NOTIFICATION_STATES, Notification (+18 more)

### Community 76 - "auth.decorators.ts"
Cohesion: 0.14
Nodes (3): CreateUploadDto, trimmed, UploadFormDto

### Community 77 - "migrations.ts"
Cohesion: 0.10
Nodes (20): albumIndexes, deletionJobIndexes, eventIndexes, expenseEvents, expenseIndexes, fileAssetIndexes, guestIndexes, identityIndexes (+12 more)

### Community 79 - "contracts/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, noEmit, extends, include, ../../tsconfig.base.json

### Community 81 - ".require"
Cohesion: 0.08
Nodes (13): EventDto, GuestLinkDto, guestNotFound(), distinctIds(), GuestsService, photoImageUrl(), AlbumDto, photoNotFound() (+5 more)

### Community 82 - "proxy.ts"
Cohesion: 0.13
Nodes (17): apiClientAsVisitor(), FORWARDED_HEADERS, safeNextPath(), SESSION_COOKIE, landingWedding(), Membership, ownedActiveWedding(), archivedOwned (+9 more)

### Community 84 - "mail.ts"
Cohesion: 0.11
Nodes (12): app, document, target, children, databaseName, mailDir, migrate, mongoUri (+4 more)

### Community 85 - "pending-invitations.tsx"
Cohesion: 0.08
Nodes (45): AcceptButton(), DeclineButton(), Detail(), Eyebrow(), Heading(), invitationKind(), joiningAs(), MyInvite (+37 more)

### Community 87 - ".complete"
Cohesion: 0.11
Nodes (3): UploadDto, UploadsController, UploadsService

### Community 88 - "tracing.ts"
Cohesion: 0.04
Nodes (41): crossFieldProblems(), DEFAULT_TRACE_MODE, Env, ENV_KEYS, MAIL_TRANSPORTS, MailTransportName, valid, validateEnv() (+33 more)

### Community 89 - "public-gallery.controller.ts"
Cohesion: 0.15
Nodes (8): PublicAlbumDto, PublicGalleryDto, PublicPhotoDto, PublicPhotoListDto, PublicGalleryController, PublicGalleryService, publicImageUrl(), Header()

### Community 90 - "OutboxRelay"
Cohesion: 0.14
Nodes (7): ReminderScheduler, OutboxEventDocument, OutboxRelay, untilAborted(), logTrace(), startTrace(), traceMode()

### Community 91 - "guest-upload.tsx"
Cohesion: 0.08
Nodes (36): metadata, UploadPage(), Item, PhotoUploader(), choose(), pump(), retry(), update() (+28 more)

### Community 92 - "PartnerStep"
Cohesion: 0.18
Nodes (16): InvitationsPage(), metadata, CreateWeddingPage(), metadata, Step(), InvitePartnerPage(), metadata, Step() (+8 more)

### Community 93 - "sha256"
Cohesion: 0.15
Nodes (8): ActionTokensService, AUTH_TOKEN_PURPOSES, AuthActionToken, AuthActionTokenDocument, AuthActionTokenSchema, AuthTokenPurpose, randomToken(), sha256()

### Community 94 - "tasks/server.tsx"
Cohesion: 0.05
Nodes (77): metadata, TasksPage(), NoResults(), SearchParams, Stat(), TaskPanel(), TasksEmpty(), TasksLoading() (+69 more)

### Community 95 - "team.service.ts"
Cohesion: 0.08
Nodes (9): TeamController, TeamService, TeamDto, TeamMemberDto, UpdateMemberDto, WeddingAccess, memberNotFound(), notYourself() (+1 more)

### Community 96 - ".initiate"
Cohesion: 0.12
Nodes (6): ExchangeUploadTokenDto, UploadAccessController, cookieOptions(), readUploadCookie(), setUploadCookie(), UPLOAD_COOKIE

### Community 98 - "LocalObjectStorage"
Cohesion: 0.12
Nodes (3): LocalObjectStorage, notFound(), S3ObjectStorage

### Community 99 - "site.ts"
Cohesion: 0.20
Nodes (19): CeremonyRow(), Livestream(), Celebration(), ceremonyIcon(), Photo(), Welcome(), celebrationCount(), dateRangeLabel() (+11 more)

### Community 101 - "guest-emails.ts"
Cohesion: 0.12
Nodes (28): passwordChangedMessage(), passwordResetMessage(), verifyEmailMessage(), answerNote(), C, card(), celebrationsOf(), eventLines() (+20 more)

### Community 102 - "UploadAccessService"
Cohesion: 0.27
Nodes (4): GuestUploadDto, uploadLinkUnavailable(), uploadSessionMissing(), UploadAccessService

### Community 103 - "guest-transfer.tsx"
Cohesion: 0.21
Nodes (16): ExportGuests(), download(), FORMAT, ImportGuests(), chosen(), Preview, Result, COLUMNS (+8 more)

### Community 104 - "member-invites.service.ts"
Cohesion: 0.15
Nodes (11): emailStatusOf(), RANK, StoredInvite, INVITE_TTL_MS, MAX_OWNERS, WEDDING_RATE_LIMITS, WEDDING_TIME_ZONE, RateLimitedException (+3 more)

### Community 106 - "site-header.tsx"
Cohesion: 0.11
Nodes (28): AuthLayout(), metadata, metadata, OnboardingLayout(), PublicLayout(), renderHome(), AccountHome, accountHome (+20 more)

### Community 107 - "GuestRemindersService"
Cohesion: 0.07
Nodes (13): ReminderPreviewDto, ReminderResultDto, ReminderScopeDto, ReminderSettingsDto, ReminderSkipsDto, SendReminderDto, SkippedGuestsDto, UpdateReminderSettingsDto (+5 more)

### Community 108 - "signUpVerified"
Cohesion: 0.29
Nodes (15): ownerAtEvents(), ownerAtExpenses(), ownerAtGuests(), ownerAtOverview(), ownerAtPhotos(), ownerAtSettings(), createWedding(), signUpVerified() (+7 more)

### Community 109 - "dashboard.e2e-spec.ts"
Cohesion: 0.17
Nodes (12): EventVenueSchema, WeddingEventDocument, WeddingEventSchema, todayInIndia(), refusePastDate(), addEvent(), Dashboard, dataOf() (+4 more)

### Community 110 - "[slug]/page.tsx"
Cohesion: 0.20
Nodes (14): metadata, PublicWeddingPage(), PublishedSite(), cinzel, jakarta, mono, rsvpFonts, Device (+6 more)

### Community 112 - "password-hasher.ts"
Cohesion: 0.21
Nodes (9): invalidCredentials(), ARGON2_COST, derive(), encode(), normalize(), parse(), ParsedHash, PasswordHasher (+1 more)

### Community 113 - "response-envelope.ts"
Cohesion: 0.15
Nodes (15): API_PREFIX, configureApp(), createOpenApiDocument(), app, config, accessLog(), defaultHeaders(), logger (+7 more)

### Community 114 - "Public"
Cohesion: 0.24
Nodes (3): AuthController, AllowUnverified(), Public()

### Community 115 - "api-exception.filter.ts"
Cohesion: 0.17
Nodes (10): ApiErrorDetailDto, ApiErrorDto, FieldErrorDto, ApiExceptionFilter, CODE_BY_STATUS, Dto, run(), recordResponse() (+2 more)

### Community 116 - "tasks.e2e-spec.ts"
Cohesion: 0.18
Nodes (12): addManager(), create(), created(), errorOf(), eventIn(), fieldsOf(), ListBody, listed() (+4 more)

### Community 117 - "upload-links.controller.ts"
Cohesion: 0.10
Nodes (13): CreateUploadLinkDto, EmailUploadLinkDto, EmailUploadLinkResultDto, PHOTO_INVITE_AUDIENCES, PhotoInviteAudience, PhotoInviteAudienceDto, UploadLinkDto, UploadLinksDto (+5 more)

### Community 118 - "journeys.ts"
Cohesion: 0.30
Nodes (10): AUTH_PAGES, expectHomeLeadsTo(), expectRedirectBeforeRender(), PARTNER_STEP, PASSWORD, signIn(), signUp(), verifyFromEmail() (+2 more)

### Community 119 - "EventForm"
Cohesion: 0.23
Nodes (10): EventForm(), send(), submit(), Mark(), EVENT_INPUT_LIMITS, EventInput, eventInputErrors(), blank (+2 more)

### Community 120 - "vendor-form.test.tsx"
Cohesion: 0.17
Nodes (10): events, field(), onCancel, onSaved, patch, post, refresh, renderForm() (+2 more)

### Community 121 - "ApiDataResponse"
Cohesion: 0.10
Nodes (11): CurrentUser, ExpenseFileUploadRequestDto, CoverUploadDto, WebsiteDto, CoverUploadRequestDto, PublishWebsiteDto, UpdateWebsiteDto, WebsiteController (+3 more)

### Community 122 - "ledger-dialogs.tsx"
Cohesion: 0.04
Nodes (122): ExpensesPage(), metadata, AddFiles(), ENTRY_ICONS, entryAmount(), entryCaption(), ExpenseDetails(), LinkChip() (+114 more)

### Community 124 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:migrate, dev, dev:worker, lint, openapi:export, start (+5 more)

### Community 125 - "@testing-library/react"
Cohesion: 0.18
Nodes (6): base, invite, post, replace, search, @testing-library/react

### Community 126 - "expense-entry.schema.ts"
Cohesion: 0.25
Nodes (5): ENTRY_TYPES, ExpenseEntry, ExpenseEntryDocument, ExpenseEntrySchema, PAYMENT_METHODS

### Community 128 - "accept-invitation.test.tsx"
Cohesion: 0.33
Nodes (6): answer(), get, me, post, preview, reply()

### Community 130 - "Header"
Cohesion: 0.17
Nodes (3): PublicEventListDto, PublicWebsiteController, PublicWebsiteService

### Community 132 - "trace.interceptor.ts"
Cohesion: 0.47
Nodes (3): TraceInterceptor, closeStep(), withinStep()

### Community 133 - "plannedWedding"
Cohesion: 0.40
Nodes (6): answerHaldi(), asGuest(), ok(), plannedWedding(), send(), tokenOf()

### Community 134 - "expenses.service.ts"
Cohesion: 0.04
Nodes (60): DashboardController, EntryPersonDto, EXPENSE_STATUSES, ExpenseDetailDto, ExpenseDto, ExpenseEntryDto, ExpenseEventDto, ExpenseLedgerDto (+52 more)

### Community 135 - "guests.ts"
Cohesion: 0.29
Nodes (3): patch, refresh, view

### Community 137 - "password-policy.ts"
Cohesion: 0.24
Nodes (10): COMMON_BASE_WORDS, COMMON_PASSWORDS, isCommon(), LEET, lettersOf(), PASSWORD_MAX_LENGTH, PASSWORD_MESSAGES, PASSWORD_MIN_LENGTH (+2 more)

### Community 141 - "website-input.dto.ts"
Cohesion: 0.14
Nodes (5): blockText, lineText, WebsiteContentInputDto, WebsiteFaqInputDto, UpdateWeddingDto

### Community 142 - "currentRequestId"
Cohesion: 0.14
Nodes (4): AppLogger, JSON_LOGS, currentRequestId(), ProbeController

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

### Community 152 - "albums.service.ts"
Cohesion: 0.08
Nodes (17): EventBrief, ReminderEvent, AlbumsService, AlbumStats, NO_PHOTOS, StoredAlbum, AlbumCountsDto, AlbumEventDto (+9 more)

### Community 158 - "app/layout.tsx"
Cohesion: 0.33
Nodes (3): manrope, metadata, newsreader

### Community 162 - "tracing.spec.ts"
Cohesion: 0.14
Nodes (8): formatMs(), renderTrace(), Accounts, accounts, Decorated, Hasher, traced(), Trace

### Community 164 - "preview-tabs.test.tsx"
Cohesion: 0.29
Nodes (3): PreviewTab, PreviewTabs(), tabs

### Community 180 - "legal-document.tsx"
Cohesion: 0.35
Nodes (7): metadata, PrivacyPage(), metadata, TermsPage(), LegalDocument(), LegalDocumentProps, readingContainer

### Community 183 - "tasks/format.ts"
Cohesion: 0.43
Nodes (5): clock(), dueLabel(), DueTone, shortDay(), open

### Community 200 - "rsvp-chrome.tsx"
Cohesion: 0.43
Nodes (6): datesOf(), HeaderView, initials(), RsvpHeader(), RsvpHero(), CoverImage()

## Knowledge Gaps
- **5 isolated node(s):** `RFC-4180`, `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1513 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **86 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icon()` connect `guests/server.tsx` to `settings/server.tsx`, `builder.tsx`, `preview.tsx`, `vendors/server.tsx`, `details-form.tsx`, `sections.tsx`, `react`, `events/server.tsx`, `Icon`, `themed-site.tsx`, `legal-document.tsx`, `networkFailure`, `planning-features.tsx`, `rsvp-chrome.tsx`, `formatBytes`, `team/server.tsx`, `pending-invitations.tsx`, `public-gallery.controller.ts`, `guest-upload.tsx`, `tasks/server.tsx`, `site.ts`, `guest-transfer.tsx`, `site-header.tsx`, `[slug]/page.tsx`, `ledger-dialogs.tsx`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `./tsconfig.json`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible missing edges._
- **Should `media-exports.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04004817825956037 - nodes in this community are weakly interconnected._
- **Why does `AuthenticatedUser` connect `AuthenticatedUser` to `media-exports.service.ts`, `expenses.service.ts`, `MemberInvitesService`, `mongoose`, `AuthenticatedUser`, `sessions.service.ts`, `moderation.service.ts`, `create-task.dto.ts`, `albums.service.ts`, `@nestjs/swagger`, `TextLineField`, `mongoose`, `uploads.service.ts`, `website.controller.ts`, `auth.service.ts`, `.create`, `guest-reminders.service.ts`, `TasksService`, `MediaExportsService`, `auth.controller.ts`, `albums.controller.ts`, `slug.ts`, `.create`, `.require`, `PhotosController`, `.complete`, `team.service.ts`, `member-invites.service.ts`, `GuestRemindersService`, `.create`, `Public`, `upload-links.controller.ts`, `ApiDataResponse`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Should `builder.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10158730158730159 - nodes in this community are weakly interconnected._
- **Why does `Header()` connect `public-gallery.controller.ts` to `Header`, `site.ts`, `guests/server.tsx`, `expenses.service.ts`, `themed-site.tsx`, `PhotosController`, `ApiDataResponse`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Should `ref_vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.037569772434521254 - nodes in this community are weakly interconnected._