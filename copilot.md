# Adaptive Learning Platform - Copilot Handoff

Read this file first in a new coding session. It is the compact project handoff for this
repository and is intended to prevent a full repository scan before work begins.

## Current checkout

- Repository: `C:\Users\Vijay ahirwar\Desktop\adaptive-learning-platform`
- Branch: `feat/remaining`
- Current HEAD: see `git log -1`; this handoff tracks the integrated remaining-workspace implementation.
- Runtime: Windows, Node.js, npm, TypeScript
- The worktree may contain generated integration-test database files; remove them after testing.

## Product

Adaptive Learning Platform: authenticated learners create AI-generated curricula, receive daily
targets, and read versioned learning notes. The frontend is React/Vite and the backend is
Express/Mongoose.

## Technology

### Frontend

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- React Router DOM 7
- Lucide React
- Recharts

### Backend

- Node.js and Express 4
- TypeScript 5.7
- MongoDB with Mongoose 8
- JWT authentication
- bcryptjs password hashing
- Helmet, CORS, dotenv
- AI providers: Gemini through `@google/genai`, plus OpenAI-compatible Groq/OpenRouter providers

## Repository map

### Root

- `package.json` - frontend scripts and dependencies; delegates backend commands.
- `vite.config.ts` - Vite and Tailwind configuration.
- `tsconfig.json` - frontend TypeScript configuration.
- `.env.example` - frontend API URL placeholder.
- `PROJECT_CONTEXT.md` - earlier architecture handoff; some historical sections are stale.
- `README.md` - project setup and overview.
- `src/` - frontend application.
- `server/` - backend application.

### Frontend

- `src/main.tsx` - React bootstrap.
- `src/App.tsx` - routing, authentication provider, protected routes.
- `src/context/AuthContext.tsx` - in-memory auth/token state.
- `src/services/api.ts` - fetch client and bearer-token attachment.
- `src/services/auth.service.ts` - auth API calls.
- `src/services/curriculum.service.ts` - curriculum API calls.
- `src/services/daily-target.service.ts` - Daily Targets API calls.
- `src/services/learning-notes.service.ts` - Learning Notes API calls.
- `src/types/` - frontend contracts.
- `src/components/` - layout, auth, and reusable UI.
- `src/pages/` - dashboard, planner, targets, notes, practice, feedback, tests, analytics,
  settings, auth, and not-found pages.
- `src/data/mockData.ts` - legacy data module; the Dashboard now uses live curriculum, target, and practice APIs.

Current frontend routes:

- Public: `/login`, `/register`
- Protected: `/`, `/planner`, `/targets`, `/notes`, `/practice`, `/feedback`, `/tests`,
  `/analytics`, `/settings`

### Backend entry and infrastructure

- `server/src/server.ts` - config validation, database startup, HTTP server, shutdown.
- `server/src/app.ts` - Helmet, CORS, body parsing, API router, error handlers.
- `server/src/config/env.ts` - environment loading and AI configuration.
- `server/src/config/database.ts` - Mongoose connection lifecycle.
- `server/src/middleware/auth.middleware.ts` - JWT authentication and `req.user`.
- `server/src/middleware/errorHandler.ts` - JSON error responses.
- `server/src/middleware/notFoundHandler.ts` - 404 responses.
- `server/src/utils/jwt.ts` - JWT signing and verification.

### Backend routes

- `server/src/routes/index.ts` - API route mounting.
- `server/src/routes/health.routes.ts` - `GET /api/health`.
- `server/src/routes/auth.routes.ts` - registration, login, profile.
- `server/src/routes/curriculum.routes.ts` - curriculum generation/list/retrieval/progress.
- `server/src/routes/daily-target.routes.ts` - Daily Targets and Extra Work.
- `server/src/routes/learning-notes.routes.ts` - Learning Notes operations.
- `server/src/routes/practice.routes.ts` - Practice generation, attempts, evaluation, and weak topics.
- `server/src/routes/daily-feedback.routes.ts` - Daily feedback CRUD and summaries.
- `server/src/routes/shared-learning-context.routes.ts` - bounded persisted learner context.
- `server/src/routes/test.routes.ts` - Test Center generation, attempts, evaluation, history, and results.
- `server/src/routes/settings.routes.ts` - profile, preferences, and password updates.

### Backend controllers

