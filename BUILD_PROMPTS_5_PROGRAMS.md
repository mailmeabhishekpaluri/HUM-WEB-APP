# HUManity IOP — 5-Program Integration: Claude Code Build Prompts

This document turns the operational brief for all five HUManity programs into a sequence of
copy-paste-ready prompts for **Claude Code, run from inside the `humanity-iop/` repo**.

It is written against the *actual* current codebase:

- **Backend:** Express + TypeScript + Prisma (PostgreSQL), services in `backend/src/services`,
  routes in `backend/src/routes`, cron jobs in `backend/src/jobs` (see `compliance.job.ts`),
  notifications via `notification.service.ts` (in-app + WhatsApp mirror + email),
  WhatsApp via `whatsapp.service.ts` (Meta Cloud API, already wired, no-op until creds set).
- **Frontend:** Next.js (App Router) + shadcn/ui + Tailwind, axios client in `frontend/src/lib/api.ts`,
  enum→label maps in `frontend/src/lib/labels.ts`, nav in `frontend/src/app/(dashboard)/layout.tsx`.
- **Reused primitives:** `Programme` enum (P1–P5 already defined), `Opportunity` + `EventRegistration`
  (generic event + signup + attendance), `VolunteerProfile`, `Child`, `ProgressNote`, `HealthGrowth`,
  `Vaccination`, `Illness`, `Notification` + `NotificationType`, RBAC + audit.

## How to use this file

Run the prompts **in order**. Each is self-contained and ends by telling Claude Code to run
`npx prisma migrate dev`, build, and smoke-test before you move on. Do **one prompt per Claude Code
session/commit** so migrations stay clean and reviewable.

```
Prompt 0 — Shared foundation (recurrence, sessions, feedback, dedicated teams, notif types)
Prompt 1 — Education Development Program (online classes, plans, feedback, attendance, substitutions)
Prompt 2 — SEL + Digital Literacy & AI (curriculum catalogue, alternate-Sunday sessions, 1:6 ratio, feedback)
Prompt 3 — Health & Nutrition (quarterly checkups, monthly awareness, dedicated team of 5)
Prompt 4 — Library Project (Pratham reading-level tracking, monthly/bimonthly activities, dedicated team of 5)
Prompt 5 — Automation + Calendar + Google Meet + verification (scheduler & reminder cron, My Calendar, Google Calendar sync)
```

---

## Architecture decisions (the "brainstorm" in one screen)

**The core gap:** today's `Opportunity` is a *one-off event*. All five programs are *recurring* with
fixed cadences and per-session artifacts (lesson plans, feedback, attendance, ratios). So the
integration adds one thin **recurrence/scheduling layer** plus per-program detail, and otherwise
**reuses** `Opportunity`/`EventRegistration` for on-ground sign-ups and attendance.

| Program | Cadence | Reuse | New |
|---|---|---|---|
| Education | Mon=Maths, Wed=Science, Fri=English × grades 8/9/10, online | — | `ClassSection`, `ClassSession`, `ClassEnrollment`, `ClassAttendance`, `SubstitutionRequest` |
| SEL | Alternate Sundays, 12-session curriculum, on-ground | `Opportunity`, `EventRegistration`, `ProgressNote` | `CurriculumItem` (12), `SessionFeedback`, ratio fields |
| Digital Literacy & AI | Alternate Sundays (opposite SEL), 4 modules, on-ground | `Opportunity`, `EventRegistration` | `CurriculumItem` (4 modules), `SessionFeedback` |
| Health & Nutrition | Quarterly checkup + monthly awareness, 1 CCI/month | `Opportunity`, `HealthGrowth`, `Vaccination`, `Illness` | `ProgrammeAssignment` (dedicated 5), checkup linkage |
| Library | Monthly/bimonthly reading activities | `Opportunity` | `ReadingAssessment` (Pratham levels), `ProgrammeAssignment` (dedicated 5) |

**Cross-cutting (Prompt 0 + 5):** `RecurringSeries` generator + `schedule.job` to materialise upcoming
sessions; `reminders.job` for T-24h / T-2h reminders and mandatory plan/feedback nudges (in-app +
WhatsApp + Google Calendar); `ProgrammeAssignment` for dedicated teams; `SessionFeedback` shared by the
on-ground programs; new `NotificationType`s; a **My Calendar** view per volunteer with the Google Meet
links; optional Google Calendar invite sync.

**Volunteer self-service is first-class:** volunteers must be able to submit a lesson plan *before*
each class, submit class feedback *after*, mark child attendance, raise/accept substitution requests,
see their schedule with Meet links, and get reminders. RBAC: `VOLUNTEER` can act on their own
classes/sessions; `PROGRAM_MANAGER`/`SUPER_ADMIN` configure series, sections, curriculum and teams.

