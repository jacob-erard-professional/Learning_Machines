# UI Component Contracts: Community Health Request System

Defines the props interface and behavior contract for every shared component.
All components MUST be keyboard-navigable and WCAG 2.1 AA compliant.

---

## `<RequestForm />`

**Location**: `frontend/src/components/RequestForm.jsx`

**Purpose**: Multi-section form for submitting a Community Health request.
Validates on blur, submits via POST /api/requests, shows AI result inline.

**Props**: none (self-contained; uses internal state + form submit handler)

**Sections**:
1. Requestor Info (name, email, phone; alternate contact optional)
2. Event Details (event name, date, city, zip, attendees, description)
3. Request Type (radio: staff support / mailed materials / pickup)
4. Asset Preferences (category select, material preferences text, special instructions)

**Behavior contracts**:
- Required field labels MUST include a visible `*` and `aria-required="true"`
- Validation fires `onBlur` per field; error message appears below the field
  with `role="alert"` for screen readers
- Submit button is disabled while the API call is in-flight
- On success: show confirmation card with routing decision and AI tags
- On AI failure (503): show confirmation with "Pending review" badge

---

## `<RequestCard />`

**Location**: `frontend/src/components/ui/RequestCard.jsx`

**Purpose**: Summary card for a single request in the dashboard list.

**Props**:
```js
{
  request: RequestSummary,   // Subset of Request (list fields only)
  onClick: () => void,       // Opens detail panel
}
```

**Behavior contracts**:
- Entire card is keyboard-focusable (tabIndex={0}, Enter/Space triggers onClick)
- Status badge uses ARIA label: `aria-label="Status: Approved"`
- Route icon uses `aria-label` matching the route name

---

## `<AdminDashboard />`

**Location**: `frontend/src/pages/AdminDashboard.jsx`

**Purpose**: Full admin view with filter bar, request list, and detail panel.

**Behavior contracts**:
- Filter changes re-fetch from GET /api/requests with debounce (300ms on search)
- Selecting a request opens `<RequestDetail />` in a side panel
- "Approve" action calls POST /api/requests/:id/approve; triggers .ics download
  when route is staff_deployment

---

## `<RequestDetail />`

**Location**: `frontend/src/components/RequestDetail.jsx`

**Purpose**: Full detail view of a single request with edit capability.

**Props**:
```js
{
  requestId: String,
  onClose: () => void,
  onUpdated: (updatedRequest) => void,
}
```

**Behavior contracts**:
- All editable fields render as inputs with their current value pre-filled
- Saving calls PATCH /api/requests/:id and calls onUpdated with the result
- Audit log section shows all past changes in chronological order

---

## `<GeoEquityView />`

**Location**: `frontend/src/pages/GeoEquityView.jsx`

**Purpose**: Geographic demand summary — table + optional visual indicator
showing request counts per zip code, flagging high-demand and underserved areas.

**Behavior contracts**:
- Fetches from GET /api/analytics/geo on mount
- High-demand zips display an amber indicator; underserved display a blue indicator
- Table is sortable by requestCount30d, zip, flag
- All color indicators have text labels (not color-only) for accessibility

---

## `<Button />`

**Location**: `frontend/src/components/ui/Button.jsx`

**Props**:
```js
{
  variant: "primary" | "secondary" | "danger",
  size: "sm" | "md" | "lg",           // default: "md"
  disabled: Boolean,                  // default: false
  loading: Boolean,                   // shows spinner, disables click
  onClick: () => void,
  children: ReactNode,
  type: "button" | "submit" | "reset", // default: "button"
  ariaLabel: String,                  // required when children is icon-only
}
```

**Behavior contracts**:
- `loading={true}` renders a spinner and sets `aria-busy="true"`
- `disabled={true}` sets `aria-disabled="true"` and prevents all click events
- Focus ring MUST be visible (outline: 2px solid primary color, 2px offset)

---

## `<StatusBadge />`

**Location**: `frontend/src/components/ui/StatusBadge.jsx`

**Props**:
```js
{
  status: RequestStatus,
  size: "sm" | "md",   // default: "sm"
}
```

**Behavior contracts**:
- Never conveys status by color alone — includes text label
- `aria-label` = `"Status: ${humanReadableStatus}"`
- Color mapping:
  - pending → blue
  - needs_review → amber
  - approved → green
  - fulfilled → teal
  - rejected → gray (NOT red — avoids alarm in healthcare context)
