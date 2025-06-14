# RedBut – Waiter Section Implementation Plan

## 1 . Overview
The **Waiter Section** is a dedicated web application (Next.js / React) served from the sub-domain **`waiter.redbut.ai`**.  
Its purpose is to give wait-staff real-time visibility into customer requests, performance analytics, and customer reviews while remaining mobile-first, fast, and beautiful.

```
┌────────────┐  HTTPS  ┌──────────────────────┐
│  Browser   │ ───────▶│  Next.js Waiter SPA  │
└────────────┘          │  (apps/waiter)      │
                        └────────┬────────────┘
                               REST / WS
                        ┌────────▼────────────┐
                        │  NestJS API (3001)  │
                        │  (apps/api)         │
                        └────────┬────────────┘
                                DB
                        ┌────────▼────────────┐
                        │ PostgreSQL (RDS)    │
                        └──────────────────────┘
```

## 2 . Repository & Deployment Structure
| Area                  | Location in Monorepo                     | Sub-domain / Port            |
|-----------------------|------------------------------------------|------------------------------|
| Waiter Frontend       | `apps/waiter` (Next 13 +/app router)     | `waiter.redbut.ai` (:3002 dev) |
| Shared UI & Utils     | `packages/ui`, `packages/lib`            | –                            |
| Backend API           | `apps/api` (NestJS)                      | `api.redbut.ai` (`localhost:3001`) |
| Database Migrations   | `prisma/` (single schema, sub-paths)     | PostgreSQL 16                |

## 3 . Database Design (Prisma ↔ PostgreSQL)
### 3.1 New / Updated Tables

| Table            | Key Columns                                             | Notes |
|------------------|---------------------------------------------------------|-------|
| `requests`       | `id PK`, `user_id FK`, `table_number`, `content`, `status ENUM('New','Acknowledged','InProgress','Completed')`, `created_at`, `updated_at` | add waiter-side statuses |
| `reviews`        | `id PK`, `user_id FK`, `rating INT`, `content`, `created_at` | already exists for client; waiter reads |
| `waiter_metrics` | `id PK`, `waiter_id`, `metric_date`, `open_handled`, `avg_response_time`, `rating_avg` | daily AI analysis snapshot |

All changes are captured in a single migration:
```
npx prisma migrate dev -n waiter-section-phase2
```

## 4 . HTTP & WebSocket API Specification
| Method & Path                               | Auth | Purpose |
|---------------------------------------------|------|---------|
| `GET /api/v1/requests/active`               | JWT  | List active requests (status ∈ New·Acknowledged·InProgress) |
| `PUT /api/v1/requests/:id/status`           | JWT  | Update status → `Acknowledged | InProgress | Completed` |
| `GET /api/v1/requests/summary`              | JWT  | `{ open:number, closed:number }` counts |
| `GET /api/v1/reviews/summary`               | JWT  | `{ averageRating:number, totalReviews:number }` |
| `GET /api/v1/reviews`                       | JWT  | Paginated list for timeline /?page | size |
| `GET /api/v1/ai/performance-today`          | JWT  | Returns analytic text & metrics |
| `ws://.../waiter` *(future)*                | JWT  | Push new requests in real-time |

All endpoints live in a new **WaiterModule** inside `apps/api`.

## 5 . Frontend Component Map (`apps/waiter`)
```
/app
  ├─ layout.tsx              global shell
  ├─ page.tsx                Dashboard
  ├─ components/
  │   ├─ RequestTable.tsx
  │   ├─ RequestDetailSheet.tsx
  │   ├─ RequestsSummaryCard.tsx
  │   ├─ AIAnalysisCard.tsx
  │   ├─ ReviewsSummaryCard.tsx
  │   └─ ReviewsTimeline.tsx
  └─ lib/
      └─ api.ts              typed fetch helpers
```

### 5.1 Dashboard Cards
1. **Active Requests Table**
   * React-Table + Tailwind, mobile-scrollable.
   * Row click → `<RequestDetailSheet>` (Radix Dialog or shadcn/Sheet)
     - Dropdown mapped to valid transitions.
     - Submit → `PUT /requests/:id/status`, optimistic update.
2. **Requests Summary**
   * Shows `"Open {open} | Closed {closed}"` from `/requests/summary`.
3. **AI Analysis**
   * Placeholder text + button → modal fetching `/ai/performance-today`.
4. **Your Reviews**
   * 5-star display (`averageRating`) + `"Reviews {total}"`.
   * “Show Reviews” → `<ReviewsTimeline>` (infinite scroll).

### UI/UX
* Tailwind + shadcn/ui components
* Dark-on-light sleek theme, large touch targets
* Responsive grid (1 col mobile → 2 cols tablet → 4 cols desktop)

## 6 . Authentication & Security
* Waiters authenticate via email/password (later SSO).
* JWT stored in HttpOnly cookie; Next.js route handlers proxy with `Authorization: Bearer`.
* RBAC Guard in Nest: role `Waiter` grants access to waiter endpoints only.

## 7 . Implementation Phases
| Phase | Scope |
|-------|-------|
| **2.1** | Scaffold `apps/waiter`, shared ESLint/TS config, Tailwind theme. |
| **2.2** | Backend: Prisma migration, `RequestsController` list/summary/update. |
| **2.3** | Frontend: ActiveRequestsTable + RequestDetailSheet with mutations. |
| **2.4** | Summary, AIAnalysisCard (static), ReviewsSummaryCard (mock). |
| **2.5** | ReviewsTimeline with lazy loading, backend reviews endpoints. |
| **2.6** | AI analysis endpoint (stub) + modal UI. |
| **2.7** | JWT auth (waiter login page) & role guard. |
| **2.8** | Polish: validations, toasts, loading skeletons, E2E Cypress tests. |
| **2.9** | (Stretch) WebSocket live updates via `socket.io` namespace `/waiter`. |

## 8 . Testing Strategy
* **Unit**: Nest services & controllers with Jest.
* **Component**: React Testing Library for table, sheet.
* **E2E**: Cypress script—login, update status, view counts.
* **CI**: GitHub Actions workflow runs `turbo run test lint build`.

## 9 . Deployment & Dev-Ops
* **Vercel** for `apps/waiter` → `waiter.redbut.ai`.
* **Render / Fly.io** for `apps/api` (shared with client).
* **Automatic preview** on PR via Vercel/Preview URL.
* **Env Vars**:  
  `NEXT_PUBLIC_API_URL` =`https://api.redbut.ai`  
  `JWT_SECRET`, `DATABASE_URL`, etc.

---

_© 2025 RedBut – Phase 2 Waiter Section Plan_