**Notification channels chosen:** WhatsApp (via existing `whatsapp.service`), in-app + push, and Google
Calendar invites. Push is added as Web Push (VAPID) — optional, behind env flags, degrades to in-app.

---

# Prompt 0 — Shared foundation

> Copy everything in this block into Claude Code.

```text
You are working in the existing HUManity IOP monorepo (backend = Express + Prisma + Postgres;
frontend = Next.js App Router + shadcn/ui). Read AGENTS.md first — this Next.js version has
breaking changes, consult node_modules/next/dist/docs/ before writing frontend code. Match the
existing code style exactly: services in backend/src/services, routes in backend/src/routes,
cron in backend/src/jobs (mirror compliance.job.ts), notifications via notification.service.ts,
WhatsApp via whatsapp.service.ts, frontend enum labels in frontend/src/lib/labels.ts, API via
frontend/src/lib/api.ts. Do NOT overload the existing Opportunity model's meaning — extend it
additively.

GOAL: Build the shared scheduling/feedback/team foundation that all five programs will use.

1) Prisma schema (backend/prisma/schema.prisma) — ADD (do not remove anything):

   enum SessionCadence { WEEKLY_MWF ALTERNATE_SUNDAY MONTHLY BIMONTHLY QUARTERLY CUSTOM }
   enum SessionDeliveryMode { ONLINE ON_GROUND }
   enum DedicatedTeamRole { DEDICATED SUPPORT }

   model RecurringSeries {
     id            String              @id @default(cuid())
     title         String
     programmeArea Programme
     cadence       SessionCadence
     deliveryMode  SessionDeliveryMode @default(ON_GROUND)
     cciId         String?
     startDate     DateTime
     endDate       DateTime?
     defaultStartTime String            // "17:00" IST
     durationMinutes  Int    @default(60)
     requiredCount Int      @default(1)
     isActive      Boolean  @default(true)
     config        Json?    // cadence-specific (e.g. alternate-Sunday partner programme, MWF subject map)
     createdById   String
     createdAt     DateTime @default(now())
     updatedAt     DateTime @updatedAt
   }

   // Dedicated volunteer rosters (Health=5, Library=5; others can still volunteer ad hoc)
   model ProgrammeAssignment {
     id           String            @id @default(cuid())
     volunteerId  String
     volunteer    VolunteerProfile  @relation(fields: [volunteerId], references: [id])
     programme    Programme
     teamRole     DedicatedTeamRole @default(DEDICATED)
     assignedById String
     assignedAt   DateTime          @default(now())
     isActive     Boolean           @default(true)
     @@unique([volunteerId, programme])
   }

   // Per-session feedback for on-ground programs (SEL, DLAI, Health, Library).
   // Captures BOTH volunteer participation and child participation, per the brief.
   model SessionFeedback {
     id                          String   @id @default(cuid())
     opportunityId               String   @unique
     opportunity                 Opportunity @relation(fields: [opportunityId], references: [id])
     childrenPresent             Int?
     childrenEngaged             Int?
     childParticipationRating    Int?     // 1-5
     volunteerParticipationRating Int?    // 1-5
     volunteersPresent           Int?
     whatWentWell                String?
     challenges                  String?
     followUpNeeded              Boolean  @default(false)
     followUpNotes               String?
     submittedById               String
     createdAt                   DateTime @default(now())
     updatedAt                   DateTime @updatedAt
   }

   - Add the back-relations on VolunteerProfile (programmeAssignments ProgrammeAssignment[])
     and Opportunity (sessionFeedback SessionFeedback?).
   - Extend Opportunity additively with:
        deliveryMode      SessionDeliveryMode @default(ON_GROUND)
        curriculumItemId  String?
        recurringSeriesId String?
        studentCount      Int?
     (Keep all existing Opportunity fields and behaviour intact.)

2) NotificationType enum — ADD values:
     CLASS_REMINDER, SESSION_REMINDER, LESSON_PLAN_DUE, FEEDBACK_DUE,
     SUBSTITUTION_REQUESTED, SUBSTITUTION_FILLED, SESSION_ASSIGNED,
     READING_ASSESSMENT_DUE, HEALTH_CHECKUP_DUE
   Do not remove existing values.

3) Service: backend/src/services/scheduling.service.ts
   - generateSessionsForSeries(seriesId, untilDate): pure date logic that, given a RecurringSeries,
     returns the list of session datetimes it should have up to untilDate, honouring cadence:
       WEEKLY_MWF       -> Mon/Wed/Fri at defaultStartTime
       ALTERNATE_SUNDAY -> every other Sunday from startDate
       MONTHLY          -> same nth-day each month
       BIMONTHLY        -> every 2nd month
       QUARTERLY        -> every 3rd month
     All dates computed in Asia/Kolkata. Reuse parseISTDate / helpers in backend/src/lib/datetime.ts.
   - Do NOT materialise rows here yet (Education uses ClassSession, on-ground uses Opportunity);
     just expose the date-generation logic + a helper isAlternateSundayFor(programme, date).

4) Service: backend/src/services/team.service.ts
   - assignToProgramme(volunteerId, programme, teamRole), removeAssignment, listProgrammeTeam(programme),
     and ratioStatus(studentCount, volunteerCount) -> { required: ceil(students/6), met: boolean }.
     The 1:6 ratio helper is reused by SEL/DLAI later.

5) Routes:
   - backend/src/routes/series.ts  (CRUD for RecurringSeries; PROGRAM_MANAGER/SUPER_ADMIN only)
   - backend/src/routes/teams.ts   (manage ProgrammeAssignment; GET team by programme)
   - Add session-feedback endpoints under the existing opportunities router:
       POST /api/opportunities/:id/feedback   (create/update SessionFeedback; volunteer or manager)
       GET  /api/opportunities/:id/feedback
   - Register series + teams routers in backend/src/app.ts following the existing pattern.

6) Frontend:
   - Add label maps to frontend/src/lib/labels.ts for SessionCadence, SessionDeliveryMode,
     DedicatedTeamRole, and the new NotificationType values.
   - No new pages yet (programs add their own); just make sure axios endpoints compile.

7) Seed: extend backend/prisma/seed.ts with a couple of demo RecurringSeries and a couple of
   ProgrammeAssignment rows so the UI isn't empty. Keep idempotent (upsert) like the existing seed.

When done: run `npx prisma migrate dev --name foundation_scheduling`, `npm run build` in backend,
and `npm run build` in frontend. Fix any type errors. Summarise the new models, endpoints and files.
Do not start any individual program yet.
```

