# Medishift Healthcare Timesheet SaaS - Design Guidelines

## Design Approach

**System Foundation:** Material Design adapted for clinical/medical software, drawing inspiration from enterprise healthcare platforms like Epic and modern clinical dashboards. Emphasize data clarity, professional hierarchy, and precision over decorative elements.

**Core Principles:**
- Clinical precision: Clear visual hierarchy for critical scheduling data
- Professional trust: Clean, uncluttered layouts that communicate reliability
- Data-first design: Information density balanced with breathing room
- Scannable interfaces: Users should quickly parse shift patterns and coverage gaps

---

## Typography System

**Font Stack:** Inter (primary), Roboto Mono (data/time displays)
- Via Google Fonts CDN

**Hierarchy:**
- Dashboard Headers: 32px, font-semibold (tracking-tight)
- Section Titles: 24px, font-semibold
- Card Headers: 18px, font-medium
- Body Text: 15px, font-normal (line-height-relaxed)
- Metric Labels: 13px, font-medium, uppercase, tracking-wide
- Data Values: 28px, font-bold (metrics), 14px Roboto Mono (times/dates)
- Table Headers: 12px, font-semibold, uppercase, tracking-wider
- Supporting Text: 13px, font-normal

**Usage Context:**
- Use Inter for all interface elements and readable content
- Reserve Roboto Mono exclusively for timestamps, shift times, duration displays, and employee IDs

---

## Layout & Spacing System

**Tailwind Spacing Primitives:** Consistently use units of 2, 4, 6, 8, 12, 16, 20, 24

**Container Structure:**
- Page padding: px-6 py-8 (desktop), px-4 py-6 (mobile)
- Card padding: p-6 (desktop), p-4 (mobile)
- Component gaps: gap-6 (cards/sections), gap-4 (related items), gap-2 (tight groupings)
- Section spacing: mb-8 (major sections), mb-6 (subsections)

