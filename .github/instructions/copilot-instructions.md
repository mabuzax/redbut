# RedBut AI Coding Assistant Instructions

## Project Overview
RedBut is an AI-powered restaurant waiter assistant system. It provides three main interfaces: customer app (`/web`), waiter dashboard (`/waiter`), admin panel (`/admin`), and a NestJS API (`/api`).

## Architecture & Core Patterns

### NOT A Monorepo Structure
- **Treat ALL as STANDALONE**
- **Shared Prisma schema** at `/prisma/schema.prisma` with output to `apps/api/node_modules/.prisma/client`
- **Development workflow**: Run `npm run dev` from root to start all apps simultaneously

### Database & State Management
- **PostgreSQL + Prisma ORM** with centralized schema and migrations
- **Key entities**: User (guests), Waiter (staff), Request, Order
- **Session-based architecture**: Guests are identified by `sessionId` + `tableNumber`, with direct waiter assignment
- **Status management**: Orders use configurable status transitions via `OrderStatusConfigService`, Requests use fixed statuses

### API Patterns
- **NestJS with global `/api/v1` prefix** and JWT authentication
- **Role-based access**: Guards enforce admin/waiter/client permissions using `@Roles()` decorator
- **Validation**: All DTOs use `class-validator` with comprehensive error messages and transform pipes
- **Error handling**: Consistent exception throwing with user-friendly messages (BadRequestException, ConflictException, etc.)
- **AI endpoints**: Dedicated AI controllers (e.g., `/admin/table-allocations/ai`) for natural language interactions

### Real-time Features
- **WebSocket gateway** at `/chat` namespace for AI conversations
- **Socket.IO authentication** via handshake token validation
- **Real-time updates** for requests, orders, and waiter assignments

## Development Workflows
Development is on Windows, so use Powershell commands.

### Local Development
Always change to the correct directory before running commands:
```bash
npm install             
npm run dev          
npm run prisma:migrate
npm run prisma:studio 
```

### Testing Strategy
- **Frontend tests**: Jest + React Testing Library in `__tests__/` directories
- **Mocking patterns**: Socket.IO, fetch API, localStorage mocked in `__tests__/setup.ts`
- **Test file naming**: `*.test.tsx` for components, comprehensive error state testing
- **API testing**: No current E2E setup, relies on unit tests with mocked dependencies

### Docker & Environment
- **Multi-service setup**: PostgreSQL (port 5433), Redis (port 6379), API, and frontends
- **Environment variables**: Shared `.env.local` files, DATABASE_URL points to containerized postgres
- **Health checks**: Database and Redis have health checks before API startup

## Project-Specific Conventions

### Authentication & Security
- **Anonymous users**: Automatically created with `sessionId` and `tableNumber` for guest dining
- **Waiter authentication**: Email/password with JWT tokens, role-based route protection
- **Admin access**: Separate admin accounts with elevated permissions

### Status Transitions
Status changes are centrally managed with validation:
```typescript
// Both requests and orders use configurable status validation
await this.requestStatusConfigService.validateTransition(
  currentStatus, targetStatus, userRole
);
```

### Component Patterns (Next.js Apps)
- **Zustand for state management** in frontend apps
- **TailwindCSS + Framer Motion** for styling and animations
- **API communication via axios** with bearer token authentication
- **Error boundaries** and loading states for all data fetching

### AI Integration
- **LangChain + OpenAI** for chat functionality
- **Natural language endpoints** for admin operations (staff management, order analytics)
- **Context-aware responses** using restaurant domain knowledge

## Key Files to Reference
- `/prisma/schema.prisma` - Central data model and relationships
- `/apps/api/src/app.module.ts` - API service registration and module structure
- `/apps/api/src/main.ts` - CORS, validation pipes, and Swagger setup
- `/apps/api/src/common/` - Shared services (status validation, caching, Prisma)
- `/docker-compose.yml` - Local development infrastructure

## Common Debugging Points
- **CORS issues**: Check `FRONTEND_URL` environment variables and origins in `main.ts`
- **Database connection**: Verify Docker containers are healthy and DATABASE_URL format
- **WebSocket authentication**: Token validation happens in handshake, check auth headers
- **Status transition errors**: Validate transitions are allowed for user role in status config services
- **Status badge clicks**: Status badges in waiter/admin apps need `onClick` prop and `cursor-pointer` styling to be interactive
- **PowerShell command issues**: Use semicolon (`;`) instead of `&&` for command chaining in Windows PowerShell

## Interactive Component Patterns
- **StatusBadge components**: Must include `onClick?: (e: React.MouseEvent) => void` prop for clickability
- **Dropdown integration**: Use `data-*` attributes for DOM querying when connecting badges to dropdowns
- **Status updates**: Always call `e.stopPropagation()` in badge onClick to prevent parent element events
- **Dropdown accessibility**: Ensure dropdowns are always in DOM when status badges reference them (not conditionally rendered)
- **Async dropdown loading**: Use `setTimeout` with small delay when programmatically focusing dropdowns after loading options

## Cleanup Policy
**CRITICAL**: Always clean up temporary files, scripts, and debugging artifacts before completing tasks:
- Remove any temporary `.tmp`, `.debug`, or test scripts created during troubleshooting
- Delete generated log files or output files not part of the permanent test suite
- Clean up any experimental configuration files (`.test.env`, `debug-docker-compose.yml`, etc.)
- Remove temporary directories created for analysis or debugging