---

# Prompt 1 — Education Development Program (online classes)

```text
Continue in the HUManity IOP repo. Build the Education Development Program (Programme P1_EDUCATION)
on top of the foundation from the previous step. Follow existing conventions (see Prompt 0 notes:
services/routes/jobs/notification.service/whatsapp.service/labels.ts/api.ts; read AGENTS.md).

DOMAIN RULES:
- Online classes only, delivered over Google Meet, one laptop/section per grade.
- Grades 8, 9, 10. Subjects: MATHS (Mondays), SCIENCE (Wednesdays), ENGLISH (Fridays). Alternate-day.
- A volunteer is assigned to a (grade, subject) section for the academic year as the primary teacher.
- For EVERY class, three artifacts are MANDATORY:
    (a) volunteer lesson plan submitted BEFORE the class,
    (b) child attendance for the class,
    (c) volunteer class-feedback submitted AFTER the class.
- Substitution system: a volunteer who cannot take an upcoming class raises a substitution request;
  it broadcasts a notification to all active volunteers (or at least all P1 volunteers); any eligible
  volunteer can accept and becomes the assigned teacher for that ClassSession.
- The Google Meet link lives in the app (per section, inheritable per session) and shows in the calendar.

1) Prisma schema additions:

   enum Grade { GRADE_8 GRADE_9 GRADE_10 }
   enum ClassSubject { MATHS SCIENCE ENGLISH }
   enum ClassSessionStatus { SCHEDULED SUBSTITUTION_REQUESTED COMPLETED CANCELLED }
   enum SubstitutionStatus { OPEN FILLED CANCELLED EXPIRED }

   model ClassSection {
     id               String   @id @default(cuid())
     grade            Grade
     subject          ClassSubject
     academicYear     String   // e.g. "2026-27"
     dayOfWeek        Int      // 1=Mon (MATHS), 3=Wed (SCIENCE), 5=Fri (ENGLISH)
     startTime        String   // "17:00" IST
     durationMinutes  Int      @default(60)
     meetLink         String?  // persistent Google Meet for this section
     cciId            String?
     primaryVolunteerId String?
     isActive         Boolean  @default(true)
     createdAt        DateTime @default(now())
     sessions         ClassSession[]
     enrollments      ClassEnrollment[]
     @@unique([grade, subject, academicYear])
   }

   model ClassEnrollment {
     classSectionId String
     childId        String
     classSection   ClassSection @relation(fields: [classSectionId], references: [id])
     child          Child        @relation(fields: [childId], references: [id])
     @@id([classSectionId, childId])
   }

   model ClassSession {
     id                  String   @id @default(cuid())
     classSectionId      String
     classSection        ClassSection @relation(fields: [classSectionId], references: [id])
     date                DateTime
     status              ClassSessionStatus @default(SCHEDULED)
     assignedVolunteerId String?  // resolved teacher (primary or substitute)
     meetLink            String?  // inherits section link if null
     topic               String?
     lessonPlan          String?
     lessonPlanSubmittedAt DateTime?
     classFeedback       String?
     feedbackSubmittedAt DateTime?
     cancelledReason     String?
     createdAt           DateTime @default(now())
     updatedAt           DateTime @updatedAt
     attendance          ClassAttendance[]
     substitutionRequests SubstitutionRequest[]
     @@unique([classSectionId, date])
   }

   model ClassAttendance {
     id             String   @id @default(cuid())
     classSessionId String
     classSession   ClassSession @relation(fields: [classSessionId], references: [id])
     childId        String
     child          Child    @relation(fields: [childId], references: [id])
     present        Boolean  @default(false)
     note           String?
     markedById     String
     createdAt      DateTime @default(now())
     @@unique([classSessionId, childId])
   }

   model SubstitutionRequest {
     id             String   @id @default(cuid())
     classSessionId String
     classSession   ClassSession @relation(fields: [classSessionId], references: [id])
     requestedById  String
     reason         String?
     status         SubstitutionStatus @default(OPEN)
     filledById     String?
     filledAt       DateTime?
     createdAt      DateTime @default(now())
   }
   - Add Child back-relations: classEnrollments ClassEnrollment[], classAttendance ClassAttendance[].

2) Service: backend/src/services/education.service.ts
   - CRUD for ClassSection (+ enroll/unenroll children).
   - materializeUpcomingClassSessions(): for each active ClassSection, create ClassSession rows for the
     next 14 days on the section's dayOfWeek (idempotent via @@unique[sectionId,date]); inherit meetLink.
     (The daily scheduler job in Prompt 5 will call this.)
   - submitLessonPlan(sessionId, userId, plan): only the assigned teacher; sets lessonPlanSubmittedAt.
   - submitClassFeedback(sessionId, userId, feedback): only assigned teacher; sets feedbackSubmittedAt;
     marks session COMPLETED.
   - markClassAttendance(sessionId, userId, [{childId, present, note}]): upsert ClassAttendance.
   - requestSubstitution(sessionId, userId, reason): create SubstitutionRequest(OPEN), set session
     status SUBSTITUTION_REQUESTED, and BROADCAST a CLASS_REMINDER/SUBSTITUTION_REQUESTED notification
     to all active P1 volunteers (reuse notification.service.createNotification in a loop; it already
     mirrors to WhatsApp). acceptSubstitution(requestId, userId): set FILLED, reassign
     session.assignedVolunteerId, set session back to SCHEDULED, notify original requester
     (SUBSTITUTION_FILLED).
   - getVolunteerSchedule(userId, fromDate, toDate): upcoming ClassSessions where they're assigned,
     with meetLink + plan/feedback completion flags.

3) Routes: backend/src/routes/classes.ts  (mount at /api/classes in app.ts)
   - Sections: GET/POST/PATCH (managers); GET /:id; POST /:id/enroll, DELETE /:id/enroll/:childId.
   - Sessions: GET (filter by section/date/mine), GET /:id,
       POST /sessions/:id/plan, POST /sessions/:id/feedback, POST /sessions/:id/attendance,
       POST /sessions/:id/substitution-request, POST /substitution-requests/:id/accept,
       GET /substitution-requests?status=OPEN (the open board), GET /schedule/me.
   - RBAC: VOLUNTEER may act only on sessions assigned to them (and accept open substitutions);
     PROGRAM_MANAGER/SUPER_ADMIN manage sections + see all.

4) Frontend (App Router, shadcn). Add nav item "Classes" (icon GraduationCap) in
   frontend/src/app/(dashboard)/layout.tsx for roles SUPER_ADMIN, PROGRAM_MANAGER, VOLUNTEER.
   Pages under frontend/src/app/(dashboard)/classes/:
     - page.tsx: manager view = list of sections (grade × subject × year) with primary volunteer,
       enrolment count, next class; volunteer view = "My upcoming classes" cards with Join (Meet link),
       and badges for "Plan pending"/"Feedback pending".
     - sections/[id]/page.tsx: section detail, roster, upcoming sessions.
     - sessions/[id]/page.tsx: single class — Join Meet button; tabs for Lesson Plan (textarea, submit),
       Attendance (checkbox list of enrolled children), Feedback (textarea, submit, locks session).
     - substitutions/page.tsx: "Open substitution board" — list OPEN requests, Accept button; and a
       "Request substitution" action from a session you're assigned to.
   Use existing ui components (card, tabs, checkbox, textarea, button, badge, table) and labels.ts.

5) Seed: 9 ClassSections (3 grades × 3 subjects) for academic year "2026-27" with placeholder meetLinks,
   enroll a few seeded children, assign a couple of volunteers as primaryVolunteer, and materialise the
   next 2 weeks of sessions. Keep idempotent.

When done: `npx prisma migrate dev --name education_program`, build backend + frontend, fix type errors.
Manually verify the volunteer flow: see schedule -> submit plan -> mark attendance -> submit feedback;
and the substitution flow: request -> broadcast notification -> another volunteer accepts. Summarise.
```

