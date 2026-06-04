# HUManity IOP — Combined Prompt: Health & Nutrition + Library + Automation/Calendar

Single Claude Code prompt covering former Prompts 3, 4 and 5. Run it after Prompt 0–2.
One migration, one build, one verification at the end — no testing between sub-parts.

```text
Continue in the existing HUManity IOP repo (backend = Express + Prisma + Postgres; frontend = Next.js
App Router + shadcn/ui). Read AGENTS.md first (this Next.js has breaking changes — consult
node_modules/next/dist/docs/ before frontend code). Match existing conventions exactly: services in
backend/src/services, routes in backend/src/routes, cron in backend/src/jobs (mirror compliance.job.ts),
notifications via notification.service.ts (in-app + WhatsApp mirror), WhatsApp via whatsapp.service.ts
(safe no-op until creds set), IST date handling via backend/src/lib/datetime.ts (parseISTDate),
child growth via child.service.ts addGrowthRecord (already computes BMI), frontend labels in
frontend/src/lib/labels.ts, axios in frontend/src/lib/api.ts, nav in
frontend/src/app/(dashboard)/layout.tsx. Reuse Opportunity + EventRegistration for events, and the
ProgrammeAssignment / SessionFeedback / RecurringSeries models added in the foundation step.

Build THREE things in one pass — Health & Nutrition, Library Project, and the shared automation/
calendar layer — then do ONE migration + build + verification at the very end. Do not test between parts.

============================================================
PART A — HEALTH & NUTRITION (Programme P4_HEALTH_NUTRITION)
============================================================
Domain: (a) quarterly health checkup for children (height/weight/BMI via existing HealthGrowth, plus
vaccinations/illnesses); (b) monthly awareness activity — one activity in one CCI per month, rotating
CCIs. 5 dedicated volunteers (ProgrammeAssignment teamRole=DEDICATED); any active volunteer may also
sign up for weekend activities via normal Opportunity registration.

- Prisma: enum HealthEventType { QUARTERLY_CHECKUP MONTHLY_AWARENESS }; add nullable
  healthEventType HealthEventType? to Opportunity (additive only).
- Service backend/src/services/health.service.ts:
    createQuarterlyCheckups() / createMonthlyAwareness(): generate Opportunity rows from the QUARTERLY /
      MONTHLY RecurringSeries, tag healthEventType, rotate the CCI for monthly awareness across active
      CCIs, idempotent per (programmeArea, date, cciId).
    recordCheckupMeasurements(opportunityId, [{childId, heightCm, weightKg, vaccinations?, illness?}]):
      bulk-write HealthGrowth via child.service.addGrowthRecord (reuse it; it computes BMI), optionally
      vaccinations/illnesses via the existing helpers.
    getHealthDashboard(): per-CCI last-checkup date, # children measured this quarter, BMI outliers,
      upcoming awareness activity.
- Routes backend/src/routes/health.ts (mount /api/health): GET /dashboard;
  POST /checkups/:opportunityId/measurements; GET /team and POST/DELETE team mgmt (managers only).
- Frontend: nav "Health" (icon HeartPulse) for SUPER_ADMIN, PROGRAM_MANAGER, CCI_MANAGER. Page
  frontend/src/app/(dashboard)/health/page.tsx: dedicated-team panel (the 5), upcoming checkups &
  awareness activities, per-CCI checkup-status table, and a checkup measurement-entry grid (child rows:
  height, weight, auto BMI) writing HealthGrowth.
- Seed: dedicated team of up to 5 (ProgrammeAssignment), one upcoming quarterly checkup Opportunity and
  one monthly awareness Opportunity at seeded CCIs. Idempotent upsert like the existing seed.

============================================================
PART B — LIBRARY PROJECT (Programme P5_LIBRARY)
============================================================
Domain: monthly/bimonthly reading activities; Pratham books; volunteers monitor each child's reading
LEVEL over time and leave feedback; 5 dedicated volunteers (ProgrammeAssignment teamRole=DEDICATED).

- Prisma:
    enum ReadingLevel { BEGINNER LETTER WORD PARAGRAPH STORY }   // Pratham/ASER ladder
    model ReadingAssessment {
      id String @id @default(cuid())
      childId String
      child Child @relation(fields: [childId], references: [id])
      opportunityId String?
      date DateTime
      level ReadingLevel
      bookTitle String?
      prathamGroup String?
      assessedById String
      notes String?
      createdAt DateTime @default(now())
    }
    Add Child.readingAssessments ReadingAssessment[].
- Service backend/src/services/library.service.ts: createLibraryActivities() (generate Opportunity rows
  from MONTHLY/BIMONTHLY RecurringSeries); recordAssessment(...); getReadingProgress(cciId?) (per child
  latest level + level history/trend; CCI-level distribution across the 5 levels).
- Routes backend/src/routes/library.ts (mount /api/library): GET /progress?cciId=;
  POST /assessments; GET /team and team mgmt.
- Frontend: nav "Library" (icon Library) for SUPER_ADMIN, PROGRAM_MANAGER, CCI_MANAGER, VOLUNTEER. Page
  frontend/src/app/(dashboard)/library/page.tsx: reading-level distribution bars (BEGINNER..STORY),
  dedicated-team panel, upcoming activities, per-child assessment-entry form (child + level + book +
  notes), and a child reading-level history timeline. Add ordered ReadingLevel labels/options to labels.ts.
- Seed: dedicated team of up to 5, one upcoming library Opportunity, a few ReadingAssessment rows.

============================================================
PART C — AUTOMATION, CALENDAR, GOOGLE MEET
============================================================
- Scheduler job backend/src/jobs/schedule.job.ts (start from server.ts next to startComplianceJob),
  daily ~06:00 IST: materialise next 14 days by calling
  education.service.materializeUpcomingClassSessions(), program.service.createSundaySessionsFromSeries()
  (alternate SEL/DLAI Sundays), health.service.createQuarterlyCheckups() + createMonthlyAwareness(),
  library.service.createLibraryActivities(); and expire OPEN SubstitutionRequests whose class date passed.
- Reminder job backend/src/jobs/reminders.job.ts (start from server.ts), hourly: for ClassSessions and
  Opportunities starting in ~24h and ~2h, send CLASS_REMINDER / SESSION_REMINDER via createNotification
  (auto-mirrors to WhatsApp), including the Meet link for online classes. Education nudges: class starts
  within ~3h with no lesson plan -> LESSON_PLAN_DUE; class finished >2h ago with no feedback ->
  FEEDBACK_DUE. De-dupe so each nudge sends once.
- Google Calendar + Meet: backend/src/services/googleCalendar.service.ts using the SAME safe-no-op
  pattern as whatsapp.service.ts (activate only when env set, else log once and return). Add to
  .env.example: GOOGLE_CALENDAR_ENABLED, GOOGLE_SERVICE_ACCOUNT_JSON (or GOOGLE_CLIENT_EMAIL +
  GOOGLE_PRIVATE_KEY), GOOGLE_CALENDAR_ID, GOOGLE_IMPERSONATE_SUBJECT. upsertEventForClassSession() /
  upsertEventForOpportunity(): create/update event (start/end in IST, attendees = assigned/registered
  volunteer emails, conferenceData for an auto Meet link), persist the returned link onto
  ClassSession.meetLink / Opportunity.meetLink (add nullable calendarEventId + meetLink to Opportunity if
  not already present). If Meet auto-create isn't available (no Workspace delegation), fall back to the
  section's static meetLink. Call best-effort from the scheduler job — never block.
- Web Push (optional, behind VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT env; no-op if unset): a
  PushSubscription model keyed to userId, a save-subscription endpoint, and sendPush() called alongside
  createNotification; frontend registers a service worker and subscribes when notifications are enabled.
  If this balloons scope, stub the model + service with a TODO and move on — do NOT block the rest.
- My Calendar frontend/src/app/(dashboard)/calendar/page.tsx, nav "My Calendar" (icon CalendarDays) for
  VOLUNTEER, PROGRAM_MANAGER, SUPER_ADMIN: agenda list of the volunteer's upcoming ClassSessions (Join
  Meet) + registered Opportunities, with plan/feedback status chips. Pull from /api/classes/schedule/me
  and the volunteer's EventRegistrations.
- Dashboard: add per-programme summary tiles to the existing dashboard (sessions this week per program,
  pending lesson plans, pending feedback, open substitution requests, reading-level snapshot, upcoming
  health checkup) reusing existing dashboard route/service patterns.

============================================================
FINALISE (one time only)
============================================================
Run `npx prisma migrate dev --name health_library_automation` once for all of the above, then
`npm run build` in backend and frontend and fix all type errors. Add/extend jest tests for
health BMI capture, library reading-level progress, scheduler date generation, and reminder nudge
de-dup. Do a single end-to-end smoke check: a health checkup records measurements onto a child's
HealthGrowth history; a library assessment updates the child's latest level and the CCI distribution;
the scheduler materialises upcoming sessions; My Calendar shows upcoming items with Meet links; a
reminder notification is created (WhatsApp mirror attempted if creds set). Summarise new models,
endpoints, files, env vars, and anything stubbed (push / Google Meet if no Workspace).
```
