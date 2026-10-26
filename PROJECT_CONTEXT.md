# Adaptive Learning Platform: Project Context

This document records the repository state found during the initial architecture inspection on
2026-10-26. It is based on the implementation in this repository rather than on the project
summary or earlier handoff notes.

## Repository structure

The repository root is `adaptive-learning-platform/`. It is a Git repository with a `main`
branch. Generated dependency directories (`node_modules/`) and build output are not part of the
application source inventory.

### Frontend

- `index.html` - Vite HTML entry point.
- `vite.config.ts` - Vite, React, and Tailwind CSS v4 plugin configuration.
- `tsconfig.json` - strict TypeScript configuration for `src/`.
- `src/main.tsx` - React application bootstrap.
- `src/App.tsx` - Browser routing, authentication provider, public routes, and protected
  application routes.
- `src/context/AuthContext.tsx` - in-memory user/token state and login, registration, and logout
  actions.
- `src/services/api.ts` - fetch-based API client, API base URL configuration, in-memory bearer
  token attachment, and `ApiError`.
- `src/services/auth.service.ts` - typed authentication API calls.
- `src/types/auth.ts` - frontend authentication and API response types.
- `src/components/auth/ProtectedRoute.tsx` - redirects unauthenticated users to `/login` and
  preserves the requested location in router state.
- `src/components/layout/` - `AppLayout`, `Sidebar`, and `TopNav`.
- `src/components/ui/` - shared cards, badges, progress bars, stat cards, empty states, and the
  placeholder-page presentation.
- `src/config/navigation.ts` - protected workspace navigation definitions.
- `src/pages/` - dashboard, authentication, planner, targets, notes, practice, feedback, tests,
  analytics, settings, and not-found pages.
- `src/data/mockData.ts` - static dashboard data and related frontend types.
- `src/index.css` - global styles and Tailwind imports.

### Backend

- `server/src/server.ts` - startup, JWT configuration validation, MongoDB connection, HTTP
  listener, and graceful shutdown.
- `server/src/app.ts` - Helmet, CORS, body parsing, API router, 404 handling, and global error
  handling.
- `server/src/config/env.ts` - dotenv loading and typed server configuration.
- `server/src/config/database.ts` - Mongoose connection, connection event logging, shutdown, and
  health status.
- `server/src/routes/index.ts` - mounts health and authentication routers under `/api`.
- `server/src/routes/health.routes.ts` - health endpoint.
- `server/src/routes/auth.routes.ts` - registration, login, and protected profile routes.
- `server/src/controllers/auth.controller.ts` - authentication request validation, user creation,
  login, and profile responses.
- `server/src/models/user.model.ts` - Mongoose user schema, password hashing, and password
  comparison.
- `server/src/middleware/auth.middleware.ts` - Bearer JWT verification and authenticated-user
  lookup; extends `Express.Request` with `user`.
- `server/src/middleware/errorHandler.ts` - JSON error responses and development stack output.
- `server/src/middleware/notFoundHandler.ts` - JSON response for unknown API endpoints.
- `server/src/utils/jwt.ts` - JWT signing and verification.
- `server/tsconfig.json` - strict CommonJS TypeScript build configuration.

## Technology and dependencies

### Frontend

- React 19 and React DOM 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4 through `@tailwindcss/vite`
- React Router DOM 7
- Lucide React icons
- Recharts

### Backend

- Node.js with Express 4
- TypeScript 5.7 and `tsx` for development
- Mongoose 8 and MongoDB
- `bcryptjs` for password hashing with 12 salt rounds
- `jsonwebtoken` for access tokens
- `cors`, `helmet`, and `dotenv`

The root `package.json` delegates backend development, build, start, and type-check commands to
the `server/` package. There are no Gemini or other generative-AI dependencies in either package
manifest.

## Frontend routes and behavior

### Public routes

- `/login` - login form.
- `/register` - registration form.

Authenticated users are redirected from these pages to `/`.

### Protected routes

All of the following are nested under `ProtectedRoute` and `AppLayout`:

- `/` - `DashboardPage`.
- `/planner` - `PlannerPage`.
- `/targets` - `TargetsPage`.
- `/notes` - `NotesPage`.
- `/practice` - `PracticePage`.
- `/feedback` - `FeedbackPage`.
- `/tests` - `TestsPage`.
- `/analytics` - `AnalyticsPage`.
- `/settings` - `SettingsPage`.

The protected pages other than the dashboard currently render the shared `PlaceholderPage`.
Their copy describes future AI learning features but does not call an API or persist data.