---

# Prompt 2 — SEL + Digital Literacy & AI (alternate-Sunday on-ground)

```text
Continue in the HUManity IOP repo. Build the two alternate-Sunday on-ground programs together since
they share structure: SEL (P2_SEL) and Digital Literacy & AI (P3_DIGITAL_LITERACY). Reuse Opportunity
+ EventRegistration for sign-ups/attendance and SessionFeedback (from Prompt 0) for per-session
feedback. Follow existing conventions; read AGENTS.md.

DOMAIN RULES:
- On-ground at CCIs. Alternate Sundays: one Sunday = SEL, the next Sunday = Digital Literacy & AI, rotating.
- Volunteer-to-student ratio 1:6. For an average SEL session, plan ~10 volunteers including buffer.
  (requiredCount on the Opportunity = ceil(studentCount/6); show ratio status using team.service.ratioStatus.)
- SEL follows a fixed 12-session curriculum (sequence matters). Each Sunday SEL session delivers the
  next curriculum item.
- Digital Literacy & AI covers 4 modules in order:
    1) Introduction to Computing & Internet
    2) Introduction to AI
    3) AI for Education
    4) AI for Skilling
- After each session capture feedback on BOTH volunteer participation and child participation
  (SessionFeedback), plus optional per-child ProgressNote (already exists, set programmeArea).

1) Prisma schema:
   enum CurriculumType { SEL DIGITAL_LITERACY }
   model CurriculumItem {
     id            String   @id @default(cuid())
     type          CurriculumType
     sequence      Int
     title         String
     objective     String?
     activities    String[]
     outcome       String?
     durationMinutes Int    @default(75)
     @@unique([type, sequence])
   }
   - Opportunity already has curriculumItemId (from Prompt 0); add the relation:
     curriculumItem CurriculumItem? @relation(fields: [curriculumItemId], references: [id]),
     and CurriculumItem.opportunities Opportunity[].

2) Seed backend/prisma/seed.ts (idempotent upsert) with the full SEL 12-session curriculum and the
   4 Digital Literacy & AI modules. Use the exact content in the appendix at the bottom of this build
   document (titles, objectives, activities, outcomes).

3) Service: backend/src/services/program.service.ts
   - createSundaySessionsFromSeries(): for the ALTERNATE_SUNDAY RecurringSeries, generate Opportunity
     rows for upcoming Sundays, alternating P2_SEL / P3_DIGITAL_LITERACY, auto-linking the next
     unused CurriculumItem in sequence (SEL cycles 1..12; DLAI cycles its 4 modules), setting
     deliveryMode=ON_GROUND, requiredCount from studentCount/6 (default studentCount from CCI occupancy),
     status DRAFT. Idempotent per (programmeArea, date, cciId).
   - submitSessionFeedback() — thin wrapper over the SessionFeedback endpoints from Prompt 0 (skip if
     already added). ratio helpers from team.service.
   - listCurriculum(type), getSessionWithCurriculum(opportunityId).

4) Routes: extend backend/src/routes/opportunities.ts (or a new programs.ts mounted at /api/programs):
   - GET /api/programs/curriculum?type=SEL|DIGITAL_LITERACY
   - The session feedback endpoints from Prompt 0 are reused.
   - GET /api/programs/sessions?programme=P2_SEL|P3_DIGITAL_LITERACY (upcoming, with curriculum + ratio).

5) Frontend:
   - Extend the existing Opportunities pages (frontend/src/app/(dashboard)/opportunities/) so that for
     P2_SEL / P3_DIGITAL_LITERACY sessions the detail page shows: the linked curriculum item
     (title/objective/activities/outcome), a live ratio indicator (X volunteers / need ceil(students/6)),
     a "Post-session feedback" form (SessionFeedback: children present/engaged, child participation
     rating, volunteer participation rating, what went well, challenges, follow-up).
   - Add a "Curriculum" reference page frontend/src/app/(dashboard)/curriculum/page.tsx with two tabs
     (SEL 12 sessions / Digital Literacy & AI 4 modules) rendering CurriculumItem content. Add nav item
     "Curriculum" (icon BookOpen) for SUPER_ADMIN, PROGRAM_MANAGER, VOLUNTEER.
   - Add labels for CurriculumType in labels.ts.

6) Seed a couple of upcoming SEL and DLAI Sunday Opportunities at a seeded CCI, linked to curriculum
   items, with requiredCount ~10 for SEL.

When done: `npx prisma migrate dev --name sel_dlai_programs`, build both, fix type errors. Verify a
manager can open an upcoming SEL session, see "Session 1: Knowing Myself" attached, see the 1:6 ratio
status, and a volunteer can submit post-session feedback. Summarise.
```