- `server/src/controllers/auth.controller.ts`
- `server/src/controllers/curriculum.controller.ts`
- `server/src/controllers/daily-target.controller.ts`
- `server/src/controllers/learning-notes.controller.ts`
- `server/src/controllers/practice.controller.ts`
- `server/src/controllers/daily-feedback.controller.ts`
- `server/src/controllers/shared-learning-context.controller.ts`
- `server/src/controllers/test.controller.ts`
- `server/src/controllers/settings.controller.ts`

### Backend models

- `server/src/models/user.model.ts` - owner identity, password hashing.
- `server/src/models/curriculum.model.ts` - planner, modules, topics, objectives, milestones,
  completion and assessment history.
- `server/src/models/daily-target.model.ts` - regular and extra targets.
- `server/src/models/daily-target-generation-job.model.ts` - scheduled generation state.
- `server/src/models/extra-work-generation.model.ts` - per-day Extra Work allowance.
- `server/src/models/learning-note.model.ts` - versioned notes with compound uniqueness.
- `server/src/models/practice-set.model.ts`, `practice-attempt.model.ts`,
  `learner-practice-signal.model.ts` - Practice contracts and historical evaluation evidence.
- `server/src/models/daily-feedback.model.ts` - persisted learner check-ins.
- `server/src/models/test.model.ts`, `test-attempt.model.ts` - Test Center definitions and attempts.

### AI services

- `server/src/services/ai.service.ts` - provider-independent orchestration, retries, fallback,
  timeout/error classification, JSON parsing, and validation entry points.
- `server/src/services/ai/contracts.ts` - provider/service errors and provider interfaces.
- `server/src/services/ai/providers/gemini.provider.ts` - Gemini adapter.
- `server/src/services/ai/providers/openai-compatible.provider.ts` - Groq/OpenRouter adapter.
- `server/src/services/ai/curriculum.*` - curriculum prompt, types, schema, validation.
- `server/src/services/ai/learning-notes.*` - Learning Notes prompt, types, validation.

### Daily Targets and Learning Notes services

- `server/src/services/daily-target-generation.service.ts`
- `server/src/services/daily-target-quality.service.ts`
- `server/src/services/daily-target.scheduler.ts`
- `server/src/services/daily-target.utils.ts`
- `server/src/services/timezone.service.ts`
- Learning Notes generation/versioning currently lives in
  `server/src/controllers/learning-notes.controller.ts`; preserve its ownership and version
  behavior.

## Implemented functionality in this checkout

1. React/Vite responsive application and protected navigation.
2. User registration, login, logout, JWT middleware, password hashing, and profile endpoint.
3. AI Planner/curriculum generation with ownership and maximum active-planner behavior.
4. Gemini plus provider-independent AI foundation with secure server-side keys, structured JSON
   validation, retries, timeouts, fallback providers, and safe errors.
5. Daily Targets with timezone-aware 5 AM scheduling, persistent jobs, multi-planner allocation,
   completion/undo behavior, and Extra Work rules.
6. Learning Notes with structured AI content, ownership checks, latest-version reuse, explicit
   regeneration, historical versions, and concurrent version allocation.
7. Practice & Solutions API and responsive workspace, including exact answer coverage, deterministic
   MCQ scoring, AI descriptive evaluation, signal reconciliation, leases, and claim-token safety.
8. Daily Feedback persistence, history, bounded summaries, and curriculum/target ownership checks.
9. Shared Learning Context retrieval from persisted curriculum, targets, practice, feedback, and
   test records.
10. Test Center models, generation, timed/interrupted attempts, backend evaluation, results, and history.
    Generated tests carry an immutable `scheduledAt` (currently seven days after generation);
    the catalog exposes `nextTestAt`, the UI shows availability, and early starts are rejected
    by the backend. Test answers support text/code file upload through client-side text reading,
    exact answer coverage validation, and explicit review with marks, mistakes, corrected solutions,
    and revision topics. Weak Practice signals are included in Test generation context.
11. Settings persistence for profile, learning preferences, timezone, study budget, notifications,
   theme, and password changes.
12. Dashboard live data for curricula, daily targets, and Practice history.
13. Learning Notes can include validated YouTube and additional external learning resources,
    rendered on the Learning Notes page in a “Learn more” section.
14. Learning Notes topic selection is restricted to topics appearing in today's regular or Extra
    Work targets for the selected curriculum.
15. Daily target allocations are capped by each curriculum's requested daily study time. A
    one-hour planner receives 60 minutes even when the user's shared daily budget is larger,
    and existing target durations are normalized against the corrected allocation.
