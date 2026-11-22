# Graph Report - my-marriage  (2026-11-22)

## Corpus Check
- 496 files · ~403,889 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 2, .css 1)

## Summary
- 3726 nodes · 11802 edges · 149 communities (106 shown, 43 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 328 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c14d96e8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.controller.ts
- FormAlert
- builder.tsx
- ref_vitest
- guests.e2e-spec.ts
- auth.spec.ts
- member-invites.controller.ts
- proxy.ts
- guest-access.service.ts
- compilerOptions
- ExpensesController
- vendor-directory.tsx
- Accounts
- with
- GuestsController
- guest.dto.ts
- AuthenticatedUser
- outbox-relay.ts
- auth-email.composer.ts
- event-form.test.tsx
- web/package.json
- create-task.dto.ts
- copy.ts
- scripts
- devDependencies
- routes.ts
- events.service.ts
- events/server.tsx
- website-images.service.ts
- WeddingDto
- catalog
- website.service.ts
- healthcheck
- weddings.service.ts
- contracts/package.json
- website.module.ts
- UpdateWebsiteDto
- guest-directory.tsx
- .create
- wedding-access.service.ts
- vendors.service.ts
- tasks/server.tsx
- rsvp-page.tsx
- wedding-details-form.test.tsx
- compilerOptions
- guests.controller.ts
- .answer
- @nestjs/mongoose
- Public
- themed-site.tsx
- rsvp-page.tsx
- .create
- nest-cli.json
- tsconfig.build.json
- public-website.service.ts
- IndexCheck
- vendors/server.tsx
- schema.d.ts
- workspace-shell.tsx
- .create
- routes.ts
- auth.service.ts
- health.controller.ts
- WebsiteService
- compilerOptions
- guest-access.controller.ts
- @nestjs/common
- @nestjs/swagger
- @testing-library/react
- event-card.tsx
- email-delivery.handler.ts
- GuestForm
- migrations.ts
- contracts/tsconfig.json
- tracing.ts
- ImportCommitDto
- expenses/server.tsx
- [slug]/page.tsx
- rsvp-theme.ts
- networkFailure
- RsvpPatchDto
- event-browser.tsx
- index.ts
- auth.decorators.ts
- expenses.controller.ts
- local-upload.controller.ts
- password-policy.ts
- pending-invitations.tsx
- api/eslint.config.mjs
- EventBrief
- LocalObjectStorage
- vendors/input.ts
- dependencies
- site-footer.tsx
- tasks/input.ts
- Vendor
- scripts
- events/input.ts
- validation.test.ts
- @vitejs/plugin-react
- ProbeDto
- TasksService
- VenueDto
- vendor-form.test.tsx
- configure-app.ts
- site.ts
- modules/auth/session-cookie.ts
- WebsiteService
- ledger-dialogs.tsx
- scripts
- legal-document.tsx
- expenses.service.ts
- ComposedEmail
- VerifiedProbeController
- EventActions
- pending-invitations.test.tsx
- .events
- member-invites.service.ts
- preview-tabs.test.tsx
- csv.ts
- ProbeController
- icon.tsx

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 174 edges
2. `AuthenticatedUser` - 147 edges
3. `@nestjs/common` - 121 edges
4. `networkFailure()` - 92 edges
5. `toFailure()` - 89 edges
6. `react` - 88 edges
7. `@nestjs/mongoose` - 82 edges
8. `ApiDataResponse()` - 81 edges
9. `mongoose` - 80 edges
10. `Traced()` - 76 edges

## Surprising Connections (you probably didn't know these)
- `signOut()` --calls--> `goTo()`  [EXTRACTED]
  apps/web/src/components/auth/sign-out-button.tsx → apps/web/src/components/auth/hooks.ts
- `renderEdit()` --calls--> `EventForm()`  [EXTRACTED]
  apps/web/src/components/events/event-form.test.tsx → apps/web/src/components/events/event-form.tsx
- `renderForm()` --calls--> `EventForm()`  [EXTRACTED]
  apps/web/src/components/events/event-form.test.tsx → apps/web/src/components/events/event-form.tsx
- `commit()` --indirect_call--> `rows()`  [INFERRED]
  apps/web/src/components/guests/guest-transfer.tsx → apps/web/src/components/vendors/vendor-directory.test.tsx
- `renderForm()` --calls--> `VendorForm()`  [EXTRACTED]
  apps/web/src/components/vendors/vendor-form.test.tsx → apps/web/src/components/vendors/vendor-form.tsx

## Import Cycles
- None detected.

## Communities (149 total, 43 thin omitted)

### Community 0 - "auth.controller.ts"
Cohesion: 0.26
Nodes (12): CurrentPasswordField(), DisplayNameField(), EmailField(), LinkTokenField(), NewPasswordField(), trim, ForgotPasswordDto, LoginDto (+4 more)

### Community 1 - "FormAlert"
Cohesion: 0.08
Nodes (70): goTo, post, ForgotPasswordForm(), goTo(), useFocusFirstProblem(), useLinkToken(), alertFor(), LoginForm() (+62 more)

### Community 2 - "builder.tsx"
Cohesion: 0.10
Nodes (28): CEREMONY_ICON_TONES, Draft, draftOf(), FaqButton(), LIMITS, moved(), ReadinessRow(), same() (+20 more)

### Community 3 - "ref_vitest"
Cohesion: 0.03
Nodes (74): AuthActionToken, AuthActionTokenSchema, AuthSession, AuthSessionDocument, AuthSessionSchema, User, USER_STATUSES, UserDocument (+66 more)

### Community 4 - "guests.e2e-spec.ts"
Cohesion: 0.16
Nodes (18): added(), answer(), DetailBody, errorOf(), eventIn(), fieldsOf(), GuestBody, InvitationBody (+10 more)

### Community 5 - "auth.spec.ts"
Cohesion: 0.09
Nodes (48): app, document, target, children, databaseName, mailDir, migrate, mongoUri (+40 more)

### Community 6 - "member-invites.controller.ts"
Cohesion: 0.09
Nodes (11): CreateMemberInviteDto, INVITABLE_ROLES, InviteTokenDto, MemberInviteDto, MyInviteDto, MemberInvitesController, inviteNotFound(), isExpired() (+3 more)

### Community 7 - "proxy.ts"
Cohesion: 0.21
Nodes (11): apiClientAsVisitor(), FORWARDED_HEADERS, SESSION_COOKIE, landingWedding(), config, proxy(), Session, sessionOf() (+3 more)

### Community 8 - "guest-access.service.ts"
Cohesion: 0.12
Nodes (17): GuestAccessService, StoredInvitation, countTooLarge(), dailyEmailLimit(), guestRemindersOff(), invitationLinkOff(), invitationNotFound(), invitationNotShared() (+9 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, emitDecoratorMetadata, experimentalDecorators, incremental, module, moduleResolution, outDir (+11 more)

### Community 11 - "vendor-directory.tsx"
Cohesion: 0.10
Nodes (28): avatarOf(), AVATARS, NoResults(), NotAdded(), del, events, refresh, replaceState (+20 more)

### Community 13 - "with"
Cohesion: 0.07
Nodes (33): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, API_ORIGIN, jobs (+25 more)

### Community 14 - "GuestsController"
Cohesion: 0.23
Nodes (4): CurrentUser, GuestDetailDto, GuestsController, ApiDataResponse()

### Community 15 - "guest.dto.ts"
Cohesion: 0.13
Nodes (18): EventRsvpTotalsDto, GuestDetailInvitationDto, GuestDto, GuestEmailDto, GuestInvitationDto, GuestTotalsDto, ImportRowResultDto, LINK_STATES (+10 more)

### Community 16 - "AuthenticatedUser"
Cohesion: 0.08
Nodes (18): SignedIn, AuthenticatedUser, GuestLinkDto, ImportPreviewResultDto, guestNotFound(), distinctIds(), folded(), GuestsService (+10 more)

### Community 17 - "outbox-relay.ts"
Cohesion: 0.08
Nodes (15): OUTBOX_STATES, OutboxEvent, OutboxEventSchema, OutboxState, DEFAULT_OUTBOX_RETRY, OUTBOX_HANDLERS, OUTBOX_RETRY, OutboxHandler (+7 more)

### Community 18 - "auth-email.composer.ts"
Cohesion: 0.11
Nodes (19): AccountsService, AuthEmailComposer, passwordChangedMessage(), passwordResetMessage(), verifyEmailMessage(), GuestInviteComposer, GuestReminderComposer, ComposedEmail (+11 more)

### Community 19 - "event-form.test.tsx"
Cohesion: 0.17
Nodes (8): haldi, onCancel, onSaved, patch, post, refresh, renderEdit(), renderForm()

### Community 20 - "web/package.json"
Cohesion: 0.09
Nodes (30): devDependencies, @axe-core/playwright@^4.14.0, eslint@catalog:, eslint-config-prettier@catalog:, jsdom@^31.0.1, @playwright/test@^1.65.1, tailwindcss@4.3.5, @tailwindcss/turbopack@4.3.5 (+22 more)

### Community 21 - "create-task.dto.ts"
Cohesion: 0.11
Nodes (32): CreateTaskDto, PRIORITY_MESSAGE, STATE_MESSAGE, OptionalChoiceField(), OptionalIdField(), OptionalIdOrNoneField(), ListTasksQueryDto, TASK_SORTS (+24 more)

### Community 22 - "copy.ts"
Cohesion: 0.06
Nodes (65): HomePage(), metadata, Celebrations(), CEREMONY_TONE, Closing(), CARD_VISUALS, GuestExperience(), PhotosSnippet() (+57 more)

### Community 23 - "scripts"
Cohesion: 0.07
Nodes (28): description, devDependencies, prettier@catalog:, engines, node, pnpm, name, packageManager (+20 more)

### Community 24 - "devDependencies"
Cohesion: 0.09
Nodes (23): devDependencies, eslint@catalog:, eslint-config-prettier@catalog:, @nestjs/cli@^12.0.13, @nestjs/schematics@^12.0.13, @nestjs/testing@^12.5.0, supertest@^7.3.2, @types/express@^5.0.6 (+15 more)

### Community 25 - "routes.ts"
Cohesion: 0.17
Nodes (17): ForgotPasswordPage(), metadata, LoginPage(), metadata, metadata, ResetPasswordPage(), metadata, SignupPage() (+9 more)

### Community 26 - "events.service.ts"
Cohesion: 0.07
Nodes (38): CreateEventDto, EventVenueInputDto, EventDto, EventLivestreamDto, EventVenueDto, OptionalLineField(), OptionalLinkField(), OptionalTimeField() (+30 more)

### Community 27 - "events/server.tsx"
Cohesion: 0.17
Nodes (20): EventsPage(), metadata, AddEventButton(), EventsEmpty(), EventsLoading(), EventsOverview(), EventsSection(), EventStats() (+12 more)

### Community 28 - "website-images.service.ts"
Cohesion: 0.11
Nodes (14): imageNotFound(), uploadRejected(), websiteNotFound(), websiteNotReady(), EXTENSIONS, imageTypeOf(), StoredAsset, WebsiteImagesService (+6 more)

### Community 29 - "WeddingDto"
Cohesion: 0.13
Nodes (5): MemberListDto, WeddingDto, toWeddingDto(), WeddingsController, WeddingsService

### Community 30 - "catalog"
Cohesion: 0.09
Nodes (21): allowBuilds, msgpackr-extract, @scarf/scarf, eslint-plugin-import>eslint, eslint-plugin-jsx-a11y>eslint, eslint-plugin-react>eslint, openapi-typescript>typescript, catalog (+13 more)

### Community 31 - "website.service.ts"
Cohesion: 0.15
Nodes (19): CoverUploadDto, READINESS_KEYS, ReadinessCheckDto, ReadinessKey, SlugAvailabilityDto, WebsiteReadinessDto, contentShape, WebsiteConfigDocument (+11 more)

### Community 32 - "healthcheck"
Cohesion: 0.11
Nodes (20): interval, retries, start_period, test, timeout, command, healthcheck, image (+12 more)

### Community 33 - "weddings.service.ts"
Cohesion: 0.10
Nodes (23): CreateWeddingDto, normalizeText, OptionalDateField(), UpdateWeddingDto, WEDDING_QUOTA_BYTES, isFallbackBase(), isValidSlug(), SLUG_LIMITS (+15 more)

### Community 34 - "contracts/package.json"
Cohesion: 0.14
Nodes (15): description, devDependencies, openapi-typescript@^7.13.0, typescript@catalog:, exports, ./openapi.json, typescript, name (+7 more)

### Community 35 - "website.module.ts"
Cohesion: 0.10
Nodes (8): FILE_ASSET_KINDS, FILE_ASSET_STATES, FileAsset, FileAssetDocument, FileAssetSchema, WebsiteConfig, WebsiteHttpModule, WebsiteModule

### Community 36 - "UpdateWebsiteDto"
Cohesion: 0.13
Nodes (7): blockText, CoverUploadRequestDto, lineText, PublishWebsiteDto, UpdateWebsiteDto, WebsiteContentInputDto, WebsiteFaqInputDto

### Community 37 - "guest-directory.tsx"
Cohesion: 0.07
Nodes (63): GuestsPage(), metadata, GuestDetails(), moment(), Filter(), GuestDirectory(), change(), GuestRow() (+55 more)

### Community 39 - "wedding-access.service.ts"
Cohesion: 0.06
Nodes (28): ACTIVE_OWNED_INDEX, MEMBERSHIP_STATUSES, MembershipStatus, WeddingMembership, WeddingMembershipDocument, WeddingMembershipSchema, Wedding, WeddingDocument (+20 more)

### Community 40 - "vendors.service.ts"
Cohesion: 0.16
Nodes (27): OptionalTextBlockField(), CreateExpenseDto, UpdateExpenseDto, PartySizeField(), CreateGuestDto, IMPORT_MODES, UpdateGuestDto, GUEST_LIMITS (+19 more)

### Community 41 - "tasks/server.tsx"
Cohesion: 0.06
Nodes (52): metadata, TasksPage(), NoResults(), SearchParams, Stat(), TaskPanel(), TasksEmpty(), TasksLoading() (+44 more)

### Community 42 - "rsvp-page.tsx"
Cohesion: 0.11
Nodes (18): Answer, answerOf(), Choice, ChoiceGroup(), CHOICES, Counter(), Notice, RsvpForm() (+10 more)

### Community 43 - "wedding-details-form.test.tsx"
Cohesion: 0.25
Nodes (5): fill(), fillRequired(), goTo, patch, post

### Community 44 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, noFallthroughCasesInSwitch, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+3 more)

### Community 45 - "guests.controller.ts"
Cohesion: 0.07
Nodes (15): GuestListDto, ImportCommitResultDto, ReminderPreviewDto, ReminderResultDto, ReminderScopeDto, ReminderSettingsDto, ReminderSkipsDto, SendReminderDto (+7 more)

### Community 47 - "@nestjs/mongoose"
Cohesion: 0.03
Nodes (54): AuthModule, EventsModule, ExpensesModule, ExpenseDocument, ExpenseSchema, GuestLinks, DEVELOPMENT_LINK_SECRET, GUEST_LIST_LIMIT (+46 more)

### Community 48 - "Public"
Cohesion: 0.30
Nodes (3): AuthController, Public(), readSessionCookie()

### Community 49 - "themed-site.tsx"
Cohesion: 0.18
Nodes (21): NO_CELEBRATIONS, PRIVATE_REPLY_NOTE, RSVP_CTA, SECTION_ANCHORS, SectionId, sectionsOf(), byDay(), daysToGo() (+13 more)

### Community 51 - "rsvp-page.tsx"
Cohesion: 0.18
Nodes (18): Invitation(), InvitationPage(), metadata, Invitation(), invitationKey(), Phase, PrivateNote(), RsvpOpening() (+10 more)

### Community 54 - "nest-cli.json"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 55 - "tsconfig.build.json"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, exclude, extends, include, ./tsconfig.json

### Community 56 - "public-website.service.ts"
Cohesion: 0.19
Nodes (12): PublicDateRangeDto, PublicEventDto, PublicEventListDto, PublicWebsiteDto, WebsiteContentDto, WebsiteFaqDto, PublicWebsiteService, publicCoverUrl() (+4 more)

### Community 58 - "vendors/server.tsx"
Cohesion: 0.18
Nodes (19): metadata, VendorsPage(), SearchParams, Stat(), VendorsEmpty(), VendorsLoading(), VendorsSection(), VendorStats() (+11 more)

### Community 59 - "schema.d.ts"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 60 - "workspace-shell.tsx"
Cohesion: 0.11
Nodes (29): metadata, OnboardingLayout(), metadata, WeddingWorkspaceLayout(), SignOutButton(), signOut(), AccountChip(), LogoMark() (+21 more)

### Community 62 - "routes.ts"
Cohesion: 0.19
Nodes (19): PublicLayout(), renderHome(), AccountHome, accountHome, currentUserOrNull, InboxPanel(), HeaderAccount(), HeaderAccountPlaceholder() (+11 more)

### Community 63 - "auth.service.ts"
Cohesion: 0.05
Nodes (29): ActionTokensService, ClientContext, invalidLink(), rejectPassword(), RATE_LIMITS, AuthService, invalidCredentials(), normalizeEmail() (+21 more)

### Community 66 - "health.controller.ts"
Cohesion: 0.16
Nodes (5): HealthController, noTerminusDocs, toDto(), HealthDto, RedisHealthIndicator

### Community 67 - "WebsiteService"
Cohesion: 0.21
Nodes (5): WebsiteDto, websiteChanged(), draftCoverUrl(), isDuplicateKey(), WebsiteService

### Community 68 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowJs, incremental, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 69 - "guest-access.controller.ts"
Cohesion: 0.24
Nodes (11): CurrentGuest, GuestContext, clearGuestCookie(), cookieOptions(), GUEST_COOKIE, readGuestCookie(), setGuestCookie(), guestSessionMissing() (+3 more)

### Community 70 - "@nestjs/common"
Cohesion: 0.03
Nodes (56): dependencies, @aws-sdk/client-s3@^3.1175.0, @aws-sdk/s3-presigned-post@^3.1175.0, bullmq@^6.7.7, class-transformer@^0.5.1, class-validator@^0.15.1, ioredis@^6.0.0, mongoose@^9.12.1 (+48 more)

### Community 71 - "@nestjs/swagger"
Cohesion: 0.24
Nodes (8): InvitePreviewDto, INVITE_EMAIL_STATUSES, INVITE_VIEW_STATUSES, MEMBERSHIP_ROLES, MembershipRole, WEDDING_STATUSES, WeddingStatus, @nestjs/swagger

### Community 72 - "@testing-library/react"
Cohesion: 0.10
Nodes (13): base, events, post, INVITE_TOKEN_KEY, answer(), get, me, post (+5 more)

### Community 73 - "event-card.tsx"
Cohesion: 0.22
Nodes (14): EventCard(), STATES, TaskCounts, TaskTiles(), TONES, WeddingEvent, missingDetails(), EVENT_PRESETS (+6 more)

### Community 74 - "email-delivery.handler.ts"
Cohesion: 0.06
Nodes (42): ACTIVE, CheckedRow, StoredGuest, StoredInvitation, StoredToken, EMAIL_COMPOSERS, EmailDeliveryHandler, mailTransportProvider (+34 more)

### Community 76 - "GuestForm"
Cohesion: 0.20
Nodes (9): GuestForm(), fail(), submit(), GUEST_INPUT_LIMITS, GuestInput, guestInputErrors(), isEmail(), isPhone() (+1 more)

### Community 77 - "migrations.ts"
Cohesion: 0.13
Nodes (14): eventIndexes, expenseEvents, expenseIndexes, fileAssetIndexes, guestIndexes, identityIndexes, inviteIndexes, messagingIndexes (+6 more)

### Community 79 - "contracts/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, noEmit, extends, include, ../../tsconfig.base.json

### Community 80 - "tracing.ts"
Cohesion: 0.04
Nodes (51): @nestjs/core@^12.5.0, crossFieldProblems(), DEFAULT_TRACE_MODE, Env, ENV_KEYS, MAIL_TRANSPORTS, MailTransportName, valid (+43 more)

### Community 81 - "ImportCommitDto"
Cohesion: 0.23
Nodes (5): CreateLinkDto, ImportCommitDto, ImportPreviewDto, ImportRowDto, InvitationSelectionDto

### Community 82 - "expenses/server.tsx"
Cohesion: 0.08
Nodes (42): DashboardPage(), metadata, OpenWorkspace(), metadata, WebsitePreviewPage(), metadata, WebsitePage(), onboardingVisitor() (+34 more)

### Community 83 - "[slug]/page.tsx"
Cohesion: 0.23
Nodes (9): metadata, PublicWeddingPage(), PublishedSite(), cinzel, jakarta, mono, rsvpFonts, ForwardInvitationLink() (+1 more)

### Community 84 - "rsvp-theme.ts"
Cohesion: 0.18
Nodes (12): modern, royal, RSVP_SKINS, RsvpSkin, RsvpThemeId, traditional, modern, royal (+4 more)

### Community 85 - "networkFailure"
Cohesion: 0.06
Nodes (59): AcceptInvitationPage(), metadata, submit(), submit(), DeleteEventDialog(), confirm(), send(), submit() (+51 more)

### Community 87 - "RsvpPatchDto"
Cohesion: 0.17
Nodes (4): ExchangeTokenDto, GUEST_RSVP_CHOICES, GuestRsvpChoice, RsvpPatchDto

### Community 88 - "event-browser.tsx"
Cohesion: 0.23
Nodes (8): EventBrowser(), EventItem, matches(), Tab, TaskCounts, items, WeddingEvent, isUpcoming()

### Community 89 - "index.ts"
Cohesion: 0.12
Nodes (15): WeddingEvent, DrawerContext, EventDrawerApi, useEventDrawer(), WeddingEvent, Audience, OFFSETS, isUpcoming() (+7 more)

### Community 90 - "auth.decorators.ts"
Cohesion: 0.20
Nodes (6): ALLOW_UNVERIFIED_KEY, AllowUnverified(), AuthenticatedRequest, PUBLIC_KEY, MeDto, Authentication

### Community 91 - "expenses.controller.ts"
Cohesion: 0.22
Nodes (16): CATEGORY_EMPTY, TITLE_EMPTY, VENDOR_MESSAGE, ChoiceField(), DayField(), IdField(), isCalendarDate(), MoneyPaiseField() (+8 more)

### Community 93 - "password-policy.ts"
Cohesion: 0.24
Nodes (9): COMMON_BASE_WORDS, COMMON_PASSWORDS, isCommon(), LEET, lettersOf(), PASSWORD_MAX_LENGTH, PASSWORD_MESSAGES, PASSWORD_MIN_LENGTH (+1 more)

### Community 94 - "pending-invitations.tsx"
Cohesion: 0.09
Nodes (44): CreateWeddingPage(), metadata, Step(), InvitePartnerPage(), metadata, metadata, OverviewPage(), OverviewIntro() (+36 more)

### Community 95 - "api/eslint.config.mjs"
Cohesion: 0.22
Nodes (6): @eslint/js@catalog:, typescript-eslint@catalog:, eslint-config-next@16.4.6, eslint-config-next, @eslint/js, typescript-eslint

### Community 96 - "EventBrief"
Cohesion: 0.47
Nodes (6): EventBrief, addDays(), dueOffsets(), isUpcoming(), localNow(), haldi

### Community 98 - "LocalObjectStorage"
Cohesion: 0.14
Nodes (3): LocalObjectStorage, notFound(), S3ObjectStorage

### Community 99 - "vendors/input.ts"
Cohesion: 0.42
Nodes (7): isEmail(), isPhone(), empty, tooLong(), VENDOR_INPUT_LIMITS, VendorInput, vendorInputErrors()

### Community 101 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, @my-marriage/contracts@workspace:*, next@16.4.6, openapi-fetch@^0.17.0, react@19.3.1, react-dom@19.3.1, @my-marriage/contracts, openapi-fetch (+1 more)

### Community 102 - "site-footer.tsx"
Cohesion: 0.15
Nodes (15): nextConfig, securityHeaders, AppLayout(), metadata, AuthLayout(), metadata, manrope, metadata (+7 more)

### Community 103 - "tasks/input.ts"
Cohesion: 0.38
Nodes (5): TASK_INPUT_LIMITS, TaskInput, taskInputErrors(), blank, tooLong()

### Community 106 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, start, test, test:browser, typecheck

### Community 107 - "events/input.ts"
Cohesion: 0.36
Nodes (6): EVENT_INPUT_LIMITS, EventInput, eventInputErrors(), blank, timeZoneChoices(), tooLong()

### Community 108 - "validation.test.ts"
Cohesion: 0.60
Nodes (3): OUTSIDE_INDIA, WEDDING_STATES, valid

### Community 111 - "TasksService"
Cohesion: 0.11
Nodes (9): WeddingTask, taskNotFound(), timeWithoutDay(), unknownAssignee(), unknownEvent(), Context, literal(), TasksService (+1 more)

### Community 114 - "vendor-form.test.tsx"
Cohesion: 0.17
Nodes (10): events, field(), onCancel, onSaved, patch, post, refresh, renderForm() (+2 more)

### Community 115 - "configure-app.ts"
Cohesion: 0.06
Nodes (35): rxjs@^7.8.2, API_PREFIX, configureApp(), createOpenApiDocument(), ApiErrorDetailDto, ApiErrorDto, FieldErrorDto, ApiExceptionFilter (+27 more)

### Community 119 - "site.ts"
Cohesion: 0.17
Nodes (21): datesOf(), HeaderView, initials(), RsvpHeader(), RsvpHero(), CeremonyRow(), CoverImage(), Livestream() (+13 more)

### Community 120 - "modules/auth/session-cookie.ts"
Cohesion: 0.38
Nodes (4): clearSessionCookie(), cookieOptions(), SESSION_COOKIE, setSessionCookie()

### Community 122 - "ledger-dialogs.tsx"
Cohesion: 0.04
Nodes (99): ExpensesPage(), metadata, DeleteExpenseDialog(), ENTRY_ICONS, entryAmount(), entryCaption(), ExpenseDetails(), LinkChip() (+91 more)

### Community 124 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:migrate, dev, dev:worker, lint, openapi:export, start (+5 more)

### Community 125 - "legal-document.tsx"
Cohesion: 0.35
Nodes (7): metadata, PrivacyPage(), metadata, TermsPage(), LegalDocument(), LegalDocumentProps, readingContainer

### Community 134 - "expenses.service.ts"
Cohesion: 0.06
Nodes (47): EntryPersonDto, EXPENSE_STATUSES, ExpenseDetailDto, ExpenseDto, ExpenseEntryDto, ExpenseEventDto, ExpenseLedgerDto, ExpenseListDto (+39 more)

### Community 135 - "ComposedEmail"
Cohesion: 0.22
Nodes (17): answerNote(), C, card(), celebrationsOf(), eventLines(), eventRow(), eventTable(), guestInviteMessage() (+9 more)

### Community 142 - "EventActions"
Cohesion: 0.19
Nodes (10): EventActions(), confirmDelete(), del, event, openMenu(), refresh, renderActions(), EventDrawer() (+2 more)

### Community 143 - "pending-invitations.test.tsx"
Cohesion: 0.29
Nodes (6): failure(), goTo, invite, other, post, reply()

### Community 146 - "member-invites.service.ts"
Cohesion: 0.06
Nodes (28): RESET_PASSWORD_TTL_MS, SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, SESSION_TOUCH_MS, VERIFY_EMAIL_TTL_MS, NewSession, StoredInvite, INVITE_STATUSES (+20 more)

### Community 148 - "preview-tabs.test.tsx"
Cohesion: 0.29
Nodes (3): PreviewTab, PreviewTabs(), tabs

### Community 152 - "csv.ts"
Cohesion: 0.21
Nodes (16): ExportGuests(), download(), FORMAT, ImportGuests(), chosen(), Preview, Result, COLUMNS (+8 more)

### Community 160 - "icon.tsx"
Cohesion: 0.09
Nodes (31): EditTaskButton(), Mark(), QuickComplete(), STALE, patch, refresh, renderActions(), task (+23 more)

## Knowledge Gaps
- **5 isolated node(s):** `RFC-4180`, `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1151 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `auth.controller.ts`, `ref_vitest`, `expenses.service.ts`, `member-invites.controller.ts`, `guest-access.service.ts`, `AuthenticatedUser`, `outbox-relay.ts`, `auth-email.composer.ts`, `member-invites.service.ts`, `create-task.dto.ts`, `events.service.ts`, `website-images.service.ts`, `WeddingDto`, `website.service.ts`, `weddings.service.ts`, `website.module.ts`, `wedding-access.service.ts`, `vendors.service.ts`, `guests.controller.ts`, `@nestjs/mongoose`, `public-website.service.ts`, `auth.service.ts`, `health.controller.ts`, `guest-access.controller.ts`, `email-delivery.handler.ts`, `tracing.ts`, `auth.decorators.ts`, `expenses.controller.ts`, `local-upload.controller.ts`, `TasksService`, `configure-app.ts`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `./tsconfig.json`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible missing edges._
- **Should `FormAlert` be split into smaller, more focused modules?**
  _Cohesion score 0.08319055777650866 - nodes in this community are weakly interconnected._
- **Why does `AuthenticatedUser` connect `AuthenticatedUser` to `auth.controller.ts`, `expenses.service.ts`, `member-invites.controller.ts`, `ExpensesController`, `GuestsController`, `member-invites.service.ts`, `create-task.dto.ts`, `events.service.ts`, `WeddingDto`, `website.service.ts`, `weddings.service.ts`, `.create`, `wedding-access.service.ts`, `vendors.service.ts`, `guests.controller.ts`, `@nestjs/mongoose`, `.create`, `.create`, `auth.service.ts`, `WebsiteService`, `email-delivery.handler.ts`, `auth.decorators.ts`, `expenses.controller.ts`, `TasksService`, `WebsiteService`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `builder.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Why does `Traced()` connect `auth-email.composer.ts` to `ref_vitest`, `expenses.service.ts`, `member-invites.controller.ts`, `guest-access.service.ts`, `Accounts`, `AuthenticatedUser`, `outbox-relay.ts`, `member-invites.service.ts`, `create-task.dto.ts`, `events.service.ts`, `website-images.service.ts`, `WeddingDto`, `website.service.ts`, `weddings.service.ts`, `wedding-access.service.ts`, `vendors.service.ts`, `guests.controller.ts`, `@nestjs/mongoose`, `public-website.service.ts`, `auth.service.ts`, `WebsiteService`, `guest-access.controller.ts`, `@nestjs/common`, `email-delivery.handler.ts`, `tracing.ts`, `LocalObjectStorage`, `TasksService`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `ref_vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.03461578563236367 - nodes in this community are weakly interconnected._