---

# Prompt 3 — Health & Nutrition

```text
Continue in the HUManity IOP repo. Build the Health & Nutrition program (P4_HEALTH_NUTRITION). Reuse
Opportunity + EventRegistration for events, the existing HealthGrowth / Vaccination / Illness models for
clinical capture, and ProgrammeAssignment (from Prompt 0) for the dedicated team. Follow conventions;
read AGENTS.md.

DOMAIN RULES:
- Two recurring activity types:
    (a) Quarterly health checkup for children (captures height/weight/BMI via HealthGrowth, plus
        vaccinations/illnesses as needed).
    (b) Monthly awareness activity — one activity in one CCI each month (rotating CCIs).
- 5 dedicated volunteers for Health & Nutrition (ProgrammeAssignment teamRole=DEDICATED), but ANY active
  volunteer may also sign up for weekend activities at CCIs (normal Opportunity registration).

1) Prisma: add enum HealthEventType { QUARTERLY_CHECKUP MONTHLY_AWARENESS } and add nullable
   healthEventType HealthEventType? to Opportunity (additive). No other model changes — clinical data
   uses existing HealthGrowth/Vaccination/Illness keyed by childId.

2) Service: backend/src/services/health.service.ts
   - createQuarterlyCheckups()/createMonthlyAwareness(): generate Opportunity rows from the relevant
     RecurringSeries (QUARTERLY / MONTHLY cadence), tagging healthEventType, rotating the CCI for monthly
     awareness across active CCIs. Idempotent.
   - recordCheckupMeasurements(opportunityId, [{childId, heightCm, weightKg, ...}]): for a checkup event,
     bulk-create HealthGrowth rows (compute bmi), reusing child.service if a helper exists.
   - getHealthDashboard(): per-CCI last-checkup date, # children measured this quarter, flagged BMI
     outliers, upcoming awareness activity.

3) Routes: backend/src/routes/health.ts (mount /api/health)
   - GET /api/health/dashboard
   - POST /api/health/checkups/:opportunityId/measurements
   - GET /api/health/team  (dedicated 5 via team.service) ; POST/DELETE to manage (managers only)

4) Frontend: nav item "Health" (icon HeartPulse) for SUPER_ADMIN, PROGRAM_MANAGER, CCI_MANAGER.
   Page frontend/src/app/(dashboard)/health/page.tsx:
   - Dedicated team panel (the 5), upcoming checkups & awareness activities, per-CCI checkup status table.
   - Checkup detail: a measurement-entry grid (child rows: height, weight, auto BMI) writing HealthGrowth.
   Reuse existing children/health UI patterns if present.

5) Seed: a dedicated team of up to 5 volunteers (ProgrammeAssignment), one upcoming quarterly checkup
   Opportunity and one monthly awareness Opportunity at seeded CCIs.

When done: `npx prisma migrate dev --name health_nutrition`, build both, fix types. Verify a checkup
event lets you record measurements that appear on the child's HealthGrowth history. Summarise.
```