16. Practice now automatically provisions one short practice set per topic in the current day's
    regular or Extra Work targets when the Practice page loads. Existing same-day sets are reused
    to avoid duplicate AI generation. Learners can write or upload text/code solutions, submit
    exact answers, and request backend AI review with marks, mistakes, corrected solutions, and
    revision topics.

## API currently mounted

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- Curriculum routes under `/api/curriculums`
- Daily Target routes under `/api/daily-targets`
- Learning Notes routes under `/api/learning-notes`
- Practice routes under `/api/practice`
- Daily Feedback routes under `/api/daily-feedback`
- Shared context routes under `/api/shared-learning-context`
- Test Center routes under `/api/tests`
- Settings routes under `/api/settings`

All protected operations use authenticated owner-scoped queries. Do not trust owner IDs from
frontend input.

## Environment variables

Backend `server/.env`:

- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `CLIENT_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `AI_PRIMARY_PROVIDER`
- `AI_FALLBACK_PROVIDERS`
- `AI_TIMEOUT_MS`
- `AI_MAX_RETRIES`
- `AI_MAX_OUTPUT_TOKENS`
- `AI_MAX_PROMPT_CHARACTERS`
- `AI_MAX_PROVIDER_ATTEMPTS`

Frontend:

- `VITE_API_BASE_URL`

Never commit real credentials. `.env.example` contains placeholders only.

## Commands

Run from the repository root:

```powershell
npm install
npm run dev
npm run server:dev
npm run build
npm run lint
npm run server:build
npm run server:lint
npm --prefix server test
npm --prefix server run integration:test
```

MongoDB integration tests use an isolated local MongoDB instance on port `27018`. Start it only
for integration tests and remove the temporary data directory afterward.

## Historical Practice & Solutions context

Practice Phase 1 and Phase 2 contracts/models/services were developed in a later working context,
including PracticeSet, PracticeAttempt, LearnerPracticeSignal, scoring, lifecycle, DTO, validation,
weak-topic utilities, and a Phase 3 Practice Service. Those files are present in the current
`feat/remaining` checkout. Verify the branch before continuing Practice work.

The later Practice design requirements were:

- Hidden MCQ answers, rubrics, and reference solutions before evaluation.
- Immutable historical attempts and versioned evidence.
- Separate set generation, attempt creation, submission, and evaluation.
- Exact answer coverage and backend-calculated partial-credit scores.
- Owner-scoped operations and no code execution in the Express process.
- Recalculable weak-topic summaries from historical evidence.
- Evaluation leases and claim tokens to prevent stale evaluators overwriting reclaimed work.

## Current next-step guidance

1. Confirm the intended branch before implementing new work.
2. Read this file, then inspect only the specific files relevant to the requested task.
3. Preserve existing authentication, curriculum, Daily Targets, Learning Notes, and AI provider
   abstractions.
4. Preserve the completed workspace integrations unless the task explicitly asks for changes.
5. Run focused tests first, then the backend/frontend checks required by the task.

Latest verified checks:

- `npm --prefix server test`: 61 passed, 0 failed.
- `npm --prefix server run lint`: passed.
- `npm --prefix server run build`: passed.
- `npm run lint`: passed.
- `npm run build`: passed (Vite emitted only the existing large-chunk warning).

The current scheduling rule is an implementation assumption: tests are initially scheduled seven
days after generation, with `nextTestAt` derived from the earliest future schedule or the latest
evaluated attempt. Refine this only if product requirements specify a different progress-based rule.

## Irrelevant or stale files

- The user-attached file
  `C:\Users\Vijay ahirwar\Desktop\practice react\practice-react\package.json` belongs to a
  different project and is irrelevant to this repository.
- The user-attached read-only PracticeSet snapshot is not a workspace file and must not be edited.
- `PROJECT_CONTEXT.md` and parts of `README.md` describe earlier repository states; use this file
  and the actual checkout as the current source of truth.
- `src/pages/AnalyticsPage.tsx` still uses the existing `PlaceholderPage`; Analytics is outside the
  six requested workspaces and was not replaced in this batch.
- Test solution uploads currently read supported text/code files in the browser and submit their
  text; PDF/image/OCR uploads are not implemented.
- `dist/` and `node_modules/` are generated/dependency directories; do not edit or treat them as
  application source.

## Persistence note

This file preserves project progress, architecture, commands, branch context, and known
limitations across sessions. It cannot preserve model tokens or conversation context; a new
session still has its own token budget. It is repository-scoped and should be kept updated when
feature work changes the architecture.