The dashboard is a styled UI backed by `src/data/mockData.ts`. Its learning path, daily targets,
assessment scores, weak topics, upcoming test, weekly progress, streak, subject progress, and
default goal are static. The authenticated user's name is used in the dashboard greeting and
sidebar, but the learning metrics are not user-specific.

## Existing API contract

The backend mounts all routes under `/api`. Requests use JSON bodies where applicable. The
frontend API client reads `VITE_API_BASE_URL`, defaults to `http://localhost:5000/api`, and adds
`Authorization: Bearer <token>` from in-memory state to authenticated requests.

### `GET /api/health`

Public endpoint. Returns HTTP 200 when MongoDB is connected and HTTP 503 otherwise:

```json
{
  "status": "healthy | degraded",
  "timestamp": "ISO-8601 timestamp",
  "uptimeSeconds": 0,
  "environment": "development",
  "services": {
    "server": { "status": "online" },
    "database": {
      "status": "connected | disconnected | connecting | disconnecting | unknown",
      "connected": true,
      "name": "database name or null"
    }
  }
}
```

### `POST /api/auth/register`

Public endpoint. Body:

```json
{
  "name": "string (2-60 characters)",
  "email": "valid email string",
  "password": "string (8-128 characters)"
}
```

Returns HTTP 201 with `success`, a message, and `data.user`, `data.token`, `data.tokenType`
(`"Bearer"`), and `data.expiresIn`. Duplicate email returns HTTP 409. Invalid input returns
HTTP 400.

### `POST /api/auth/login`

Public endpoint. Body:

```json
{
  "email": "string",
  "password": "string"
}
```

Returns HTTP 200 with the same authentication data shape as registration. Invalid credentials
return a generic HTTP 401 response.

### `GET /api/auth/me`

Protected endpoint. Requires `Authorization: Bearer <JWT>`. Returns HTTP 200 with:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "MongoDB user id",
      "name": "string",
      "email": "string",
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp"
    }
  }
}
```

Missing, expired, malformed, or invalid tokens return HTTP 401. Unknown endpoints return HTTP
404. Unhandled errors are returned through the global `{ success: false, error: ... }` shape.

## Authentication and persistence behavior

- User records are stored in MongoDB through the `User` model.
- Email is normalized to lowercase and indexed uniquely.
- Password hashes are excluded from normal queries and JSON/object output.
- Access tokens contain the user ID as the JWT subject and are signed with `JWT_SECRET`.
- The frontend deliberately stores the access token only in React memory; a browser refresh clears
  authentication and requires login again.
- There is no refresh-token or persistent-session implementation.
- No learning-plan, curriculum, task, note, answer, feedback, test, or progress model exists.

## Environment variables

### Frontend `.env`

- `VITE_API_BASE_URL` - optional API base URL; defaults to
  `http://localhost:5000/api`.
- `VITE_PORT` is mentioned as an optional example variable, but Vite configuration does not
  explicitly consume it.

### Backend `server/.env`

- `PORT` - HTTP port; defaults to `5000`.
- `NODE_ENV` - runtime environment; defaults to `development`.
- `MONGODB_URI` - required MongoDB connection string.
- `CLIENT_URL` - allowed CORS origin; defaults to `http://localhost:5173`.
- `JWT_SECRET` - required signing secret; startup fails if it is missing.
- `JWT_EXPIRES_IN` - JWT lifetime; defaults to `7d`.

`.env.example` and `server/.env.example` document these names. Local `.env` files exist in the
workspace; their values are intentionally not recorded here.

## Commands

Run from the repository root:

```bash
npm run dev          # frontend Vite development server
npm run build        # frontend type-check and production build
npm run lint         # frontend TypeScript check
npm run server:dev   # backend development server with tsx watch
npm run server:build # backend TypeScript build
npm run server:start # start compiled backend
npm run server:lint  # backend TypeScript check
```

The backend starts only after valid JWT configuration and a successful MongoDB connection.

## Unfinished features and next milestone

The following are planned in the UI but not implemented:

- AI learning planner goal and timeline collection.
- Gemini or other AI integration.
- Curriculum generation and validation.
- MongoDB persistence for user-owned learning plans and curriculum structures.
- Retrieval of the authenticated user's plans.
- Daily targets, detailed notes, answer submission/evaluation, feedback, personalized tests,
  progress analytics, and their supporting persistence models.
- Replacement of dashboard mock metrics with authenticated-user data.

The next implementation milestone should add the learning planner incrementally while preserving
the existing JWT authentication and dashboard route. The expected ownership boundary is the
authenticated user from `req.user`; learning-plan reads and writes must never be based on a
client-supplied user ID. AI credentials must remain backend-only and must not be added to frontend
environment variables or bundled client code.