---

# Prompt 4 — Library Project

```text
Continue in the HUManity IOP repo. Build the Library Project (P5_LIBRARY). Reuse Opportunity for
activities and ProgrammeAssignment for the dedicated team. Add Pratham-style reading-level tracking.
Follow conventions; read AGENTS.md.

DOMAIN RULES:
- Monthly or bimonthly reading activities to improve reading skills / literacy.
- Books are from the Pratham program; volunteers monitor each child's reading LEVEL over time and leave
  feedback. Use the standard Pratham/ASER reading levels.
- 5 dedicated volunteers (ProgrammeAssignment teamRole=DEDICATED).

1) Prisma:
   enum ReadingLevel { BEGINNER LETTER WORD PARAGRAPH STORY }  // Pratham/ASER ladder
   model ReadingAssessment {
     id           String   @id @default(cuid())
     childId      String
     child        Child    @relation(fields: [childId], references: [id])
     opportunityId String? // the library session it was taken in
     date         DateTime
     level        ReadingLevel
     bookTitle    String?
     prathamGroup String?  // optional Pratham grouping/colour band
     assessedById String
     notes        String?
     createdAt    DateTime @default(now())
   }
   - Add Child.readingAssessments ReadingAssessment[].

2) Service: backend/src/services/library.service.ts
   - createLibraryActivities(): generate Opportunity rows from the MONTHLY/BIMONTHLY RecurringSeries.
   - recordAssessment(childId, opportunityId, level, bookTitle, notes, assessedById).
   - getReadingProgress(cciId?): per child, latest level + trend (level history), and a CCI-level
     distribution across the 5 levels for reporting.

3) Routes: backend/src/routes/library.ts (mount /api/library)
   - GET /api/library/progress?cciId= ; POST /api/library/assessments ; GET /api/library/team ; team mgmt.

4) Frontend: nav item "Library" (icon Library) for SUPER_ADMIN, PROGRAM_MANAGER, CCI_MANAGER, VOLUNTEER.
   Page frontend/src/app/(dashboard)/library/page.tsx:
   - Reading-level distribution (simple bars across BEGINNER..STORY), dedicated team panel,
     upcoming activities, and a per-child assessment-entry form (child + level + book + notes).
   - Child reading-level history shown as a small timeline/sparkline of levels.
   Add ReadingLevel labels (and an ordered options array) to labels.ts.

5) Seed: a dedicated team of up to 5, one upcoming library Opportunity, and a few ReadingAssessment rows
   so the distribution renders.

When done: `npx prisma migrate dev --name library_project`, build both, fix types. Verify recording an
assessment updates a child's latest reading level and the CCI distribution. Summarise.
```

