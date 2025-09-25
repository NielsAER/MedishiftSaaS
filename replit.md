# Medishift - Healthcare Timesheet Management SaaS

## Overview

Medishift is a comprehensive SaaS application designed to simplify timesheet management for hospitals, elderly care homes, and medical facilities. The platform addresses the challenge of complex manual timesheet creation by providing an automated, web-based solution that reduces administrative burden from hours to minutes.

The application features a configurable shift code system, interactive scheduling grids, and role-based access control to streamline workforce management in healthcare environments. Built as a full-stack TypeScript application, it provides real-time timesheet generation, conflict detection, and comprehensive facility management capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern component patterns
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Framework**: Radix UI components with shadcn/ui design system for consistent, accessible interfaces
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript for full-stack type safety
- **API Design**: RESTful endpoints with structured error handling and logging middleware
- **Authentication**: Replit's OpenID Connect (OIDC) integration with Passport.js strategy
- **Session Management**: Express sessions with PostgreSQL store for persistent authentication

### Database & ORM
- **Database**: PostgreSQL with Neon serverless driver for scalability
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Schema Design**: Relational model supporting facilities, teams, users, shift codes, timesheets, and shifts
- **Migrations**: Drizzle Kit for database schema versioning and deployment

### Authentication & Authorization
- **Strategy**: Replit OIDC integration for seamless user authentication
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Role-based Access**: Admin, Manager, and Staff roles with appropriate permissions
- **Security**: HTTPS enforcement, secure session cookies, and CSRF protection

### Data Architecture
- **User Management**: Hierarchical structure with facilities containing teams and staff members
- **Shift Code System**: Configurable codes with categories (shifts, vacation, training, sick leave)
- **Timesheet Structure**: Weekly/monthly views with grid-based shift assignment
- **Conflict Detection**: Automated validation for overlapping shifts and scheduling conflicts

### Development & Deployment
- **Monorepo Structure**: Shared schema between client and server for type consistency
- **Development Server**: Vite dev server with HMR for rapid iteration
- **Build Process**: Separate client (Vite) and server (esbuild) build pipelines
- **Environment**: Replit-optimized with development tooling and error overlays

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database for scalable data storage
- **Authentication**: Replit OIDC service for user identity management
- **Session Store**: PostgreSQL-based session persistence via connect-pg-simple

### UI & Design System
- **Component Library**: Radix UI primitives for accessible, unstyled components
- **Design Framework**: shadcn/ui for pre-built, customizable component implementations
- **Icons**: FontAwesome for comprehensive icon coverage
- **Styling**: Tailwind CSS for utility-first styling approach

### Development Tools
- **Replit Integration**: Cartographer for code navigation and dev banner for development environment
- **Error Handling**: Runtime error overlay for development debugging
- **Type Checking**: TypeScript compiler for static type analysis
- **Code Quality**: ESM modules with strict TypeScript configuration

### Runtime Libraries
- **Date Handling**: date-fns for comprehensive date manipulation and formatting
- **Form Management**: React Hook Form with Zod validation for type-safe form handling
- **Query Management**: TanStack React Query for efficient server state management
- **Validation**: Zod for runtime type validation and schema definition