# Adaptive Learning Platform — Project Handoff Report

### 1. Architecture Overview
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Lucide React, Recharts.
- **Backend**: Node.js, Express, TypeScript, Mongoose/MongoDB, Helmet, CORS, Dotenv.
- **Security & State**: JWT authentication (`sub: userId`), `bcryptjs` hashing (salt rounds 12). Client manages access tokens purely in memory (`AuthContext`) without `localStorage` exposure.

---

### 2. Implemented & Tested Features
- **Responsive Dashboard**: Sidebar, top navigation, study streak stats, weekly study-hours chart, targets checklist, assessment score cards, upcoming test details, and weak topics.
- **Route Protection & Flow**: Unauthenticated visitors redirect to `/login` with return-location memory; authenticated users cannot access auth pages directly.
- **Auth System**: End-to-end user registration, credential login, profile retrieval (`GET /api/auth/me`), and sign-out.
- **Personalized UI Binding**: Sidebar and dashboard welcome header dynamically display authenticated user name and initials.
- **Error Handling**: Graceful 400/401/409/404/500 responses with sanitized output in production.

---

### 3. Key Files & API Endpoints

#### Key Files
- `src/App.tsx`: App routing, `AuthProvider`, public vs protected routes.
- `src/context/AuthContext.tsx`: In-memory token management, user state, and auth actions.
- `src/services/api.ts` & `src/services/auth.service.ts`: API client with Bearer auth injection.
- `src/pages/LoginPage.tsx` & `src/pages/RegisterPage.tsx`: Auth forms with validation.
- `server/src/server.ts` & `server/src/app.ts`: Express boot, graceful shutdown, and middleware.
- `server/src/models/user.model.ts`: User schema with `passwordHash` hidden by default (`select: false`).
- `server/src/middleware/auth.middleware.ts`: Bearer token validation middleware.

#### Endpoints
- `GET /api/health` — Server uptime & MongoDB connection status.
- `POST /api/auth/register` — Validates input, checks duplicate email, hashes password, returns user & JWT.
- `POST /api/auth/login` — Verifies password, returns user & JWT.
- `GET /api/auth/me` — Protected endpoint returning authenticated user profile.

---

### 4. How to Start Both Servers

Run from the repository root:

```bash
# Terminal 1: Backend API (runs on port 5000 with hot-reload)
npm run server:dev

# Terminal 2: Frontend client (runs on port 5173)
npm run dev
```

*Build commands*: `npm run build` (frontend) and `npm run server:build` (backend).

---

### 5. Required Environment Variables

#### `server/.env` (Backend)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://<host>:<port>/<database_name>
CLIENT_URL=http://localhost:5173
JWT_SECRET=<secure_random_32_byte_hex_or_string>
JWT_EXPIRES_IN=7d
```

#### `.env` (Frontend — Optional)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

### 6. Git Status & Uncommitted Changes
- **Git Repository State**: The project directory is currently **not initialized as a Git repository** (`fatal: not a git repository`).
- **Files Status**: All project files exist locally on disk in working order. `.gitignore` is pre-configured to exclude `node_modules`, `dist`, `.env`, and secret files while allowing `.env.example`.
- *Action item*: Initialize git (`git init`) and commit the project baseline when ready.

---

### 7. Next Planned Feature: AI Learning Planner
- **Objective**: Transform `/planner` into a dynamic, AI-powered curriculum generator.
- **Workflow**:
  1. User inputs goal (e.g., target exam/skill), timeframe (weeks/months), and daily available study hours.
  2. Gemini API creates an adaptive syllabus broken down into weekly milestones and daily tasks.
  3. Mongoose schemas (`Plan`, `CurriculumTopic`, `DailyTask`) persist the roadmap linked to the authenticated user ID.
  4. The dashboard widgets (learning path card, daily targets) switch from mock data to the user's active database plan.

---

### 8. Known Issues & Unfinished Work
- **In-Memory Session Reset**: Refreshing the browser clears the in-memory token and prompts the user to log in again. (Can be upgraded later to secure HttpOnly refresh cookies if persistent sessions are needed).
- **Secondary Feature Pages**: Pages `/planner`, `/targets`, `/notes`, `/practice`, `/feedback`, `/tests`, `/analytics`, and `/settings` currently render styled `PlaceholderPage` components.
- **Static Dashboard Metrics**: Weak topics, upcoming tests, and assessment scores still draw from `src/data/mockData.ts` pending their dedicated backend models.