---

# Prompt 5 — Automation, Calendar, Google Meet & verification

```text
Continue in the HUManity IOP repo. Wire up the automation and calendar layer that ties all five
programs together, then verify end-to-end. Follow conventions; mirror compliance.job.ts for cron;
reuse notification.service.ts (in-app + WhatsApp) and whatsapp.service.ts. Read AGENTS.md.

1) Scheduler job: backend/src/jobs/schedule.job.ts (start it from server.ts next to startComplianceJob)
   - Daily ~06:00 IST: materialise upcoming work for the next 14 days by calling:
       education.service.materializeUpcomingClassSessions()
       program.service.createSundaySessionsFromSeries()   (alternate SEL/DLAI Sundays)
       health.service.createQuarterlyCheckups() + createMonthlyAwareness()
       library.service.createLibraryActivities()
   - Expire stale SubstitutionRequests (OPEN requests whose class date has passed -> EXPIRED).

2) Reminder job: backend/src/jobs/reminders.job.ts (start from server.ts)
   - Hourly: for ClassSessions and Opportunities starting in ~24h and in ~2h, send reminders to the
     assigned volunteer(s)/registrants via createNotification (CLASS_REMINDER / SESSION_REMINDER) — this
     auto-mirrors to WhatsApp. Include the Google Meet link for online classes.
   - Mandatory-artifact nudges for Education: if a class starts within ~3h and the assigned volunteer has
     not submitted a lesson plan -> LESSON_PLAN_DUE; if a class finished >2h ago with no feedback ->
     FEEDBACK_DUE. De-dupe so each nudge is sent once (track via a sent flag or by checking existing
     notifications for that session/day).

3) Google Calendar + Meet integration: backend/src/services/googleCalendar.service.ts
   - Same safe-no-op pattern as whatsapp.service.ts: activate only when env is set, otherwise log once
     and return. Add env vars to .env.example:
       GOOGLE_CALENDAR_ENABLED=
       GOOGLE_SERVICE_ACCOUNT_JSON=   (or GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY)
       GOOGLE_CALENDAR_ID=
       GOOGLE_IMPERSONATE_SUBJECT=    (Workspace user for domain-wide delegation, needed for Meet)
   - upsertEventForClassSession() / upsertEventForOpportunity(): create/update a Google Calendar event
     with start/end (IST), attendees (assigned/registered volunteers' emails), and conferenceData to
     auto-create a Meet link; persist the returned Meet/hangoutLink back onto ClassSession.meetLink /
     Opportunity (add a nullable calendarEventId + meetLink to Opportunity if not present). If Meet
     auto-creation isn't available (no Workspace delegation), fall back to the section's static meetLink.
   - Call these from the scheduler job after sessions are materialised (best-effort, never block).

4) Web Push (optional, behind env): minimal VAPID-based push so "in-app + push" works on mobile.
   - Add env VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT (no-op if unset). A PushSubscription
     model keyed to userId, an endpoint to save a subscription, and a sendPush() called alongside
     createNotification. Frontend: register a service worker and subscribe when notifications are enabled.
     If this balloons scope, stub the service + model and leave a TODO — do NOT block the rest.

5) My Calendar (frontend): frontend/src/app/(dashboard)/calendar/page.tsx, nav item "My Calendar"
   (icon CalendarDays) for VOLUNTEER, PROGRAM_MANAGER, SUPER_ADMIN.
   - Volunteer view: a week/agenda list of their upcoming ClassSessions (with Join Meet) and the
     Opportunities they're registered for, with plan/feedback status chips and reminders info.
   - Pull from /api/classes/schedule/me and the volunteer's EventRegistrations.

6) Dashboard: add per-programme summary tiles to the existing dashboard (sessions this week per program,
   pending lesson plans, pending feedback, open substitution requests, reading-level snapshot, upcoming
   health checkup) reusing the existing dashboard route/service patterns.

7) VERIFICATION (do this and report results):
   - `npx prisma migrate dev` clean from scratch on a fresh DB + `npx prisma db seed` succeeds.
   - Backend `npm run build` and `npm test` (jest) pass; frontend `npm run build` passes.
   - Write/extend jest tests in backend for: scheduling.service date generation (MWF + alternate-Sunday),
     team.service.ratioStatus (1:6), education substitution accept reassigns the teacher, and SEL session
     auto-links the next curriculum item.
   - Manually walk: Education plan->attendance->feedback + substitution broadcast/accept; SEL session with
     curriculum + ratio + feedback; Health checkup measurement; Library reading assessment; My Calendar
     shows upcoming items with Meet links; a reminder notification is created and (if creds set) WhatsApp
     mirror attempted.
   Summarise what passed, what is stubbed (push / Google Meet if no Workspace), and any follow-ups.
```

