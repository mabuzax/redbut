# RedBut 🍽️🤖  
AI-powered Restaurant Waiter Assistant – **Monorepo (Turbo, NestJS, Next.js, PostgreSQL)**

---

## Table of Contents
1. [Project Vision](#project-vision)  
2. [Tech Stack](#tech-stack)  
3. [Repository Layout](#repository-layout)  
4. [Prerequisites](#prerequisites)  
5. [Getting Started](#getting-started)  
6. [Common Scripts](#common-scripts)  
7. [Development Guidelines](#development-guidelines)  
8. [Environment Variables](#environment-variables)  
9. [CI / CD](#ci--cd)  
10. [Roadmap](#roadmap)  

---

## Project Vision
RedBut delivers a seamless dining experience by giving customers, waiters and managers their own tailored web applications:

| Section | URL | Purpose |
|---------|-----|---------|
| **Client** | `redbut.ai` | Mobile-first interface for guests (buzz waiter, chat with AI, view bill). |
| **Waiter** | `waiter.redbut.ai` | Real-time queue of guest requests. |
| **Admin**  | `admin.redbut.ai`  | Menu management, analytics, staff tools. |

_Current milestone: **Phase 1** – scaffolding & hello-world apps for API and Web._

---

## Tech Stack
| Layer | Tech |
|-------|------|
| **Frontend** | Next 14 (App Router), TailwindCSS, Framer-Motion |
| **Backend**  | NestJS 10, TypeORM/Prisma (PostgreSQL) |
| **Realtime / Chat** | Socket.IO + OpenAI (Phase 4) |
| **Monorepo** | Turbo Repo workspaces (`apps/*`) |
| **Tooling** | ESLint, Prettier, Husky, Commitlint, Jest, Cypress |

---

## Repository Layout
```
redbut/
│
├── apps/
│   ├── api/       # NestJS backend
│   │   └── src/
│   └── web/       # Next.js frontend (client section)
│       └── app/
│
├── prisma/        # Database schema & migrations (phase 2)
├── .github/       # Workflows (CI)
├── package.json   # Root scripts + dependencies
└── turbo.json     # Turborepo pipeline config
```

---

## Prerequisites
* **Node.js ≥ 18** (includes npm)
* **Git**  
* **PostgreSQL 14+** (only required from Phase 2)  
* _Optional_ – **pnpm** if you prefer (the repo works with npm out-of-the-box)

---

## Getting Started

```bash
# 1. Clone
git clone https://github.com/<your-org>/redbut.git
cd redbut

# 2. Install root dependencies
npm install      # or pnpm install

# 3. Start both apps in watch-mode
npm run dev      # runs via Turbo: web on :3000, api on :3001
```

Open:

* Frontend – `http://localhost:3000`  
* API – `http://localhost:3001/api/v1/hello` → `{ "message": "Hello RedBut" }`

> Tip: each app can also be launched individually from its directory (`npm run dev`).

---

## Common Scripts

| Root Script | Description |
|-------------|-------------|
| `npm run dev` | Runs `dev` for **all** apps (watch mode). |
| `npm run build` | Production build for every package. |
| `npm run start` | Runs compiled production servers. |
| `npm run lint` | ESLint across workspace. |
| `npm run test` | Jest unit tests. |
| `npm run clean` | Remove build artifacts & node _modules. |

### Per-package (example for API)
```bash
cd apps/api
npm run dev      # nest start --watch
npm run build
npm run start
```

---

## Development Guidelines

### Code Style
* **Prettier** auto-formats on commit (`lint-staged`).  
* **ESLint** rules inherited from `@typescript-eslint` & `next`.  
* Run `npm run format` any time.

### Commits
Conventional Commit messages enforced by **Commitlint**.  
Example: `feat(api): add hello endpoint`

### Branch Strategy
* `main` – always deployable.  
* `feat/*`, `fix/*` – feature / bug branches → PR → `main`.

### Testing
* **Unit** – Jest (`*.spec.ts`).  
* **E2E** – Cypress mobile viewport (Phase 7).  
* Minimum 70 % coverage on new modules.

---

## Environment Variables

Create `.env.local` files inside each app or root:

| Variable | Default | Where | Purpose |
|----------|---------|-------|---------|
| `PORT` | `3001` | apps/api | API port |
| `FRONTEND_URL` | `http://localhost:3000` | apps/api | CORS origin |
| `API_URL` | `http://localhost:3001` | apps/web | Proxy to backend |
| _DB vars (Phase 2)_ | | | |

---

## CI / CD
GitHub Actions:

1. **lint-test** → ESLint + Jest  
2. **build** → Turbo build cache  
3. **deploy** – push to Railway/Fly (preview & prod)

> ⚠️ In Phase 1 only lint-test runs; deploy steps come later.

---

## Roadmap

| Phase | Highlights | Status |
|-------|------------|--------|
| 1 | Monorepo scaffolding, “Hello RedBut” API + Web | ✅ |
| 2 | Database layer, Prisma migrations | ⏳ |
| 3 | Splash screens & Buzz Waiter button | ⏳ |
| 4 | Real-time AI chat (OpenAI) | ⏳ |
| 5 | Requests dashboard & status updates | ⏳ |
| 6 | Billing view & Ready-to-Pay flow | ⏳ |
| 7 | Polish, accessibility, E2E tests | ⏳ |

---

### Contributing
PRs welcome! Please read `CONTRIBUTING.md` (to be added) for workflow & code standards.

---

Made with ❤️ by the **RedBut** team.
