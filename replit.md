# Overview

LearnHub is a comprehensive Learning Management System (LMS) web application designed for online training delivery. The platform enables users to access and complete training modules with integrated assessments, while administrators can create and manage educational content. Built as a full-stack TypeScript application, it features a React frontend with shadcn/ui components and an Express backend with PostgreSQL database.

## Key Features

**Enhanced Learning Experience:**
- **Block-based module content**: Modules use alternating text blocks and inline questions for progressive learning
- **Inline questions**: Users answer questions while learning, contributing to their final score
- **Combined scoring**: Final module score combines inline question performance with end-of-module quiz results

**User & Group Management:**
- **User management**: Admins can view user progress, update roles, and see quiz attempt history
- **Group management**: Create groups to organize users, add/remove members easily
- **Training pathways**: Bundle multiple modules into structured learning experiences
- **Pathway assignments**: Assign pathways to groups or individual users

The application serves two primary user roles:
- **Users**: Access published training modules, answer inline questions, complete quizzes, and track learning progress
- **Admins**: Create/edit modules with content blocks, manage users/groups, build training pathways, and view results

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React 18 with TypeScript and Vite as the build tool

**UI Component System**: 
- shadcn/ui component library (New York style variant) built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Component-based architecture with reusable UI elements stored in `client/src/components/ui/`

**Routing**: 
- Wouter for client-side routing (lightweight alternative to React Router)
- Protected routes implemented via `ProtectedRoute` component wrapper
- Role-based access control for admin routes

**State Management**:
- TanStack Query (React Query) for server state and data fetching
- Local component state with React hooks
- Custom `useAuth` hook for authentication state

**Design System**:
- Material Design influence with focus on clarity and usability
- Inter font family for typography
- Responsive mobile-first layout with Tailwind breakpoints
- Consistent spacing primitives (2, 4, 6, 8, 12, 16 Tailwind units)
- Dark/light theme support via ThemeProvider context

## Backend Architecture

**Framework**: Express.js with TypeScript

**API Pattern**: RESTful API with conventional HTTP methods
- Authentication routes: `/api/auth/*`
- User-facing routes: `/api/modules/*`, `/api/quiz/*`
- Admin routes: `/api/admin/*` (protected with `isAdmin` middleware)

**Authentication & Authorization**:
- Replit OIDC (OpenID Connect) integration for authentication
- Passport.js for authentication middleware
- Express sessions stored in PostgreSQL via `connect-pg-simple`
- Role-based authorization with `isAuthenticated` and `isAdmin` middleware guards

**Session Management**:
- PostgreSQL-backed session store for persistence
- 7-day session TTL
- Secure, HTTP-only cookies

**Request Handling**:
- JSON body parsing with raw body preservation for webhook support
- URL-encoded form data support
- Request logging with timestamps and response details

## Data Storage

**Database**: PostgreSQL via Neon serverless driver

**ORM**: Drizzle ORM with type-safe schema definitions

**Schema Structure** (defined in `shared/schema.ts`):

1. **users** - User accounts with role support (admin/user)
   - Stores profile data (email, name, avatar)
   - Role determines access permissions

2. **modules** - Training modules
   - Contains title, description, order, published status
   - Optional image URL for visual representation

3. **moduleSections** - Content sections within modules (legacy)
   - Rich text content via HTML
   - Optional images per section
   - Ordered sections for structured learning flow

4. **contentBlocks** - Block-based module content
   - Supports text blocks and question blocks
   - blockType: 'text' or 'question' to differentiate content
   - Questions include options, correctOptionIndex, explanation

5. **quizzes** - Assessment configuration per module
   - Configurable passing score threshold (default 70%)
   - One quiz per module relationship

6. **quizQuestions** - Multiple choice questions
   - 4 options per question with single correct answer
   - Ordered presentation

7. **quizAttempts** - User quiz submission records
   - Stores score, pass/fail status, user answers
   - Includes inlineAnswers for block-based question tracking
   - Timestamp for tracking completion

8. **userGroups** - Groups for organizing users
   - Contains name and description

9. **groupMembers** - Membership associations
   - Links users to groups with join timestamp

10. **trainingPathways** - Bundled learning experiences
    - Contains name and description
    - Groups modules into structured pathways

11. **pathwayModules** - Modules within pathways
    - Links modules to pathways with orderIndex

12. **pathwayAssignments** - Pathway assignments
    - Assigns pathways to groups or individual users

13. **sessions** - Express session storage
    - Manages authenticated user sessions

**Database Migrations**: Managed via Drizzle Kit with migration files in `/migrations`

## External Dependencies

**Third-Party Services**:
- **Replit Auth**: OIDC-based authentication provider
- **Neon**: Serverless PostgreSQL database hosting

**Key NPM Packages**:

*Frontend*:
- `react` & `react-dom` - UI framework
- `@tanstack/react-query` - Server state management
- `wouter` - Client-side routing
- `@radix-ui/*` - Headless UI primitives (30+ components)
- `tailwindcss` - Utility-first CSS framework
- `zod` - Schema validation
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Form validation integration

*Backend*:
- `express` - Web application framework
- `drizzle-orm` - Database ORM
- `@neondatabase/serverless` - PostgreSQL client
- `passport` & `passport-local` - Authentication middleware
- `express-session` - Session management
- `connect-pg-simple` - PostgreSQL session store
- `openid-client` - OIDC client for Replit Auth
- `ws` - WebSocket support for Neon

*Build & Development*:
- `vite` - Frontend build tool and dev server
- `tsx` - TypeScript execution for server
- `esbuild` - Backend bundling
- `drizzle-kit` - Database schema management

**Asset Management**: 
- Static files served from `dist/public` in production
- Vite dev server handles assets in development
- Image uploads stored as URLs (implementation may use cloud storage or local filesystem)