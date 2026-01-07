# Choice Properties - Full Stack Real Estate Application

## Overview
Choice Properties is a full-stack real estate platform designed to streamline property browsing, rental applications, and the entire lease workflow. The application aims to provide a comprehensive solution for both tenants and landlords, offering features from property discovery to digital lease signing and move-in coordination. The business vision is to modernize the real estate rental process, enhance user experience, and provide robust tools for property management, thereby capturing a significant share of the digital rental market.

## User Preferences
- I prefer simple language and clear explanations.
- I want iterative development, with frequent, small updates.
- Ask before making major changes or architectural decisions.
- Do not make changes to files related to authentication without explicit approval.
- Ensure all new features are thoroughly tested before integration.

## System Architecture
The application is built with a React frontend, an Express.js backend, and a PostgreSQL database managed by Supabase.

**UI/UX Decisions:**
- **Design System:** Utilizes TailwindCSS and Shadcn UI components for a consistent and modern aesthetic.
- **Key Dashboards:** Features dedicated dashboards for tenants and landlords, offering visual timelines and status tracking for leases.
- **Interactive Elements:** Incorporates interactive checklists and status indicators for an engaging user experience.

**Technical Implementations:**
- **Frontend:** React 18.3.1 with Vite for fast development, Wouter for routing, React Query for data fetching, and Context API for state management.
- **Backend:** Express.js and Node.js for API services, with a focus on thin routes and a storage service layer.
- **Authentication:** JWT-based authentication handled by Supabase Auth, including role-based access control (user, agent, landlord, admin, property_manager).
- **Database Interaction:** Drizzle ORM for type-safe queries, with schema definitions in `shared/schema.ts` and Zod for validation.
- **Security:** Implements Row Level Security (RLS) on all tables, rate limiting on sensitive endpoints, encrypted database connections, and secure session management. Helmet security headers are used for enhanced production security.
- **Lease Workflow:** Comprehensive digital lease management including preparation, delivery, acceptance, digital signatures, and move-in coordination.
- **Payment Audit:** Full audit trail for all payment actions, with role-based access to payment verification and logs. Payments are non-deletable for financial accountability.
- **Property Manager Role:** A new `property_manager` role with granular, scoped access to properties and associated tasks (applications, leases, payments, messaging).

**Feature Specifications:**
- **Authentication:** User signup/login, JWT tokens, role-based access, automatic user record creation.
- **Properties:** Browsing, filtering, detailed views, saving favorites, rental application submission.
- **Lease Management:** Landlord lease creation, digital delivery, tenant acceptance/declining, electronic signing, move-in preparation (key pickup, utilities, checklist).
- **Dashboards:** Tenant Lease Dashboard with visual timeline and move-in readiness; Landlord Lease Dashboard with pipeline overview and quick actions.
- **Inquiries & Reviews:** Submission of property inquiries, 1-5 star reviews.
- **User Management:** Customizable user profiles, agent profiles, admin panel, saved searches.
- **Payment Auditing:** Detailed logging of payment events, role-based controls, and deletion prevention.
- **Property Manager Capabilities:** Management of assigned properties, applications, leases, and payments with fine-grained permissions.

## External Dependencies
- **Supabase:** Database (PostgreSQL), Authentication, Storage (for property images, profile images, documents).
- **ImageKit:** Image optimization and delivery.
- **SendGrid (Optional):** Email notifications.
- **TailwindCSS:** CSS framework.
- **Shadcn UI:** UI component library.
- **React Query (@tanstack/react-query):** Data fetching and caching.
- **Wouter:** Frontend routing.
- **React Hook Form:** Form management.
- **Zod:** Schema validation.
- **Drizzle ORM:** Type-safe database queries.
- **Helmet:** Security headers.

## Recent Changes (January 07, 2026)
- **Login Polish:** Aligned login UI with signup flow using SaaS-style cards, h-12 inputs, and enhanced motion transitions.
- **Verification UX:** Integrated "Email Pending Verification" handling directly into the login flow with an inline resend button.
- **Signup Polish:** Implemented SaaS-style signup form with role selection, password strength meter, hover elevations, and smooth transitions.
- **Auth Security:** Migrated signup to atomic backend transactions with role validation and error handling.

## Previous Changes (December 17, 2025)
- **Email Verification Flow:** Implemented production-grade email verification with proper redirect URLs using `getAppUrl()` helper
- **APP_URL Configuration:** Added `VITE_APP_URL` environment variable support for custom domains with automatic fallback to `window.location.origin` for Replit
- **Resend Verification:** Email stored in localStorage (`pending_verification_email`) to allow resend even before auth state hydrates
- **Auth Callback Improvements:** Enhanced `/auth/callback` page with proper session handling, email verification detection, and role-based redirects
- **Status Check Enhancement:** Verify-email page now re-fetches session to check actual `email_confirmed_at` status

## Previous Changes (December 16, 2025)
- **API Migration:** Migrated frontend API calls to use /api/v2/* endpoints for properties, applications, and other resources
- **Skeleton Loading:** Added comprehensive skeleton loaders for dashboards (RenterDashboardSkeleton, LandlordDashboardSkeleton) for improved perceived performance
- **API Client Enhancements:** Updated client/src/lib/api.ts with authentication token support and consistent error handling
- **Dashboard Polish:** Renter and landlord dashboards now show smooth skeleton loading states while data is being fetched