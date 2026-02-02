✅ PROMPT (copy-paste dit letterlijk):

Prompt:
Build a full SaaS MVP called Medishift — a web application designed for hospitals, elderly care homes, and medical facilities to simplify complex timesheet management. The goal is to reduce the current manual workload from ~2–3 hours to under 1 hour by automating code handling, shift generation, and staff schedule visualization. Below are the complete requirements and architecture details you must follow:

⸻

1. Core Idea

Currently, head nurses or managers manually fill in complex timesheets for dozens of staff members. Each staff member has different codes (like M22, N11, AFW, L98, V02, etc.), representing specific shifts, departments, vacations, or roles. These are currently filled manually in Excel-like sheets.

Our SaaS should automate this by providing:
	•	A web-based dashboard where managers can generate, view, and manage timesheets.
	•	A code system that is configurable and reusable.
	•	A smart UI that makes it easy to input shifts, assign codes, and visualize schedules.

⸻

2. MVP Features (must be built in v1)

A. User Roles
	•	Admin: Can create facilities, add users, and manage code definitions.
	•	Manager: Can create and edit timesheets for their team.
	•	Staff (optional in MVP): View their own schedule.

B. Code Management
	•	Ability to define and edit shift codes (e.g. M22, N11, AFW, V02, L98, TK), each with:
	•	Code name
	•	Description
	•	Hours (start/end)
	•	Category (Shift, Vacation, Training, Sick leave, etc.)
	•	Codes can be preloaded (from the .numbers file provided) or created manually.

C. Timesheet Generator
	•	Dynamic weekly/monthly timesheet view per team member.
	•	Add shifts by clicking a cell and selecting from predefined codes.
	•	Bulk actions: Copy week, paste schedule, auto-fill based on pattern.
	•	Color coding: Each code type should have its own color (just like the provided Excel image).
	•	Auto-calculation: Total hours per person, overtime, vacation days, etc.

D. Dashboard
	•	Facility-wide overview with filters (team, week, employee).
	•	Export to Excel/PDF.
	•	Quick conflict detection (e.g. overlapping shifts, missing days).

⸻

3. Advanced (optional for MVP+)
	•	Auto-scheduling suggestion engine based on past patterns.
	•	API integration with payroll software (JSON export).
	•	Notifications (e.g. “Missing schedule for Wendy this week”).

⸻

4. Tech Stack (Recommended)
	•	Frontend: Next.js (React + Tailwind)
	•	Backend: Node.js (Express) or Next.js API routes
	•	Database: PostgreSQL (Supabase or Prisma ORM)
	•	Auth: Clerk or Supabase Auth (email/password + role-based)
	•	Deployment: Vercel (frontend) + Supabase (backend/db)

⸻

5. UI Requirements
	•	Clean, medical-grade UI: white background, light blue/green accent.
	•	Weekly grid view similar to Excel, but interactive.
	•	Sidebar: Filters (Team, Employee, Week).
	•	Topbar: Month/Week navigation.
	•	Modal to edit/add code.

⸻

6. Key User Stories

Manager:
	•	“I can upload or define shift codes once and reuse them.”
	•	“I can drag-and-drop or click to assign shifts quickly.”
	•	“I see total hours per person immediately.”
	•	“I can export the schedule and send it to HR/payroll.”

Admin:
	•	“I can manage all codes and facility settings.”
	•	“I can view and audit all timesheets.”

⸻

7. Acceptance Criteria
	•	Timesheet creation for 20+ employees must be possible within 1 hour.
	•	Each shift cell can be edited in <2 clicks.
	•	Codes are color-coded and auto-calculated.
	•	Export works without formatting issues.

⸻

8. Example Workflow
	1.	Admin defines codes:
	•	M22 → Morning shift 06:00–14:00
	•	N11 → Night shift 22:00–06:00
	•	AFW → Vacation
	•	V02 → Special duty
	•	L98 → Training
	2.	Manager logs in and selects “Team Z3” and “September 2025.”
	3.	The grid auto-generates based on the number of staff.
	4.	Manager clicks cells and selects codes from a dropdown.
	5.	Totals and errors update in real-time.
	6.	Manager exports schedule to Excel/PDF and sends to HR.

⸻

9. Non-Functional Requirements
	•	Fast loading (<2s per view).
	•	Mobile-responsive grid.
	•	Role-based access control.
	•	Secure (JWT auth, HTTPS enforced).

⸻

10. Name & Branding

Project name: Medishift
Tagline: “Timesheets. Simplified.”
Color palette: White (#FFFFFF), Medical Blue (#2A73CC), Soft Green (#45C59B)

⸻

Deliverable: A production-ready SaaS MVP with a full stack implementation of the above features, including database schema, frontend UI, API endpoints, and export functionality.