**Grid Systems:**
- Primary dashboard: 3-column grid on lg+ (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Metric cards: 4-column on xl (grid-cols-2 lg:grid-cols-4)
- Shift calendar: Full-width with responsive breakpoints
- Table layouts: Full-width with horizontal scroll on mobile

**Responsive Breakpoints:**
- Mobile: Stack all cards single column, condensed metrics
- Tablet (md): 2-column layouts for cards
- Desktop (lg+): Full 3-4 column grids, expanded sidebar

---

## Component Library

### Navigation Structure

**Top Navigation Bar:**
- Fixed header: h-16, flex justify-between items-center
- Left: Logo + product name (24px font-semibold)
- Center: Breadcrumb navigation (14px with separators)
- Right: Global search, notifications (badge counts), user profile dropdown
- Border-bottom with subtle shadow

**Sidebar Navigation (Left):**
- Width: w-64 on desktop, collapsible to icons-only (w-20)
- Navigation items: py-3 px-4, gap-3, rounded-lg
- Icons: 20px from Heroicons (outline style), paired with labels
- Active state: Filled background with stronger emphasis
- Sections: Dashboard, Timesheets, Schedule, Team, Reports, Settings
- Pinned shortcuts at bottom: Help, Support

### Dashboard Components

**Metric Cards (KPI Summary):**
- Structure: Flex column with icon, value, label, trend indicator
- Icon placement: Top-left, 40px size, contained in circle background
- Value: Large 28px bold display
- Label: 13px uppercase with description below
- Trend: Small chart sparkline or percentage change with arrow icon
- Content: Total Hours (week), Active Shifts (today), Team Coverage (%), Pending Approvals

**Filter Controls Bar:**
- Horizontal flex row with gap-4
- Date range picker (week/month toggle buttons, custom date selector)
- Facility/department dropdown
- Team member multi-select
- Export/Print action buttons (right-aligned)
- All controls: h-10, rounded-lg borders

**Shift Calendar Grid:**
- Table structure with sticky header row
- Columns: Employee name (frozen left) + 7 day columns
- Cells: Shift blocks showing time range, duration, role badge
- Visual indicators: Border-left accent for shift type (day/night/on-call)
- Interactive: Click cell to view/edit shift details
- Footer row: Daily total hours per column
- Empty states: Dotted borders for uncovered shifts

**Coverage Visualization:**
- Stacked horizontal bar chart showing shift distribution
- Time axis (0-24 hours) with coverage density
- Segmented by shift type with labels
- Gaps highlighted with distinctive treatment
- Interactive tooltips on hover showing detailed breakdown

**Team Summary Cards:**
- Grid of employee cards (2-column on md, 3-column on lg)
- Photo placeholder (48px circular), name, role badge
- Weekly hours (bold metric), shift count, availability status
- Quick actions: Message, View schedule, Request coverage
- Status indicator: Available/Scheduled/Off-duty

**Data Tables (Timesheet Entries):**
- Striped rows for scannability
- Columns: Date, Employee, Shift Time, Duration, Facility, Status, Actions
- Row height: h-12 for touch targets
- Action column: Icon buttons (view, edit, approve) with tooltips
- Pagination: Bottom-center with page size selector
- Bulk selection: Checkboxes with bulk action toolbar

**Activity Feed (Recent Changes):**
- Vertical timeline layout
- Items: Avatar, action description, timestamp, affected details
- Compact: py-3 per item with dividers
- Icons: Status indicators (approved, pending, rejected)
- "View all" link at bottom

### Modal & Overlay Patterns

**Shift Detail Drawer:**
- Slide-in from right: w-96
- Header: Employee info, shift date/time (large display)
- Body sections: Role details, facility/department, notes, attachments
- Footer: Action buttons (Approve, Reject, Edit, Delete)

**Quick Add Shift Modal:**
- Centered overlay: max-w-lg
- Form sections with clear labels
- Date/time pickers side-by-side
- Employee search dropdown with avatar previews
- Recurring shift option toggle
- Submit creates with confirmation toast

### Form Elements (Healthcare-Specific)

**Time Input Fields:**
- Dual input: Start time + End time (12-hour format with AM/PM toggle)
- Duration auto-calculated and displayed
- Validation: No overlapping shifts warning

**Role/Certification Badges:**
- Pill-shaped tags: px-3 py-1, rounded-full
- Prefix icon (stethoscope, syringe, etc. from Heroicons)
- Examples: RN, LPN, MD, CNA with appropriate medical icons

**Status Indicators:**
- Dot + text combination: 8px circle, 13px label
- States: Pending (amber), Approved (green), Rejected (red), Draft (gray)

**Search & Filters:**
- Prominent search bar: h-10, full-width in filter row
- Icon-left input with clear button
- Autocomplete dropdown showing recent searches + suggestions

---

## Page Structure: Dashboard

**Layout Flow (top to bottom):**

1. **Header Section:**
   - Breadcrumb: Home > Dashboard
   - Page title: "Facility Overview" (32px)
   - Date range display with filter controls inline

2. **KPI Metrics Row:**
   - 4-column grid (responsive to 2 on tablet, 1 on mobile)
   - Cards: Total Hours, Active Shifts, Coverage Rate, Pending Actions

3. **Main Content Area (2-column grid on lg+):**
   - Left (2/3 width): Shift Calendar Grid (full week view)
   - Right (1/3 width): Coverage Visualization Chart + Team Summary (stacked vertically)

4. **Secondary Information:**
   - Activity Feed (recent approvals/changes)
   - Quick Stats Table (department breakdown)

5. **Action Zone:**
   - Floating action button (bottom-right): "Add Shift" (60px circle)

---

## Images

**Hero Image Usage:** No traditional hero image for dashboard applications. Replace with data visualization and functional interface.

**Supporting Imagery:**
- Employee avatars: 48px circular placeholders throughout interface (team cards, activity feed)
- Empty state illustrations: 200px centered graphics for "No shifts scheduled" or "No pending approvals" states
- Onboarding graphics: Optional 300px illustrations for first-time user tutorials (medical staff at work, calendar concepts)
- Profile photos: 128px circles in user profile areas and shift detail views

**Icon Strategy:**
- Use Heroicons (outline) via CDN for all interface icons
- Medical-specific icons: stethoscope, clipboard-check, user-group, calendar, clock, chart-bar
- Navigation: home, calendar-days, users, document-text, cog-6-tooth, question-mark-circle

---

**Design Completion Note:** This comprehensive system provides production-ready specifications for a professional healthcare SaaS dashboard emphasizing data clarity, precise scheduling visualization, and clinical-grade interface quality.