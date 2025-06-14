# RedBut – Phase 2 & Phase 3 Implementation Summary  
*(MVP ‑ Client Section)*

---

## 1. Scope Recap
| Phase | Goal | Delivered |
|-------|------|-----------|
| **Phase 2** | Back-end persistence layer, authentication & CRUD services | Prisma PostgreSQL schema + migrations, NestJS modules (`auth`, `users`, `requests`, `orders`), JWT flow, REST/Swagger endpoints |
| **Phase 3** | Initial user-facing UX (mobile-first splash & buzz flow) | Animated splash screens, “Buzz Waiter” red button, burger-menu placeholder, anonymous-session bootstrap |

---

## 2. Database Layer (Prisma + PostgreSQL)

### 2.1 Schema Entities
| Model | Key Fields | Purpose |
|-------|------------|---------|
| `User` | `id`, `tableNumber`, `sessionId`, `createdAt` | Anonymous diner identity per visit |
| `Request` | `id`, `userId`, `tableNumber`, `content`, `status`, `createdAt/updatedAt` | Waiter / payment buzz with workflow statuses |
| `Order` | `id`, `tableNumber`, `sessionId`, `item`, `price`, `createdAt` | Items added to diner’s bill |
| `ChatMessage` | `id`, `userId`, `role`, `content`, `createdAt` | Stores chat transcript (future use) |

#### Enums
```
RequestStatus: New | OnHold | Cancelled | Done
ChatRole: user | assistant
```

### 2.2 Migrations
`prisma/migrations/*` created via `npx prisma migrate dev` – initializes all tables and indexes (`tableNumber+status`, `sessionId` etc.).

---

## 3. API Surface (NestJS)

Base URL: `/api/v1`

| Method | Route | Description |
|--------|-------|-------------|
| **Auth** |
| `POST` | `/auth/anon` | Create anonymous session → returns `{ userId, tableNumber, sessionId, token }` |
| **Requests** *(JWT required)* |
| `POST` | `/requests` | Create request (`status = New`). Duplicate “Ready to pay” guarded. |
| `GET` | `/requests?userId=X` | List by user |
| `GET` | `/requests?tableNumber=N` | List by table |
| `GET` | `/requests/:id` | Fetch single |
| `PUT` | `/requests/:id` | Update content/status, business-rule validation |
| **Orders / Bill** *(JWT required)* |
| `POST` | `/orders` | Add order item |
| `GET` | `/orders?tableNumber=N&sessionId=S?` | Bill summary `{ items[], total }` |
| `GET` | `/orders/:id` | Fetch order |
| `DELETE` | `/orders/:id` | Remove order |
| `DELETE` | `/orders/table/:tableNumber` | Clear all orders on table |

Additional:
- `/health` – Terminus health endpoint  
- `/hello` – “Hello RedBut” sanity check

### 3.1 Auth Tech
- `JwtStrategy` with bearer tokens  
- `JwtAuthGuard` protecting routes  
- Helper decorator `@GetUser()`  

---

## 4. Backend Modules & Services
```
src/
 ├─ auth/        (session + JWT)
 ├─ users/       (anonymous user CRUD)
 ├─ requests/    (waiter buzz workflow)
 ├─ orders/      (bill items & totals)
 ├─ common/prisma.service.ts
 └─ health/ hello/
```
All modules injectable; Prisma service manages connection lifecycle & optional dev query logging.

---

## 5. Front-End (Next 14 – Apps/web)

### 5.1 UX Flow Implemented
1. **App splash** – “RedBut” text zoom-in + underline (3 s)  
2. **Home screen**  
   - Big shiny **Red Button** (`Buzz Waiter`) center-aligned  
   - Burger menu icon placeholder  
3. **Agent splash** – when button pressed, “AI Agent” splash (3 s)  
4. **Chat placeholder** – full-screen overlay (Phase 4 to implement)  
5. **Anonymous session bootstrap**  
   - Prompt for table number → `POST /auth/anon` → store `redbutSession` & JWT in `localStorage`

Responsive with Tailwind; animations via Framer-motion & custom CSS keyframes.

### 5.2 Component/State Highlights
```ts
type Stage = 'splash' | 'home' | 'agentSplash' | 'chat';
const [stage,setStage]=useState<Stage>('splash');
```
- Splash containers reuse CSS classes `.splash-container` & `.splash-text`
- `red-button` utility for gradient/shadow
- All future chat & menu components plug into this state machine.

---

## 6. Dev-Ops & Tooling
- **Prisma client generation** script + `prisma:studio`
- **Turbo Repo** build pipeline (`dev`, `build`, `lint`, `test`)
- **GitHub Actions** CI (lint/test/build)  
- Local `.env.local` template ready (DATABASE_URL, JWT_SECRET, etc.).

---

## 7. Validation & Guards
- Request status transitions enforced (`OnHold → New/Cancelled`, etc.).
- Duplicate “Ready to pay” prevents spam.
- Users can only update their own requests (future roles TBD).

---

## 8. Known Gaps / Next Steps

| Phase | Planned Work |
|-------|--------------|
| **4 – Chat & AI** | Plug reusable `<ChatWindow>` component, Socket.IO gateway, OpenAI responses ending with courteous phrase. |
| **5 – Requests UI** | “My Requests” list + detail modal w/ editable status dropdown. |
| **6 – Bill UI** | Bill view, Ready-to-Pay button, duplicate check front-end. |
| **PWA & Optimise** | Re-enable `next-pwa`, CSS optimisation, add manifest icons. |
| **Waiter/Admin sites** | Separate sub-apps & roles, real-time waiter pager. |
| **Testing** | Cypress mobile E2E, improve Jest coverage, seed scripts. |
| **CI Deploy** | Docker compose (db+api+web), Railway/Fly deployment workflows. |

---

## 9. How to Run Locally
```bash
# 1. Start Postgres (or docker compose up db)
# 2. Configure .env.local
npm install
npm run prisma:migrate          # create tables
npm run dev                     # web on :3000, api on :3001
```
Open:
- `http://localhost:3000` – Client UI  
- `http://localhost:3001/api/docs` – Swagger API  

Phase 2 & 3 deliver a full stack baseline (auth, DB, core endpoints, splash UX) for continued feature development. 🚀