---

## Appendix — Curriculum seed content (use verbatim in Prompt 2)

### SEL — 12-session curriculum (type = SEL)

1. **Knowing Myself** — Objective: Help children identify their strengths, interests, and unique
   qualities. Activities: Icebreaker "My Superpower"; Draw and share "All About Me"; Group discussion on
   strengths. Outcome: Children gain self-awareness and confidence.
2. **Understanding Emotions** — Objective: Recognize and name different emotions. Activities: Emotion
   cards game; Feelings charades; Emotion diary introduction. Outcome: Children learn emotional awareness
   and expression.
3. **Building Self-Confidence** — Objective: Develop positive self-belief. Activities: Compliment circle;
   Achievement sharing; Confidence ladder exercise. Outcome: Improved self-esteem and self-worth.
4. **Growth Mindset** — Objective: Understand that abilities improve with effort. Activities: Fixed vs
   Growth Mindset stories; "I Can't Yet" activity; Reflection discussion. Outcome: Children become more
   resilient towards challenges.
5. **Empathy & Kindness** — Objective: Understand others' feelings and perspectives. Activities: Role-play
   scenarios; Walk in My Shoes activity; Kindness challenge. Outcome: Improved empathy and compassion.
6. **Effective Communication** — Objective: Learn respectful speaking and active listening. Activities:
   Listening pairs; Telephone game; Communication role plays. Outcome: Enhanced communication skills.
7. **Friendship & Teamwork** — Objective: Build healthy relationships and collaboration. Activities: Team
   tower challenge; Trust activities; Group reflection. Outcome: Improved teamwork and cooperation.
8. **Managing Stress** — Objective: Learn healthy coping mechanisms. Activities: Stress discussion; Deep
   breathing exercises; Stress balloon activity. Outcome: Better emotional regulation.
9. **Problem Solving & Decision Making** — Objective: Develop critical thinking and decision-making
   skills. Activities: Real-life scenarios; Problem-solving steps activity; Group solutions presentation.
   Outcome: Improved decision-making confidence.
10. **Resilience & Bouncing Back** — Objective: Learn how to recover from setbacks. Activities: Stories of
    resilience; Personal challenge reflection; Resilience tree activity. Outcome: Children develop
    perseverance and adaptability.
11. **Goal Setting & Motivation** — Objective: Help children create meaningful goals. Activities: Dream
    board creation; SMART goals introduction; Peer sharing. Outcome: Increased motivation and future
    planning skills.
12. **Celebration & Reflection** — Objective: Reflect on learning and celebrate growth. Activities: SEL
    journey review; Certificate and appreciation circle; Personal growth reflection. Outcome: Children
    recognize their progress and achievements.

SEL meta: Frequency bi-weekly (2/month); duration 60–90 min; methodology activity-based learning,
discussions, games, role-plays, reflection; target group children aged 10–18 in CCIs.

### Digital Literacy & AI — 4 modules (type = DIGITAL_LITERACY)

1. **Introduction to Computing & Internet** — basic computer operation, the internet, safe and
   responsible online use.
2. **Introduction to AI** — what AI is, everyday examples, how AI learns at a high level.
3. **AI for Education** — using AI tools to support learning, study, and curiosity.
4. **AI for Skilling** — using AI to build practical, employability-oriented skills.

(Objectives/activities/outcomes for DLAI can be fleshed out later; seed titles + descriptions now and
leave activities arrays editable in the UI.)
```
