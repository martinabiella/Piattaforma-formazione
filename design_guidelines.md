# LMS Web Application Design Guidelines

## Design Approach

**Selected Approach:** Design System-Based (Material Design influence)
**Rationale:** This is a utility-focused learning platform where clarity, usability, and information hierarchy are paramount. Drawing from successful LMS platforms like Coursera and modern admin interfaces like Linear.

## Core Design Elements

### A. Typography

**Font Family:** Inter (primary), system-ui fallback
- Headings: Font weights 600-700
- Body text: Font weight 400, line-height 1.6 for optimal reading
- Small text/labels: Font weight 500

**Type Scale:**
- Page titles: text-3xl (lg:text-4xl)
- Section headers: text-2xl
- Module/card titles: text-xl font-semibold
- Body content: text-base
- Labels/meta: text-sm
- Small captions: text-xs

### B. Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-6 or p-8
- Section spacing: space-y-8 or space-y-12
- Card gaps: gap-6
- Form field spacing: space-y-4

**Container Strategy:**
- Main content: max-w-7xl mx-auto px-4
- Module reading content: max-w-3xl (optimal reading width)
- Forms: max-w-2xl
- Admin tables: full-width with horizontal scroll

### C. Component Library

#### Navigation
- **Top Navigation Bar:** Fixed header with logo left, user menu right, h-16
- **Admin Sidebar:** w-64, fixed left navigation with icon+label menu items, space-y-2 between items
- **Breadcrumbs:** text-sm with separator icons, mb-6

#### Cards & Containers
- **Module Cards:** Rounded corners (rounded-lg), shadow-sm on hover, p-6, border
- **Content Sections:** Well-defined with borders or subtle shadows, p-8
- **Dashboard Stats:** Grid layout (grid-cols-1 md:grid-cols-3), stat cards with large numbers

#### Forms & Inputs
- **Input Fields:** h-11, rounded-md, border, px-4, focus:ring-2
- **Labels:** text-sm font-medium, mb-2
- **Rich Text Editor:** Full-width container with toolbar, min-h-64
- **Image Upload:** Drag-drop zone with preview, border-2 border-dashed, p-8, rounded-lg

#### Quiz Interface
- **Question Container:** Large card, p-8, centered, max-w-3xl
- **Options:** Radio buttons with full-width clickable cards, p-4, space-y-3
- **Progress Indicator:** Horizontal steps or "Question 3 of 10" text-sm at top
- **Navigation:** Button group at bottom, space-x-4

#### Admin Tables
- **Results Table:** Striped rows, sticky header, compact (h-12 per row)
- **Module List:** Drag handles for reordering, inline edit icons, status badges

#### Progress & Status
- **Progress Bar:** h-2 rounded-full, animated width transition
- **Status Badges:** Inline-flex, px-3, py-1, rounded-full, text-xs font-medium
  - Not Started / In Progress / Completed / Passed / Failed
- **Module Progress:** Circular progress or percentage display

#### Buttons
- **Primary CTA:** px-6, py-3, rounded-md, font-medium, shadow-sm
- **Secondary:** Border variant, px-6, py-3
- **Icon Buttons:** p-2, rounded-md, hover:bg-subtle
- **Quiz Submit:** Large, w-full or prominent placement, px-8, py-4

### D. Page-Specific Layouts

#### Landing Page (/)
- Hero: 60vh, centered content with max-w-4xl, heading + description + CTA
- Features section: grid-cols-1 md:grid-cols-3, icon cards
- CTA footer section: centered, py-16

#### User Dashboard (/app)
- Grid of 3 module cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Each card: Module image (aspect-video), title, description snippet, progress bar, CTA button

#### Module Content (/app/modules/:id)
- Article-style layout: max-w-3xl centered
- Module header: title, description, progress indicator
- Content sections: space-y-8, rich text with proper heading hierarchy
- Images: Full-width within max-w-3xl, rounded-lg, my-6
- Bottom CTA: Sticky or prominent "Start Quiz" button, w-full sm:w-auto

#### Quiz Page
- Centered card approach: max-w-3xl
- Single question view: Large card containing question + 4 options
- Progress at top: "Question X of Y" or step indicators
- Navigation: Previous/Next or Submit at bottom

#### Admin Dashboard
- Two-column: Sidebar (w-64) + main content
- Main area: Stats cards at top (grid-cols-3), then quick actions and recent activity
- Tables with actions column (edit/delete icons)

#### Admin Module Editor
- Two-panel: Form fields on left (w-2/3), preview on right (w-1/3) on desktop
- Sections list: Sortable with drag handles, add section button
- Rich text editor: Full-featured toolbar, adequate height (min-h-80)

#### Results View
- Filters at top: Module select, user search, date range
- Table: User | Module | Score | Status | Date | Actions
- Export button in top-right

### Images
- **Landing Hero:** Abstract learning/education illustration (1200x600), subtle overlay for text readability
- **Module Cards:** Thumbnail images representing each module topic (400x250), aspect-video ratio
- **Module Content:** Inline educational images/diagrams as needed, full-width within reading container

### E. Interaction Patterns

**Focus States:** Ring-2 with offset, visible keyboard navigation
**Loading States:** Skeleton screens for content areas, spinner for actions
**Empty States:** Centered icon + message + action button (e.g., "No modules yet. Create one.")
**Error Messages:** Inline below fields (text-sm, text-red), toast notifications for global errors
**Success Feedback:** Toast notifications, check icons, subtle animations

### Responsive Breakpoints
- Mobile: Stack all columns, full-width cards, hamburger nav for admin
- Tablet (md:): 2-column grids, show sidebar for admin
- Desktop (lg:): 3-column grids, full layout with sidebars

**Animation:** Minimal - only use for loading states, modal transitions, and progress bar fills. No decorative animations.