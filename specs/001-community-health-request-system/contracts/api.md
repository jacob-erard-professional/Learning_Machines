# API Contracts: Community Health Request System

**Base URL**: `/api`
**Content-Type**: `application/json` for all requests and responses
**Date format**: ISO 8601 strings throughout (`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm:ssZ`)

---

## POST /api/requests

Submit a new Community Health support request.

**Request body:**
```json
{
  "requestorName": "Jane Smith",
  "requestorEmail": "jane@example.com",
  "requestorPhone": "801-555-0100",
  "alternateContactName": "Bob Jones",       // optional
  "alternateContactEmail": "bob@example.com",// optional
  "eventName": "Senior Health Fair",
  "eventDate": "2026-04-15",
  "eventCity": "Salt Lake City",
  "eventZip": "84101",
  "estimatedAttendees": 80,                  // optional
  "eventDescription": "Free blood pressure screening for seniors at the rec center", // optional
  "specialInstructions": "Please bring extra pamphlets", // optional
  "requestType": "staff_support",            // "staff_support" | "mailed_materials" | "pickup"
  "assetCategory": "materials",             // optional
  "materialPreferences": ["blood pressure cuffs", "pamphlets"] // optional
}
```

**Response 201:**
```json
{
  "id": "REQ-0001",
  "status": "pending",
  "fulfillmentRoute": "staff_deployment",
  "routingReason": "Event is within the Intermountain service area and requests staff support.",
  "isInServiceArea": true,
  "aiStatus": "success",
  "aiTags": ["health fair", "seniors", "blood pressure"],
  "aiSummary": "Senior health fair requiring on-site blood pressure screening materials.",
  "aiConfidence": "high",
  "createdAt": "2026-03-21T14:30:00Z",
  "emailDelivery": {
    "status": "sent",
    "to": "jane@example.com",
    "subject": "Your Community Health Request Has Been Received",
    "messageId": "<abc123@gmail.com>"
  }
}
```

**Response 400** (validation failure):
```json
{
  "error": "VALIDATION_ERROR",
  "fields": {
    "eventDate": "Event date must be today or in the future.",
    "requestorEmail": "Must be a valid email address."
  }
}
```

**Response 503** (AI unavailable — request still saved):
```json
{
  "id": "REQ-0002",
  "status": "needs_review",
  "fulfillmentRoute": "mail",
  "routingReason": "AI classification unavailable; defaulted to mail. Admin review required.",
  "aiStatus": "failed",
  "aiTags": [],
  "createdAt": "2026-03-21T14:31:00Z"
}
```

`emailDelivery.status` may also be `disabled`, `failed`, or `skipped` if Gmail
has not been connected yet, delivery fails, or no recipient email is available.

---

## GET /api/requests

List all requests with optional filtering. Used by the admin dashboard.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by `RequestStatus` value |
| `route` | string | Filter by `FulfillmentRoute` value |
| `zip` | string | Filter by exact zip code |
| `search` | string | Full-text search on requestorName, eventName, eventCity |
| `dateFrom` | string | ISO date — filter requests where eventDate >= dateFrom |
| `dateTo` | string | ISO date — filter requests where eventDate <= dateTo |
| `sortBy` | string | `createdAt` \| `eventDate` \| `requestorName` (default: `createdAt`) |
| `sortDir` | string | `asc` \| `desc` (default: `desc`) |

**Response 200:**
```json
{
  "total": 42,
  "results": [
    {
      "id": "REQ-0001",
      "requestorName": "Jane Smith",
      "eventName": "Senior Health Fair",
      "eventDate": "2026-04-15",
      "eventCity": "Salt Lake City",
      "eventZip": "84101",
      "requestType": "staff_support",
      "fulfillmentRoute": "staff_deployment",
      "status": "pending",
      "isInServiceArea": true,
      "aiTags": ["health fair", "seniors"],
      "createdAt": "2026-03-21T14:30:00Z"
    }
  ]
}
```

---

## GET /api/requests/:id

Get full detail for a single request including audit log.

**Response 200:**
```json
{
  "id": "REQ-0001",
  "requestorName": "Jane Smith",
  "requestorEmail": "jane@example.com",
  "requestorPhone": "801-555-0100",
  "eventName": "Senior Health Fair",
  "eventDate": "2026-04-15",
  "eventCity": "Salt Lake City",
  "eventZip": "84101",
  "estimatedAttendees": 80,
  "eventDescription": "Free blood pressure screening...",
  "requestType": "staff_support",
  "assetCategory": "materials",
  "materialPreferences": ["blood pressure cuffs"],
  "fulfillmentRoute": "staff_deployment",
  "routingReason": "Event is within service area.",
  "isInServiceArea": true,
  "status": "pending",
  "adminNotes": "",
  "aiStatus": "success",
  "aiTags": ["health fair", "seniors", "blood pressure"],
  "aiSummary": "Senior health fair requiring on-site screening.",
  "aiConfidence": "high",
  "calendarInviteGenerated": false,
  "createdAt": "2026-03-21T14:30:00Z",
  "updatedAt": "2026-03-21T14:30:00Z",
  "auditLog": []
}
```

**Response 404:**
```json
{ "error": "NOT_FOUND", "message": "Request REQ-9999 does not exist." }
```

---

## PATCH /api/requests/:id

Admin edit — update any field on a request. All fields optional; only provided
fields are updated. Generates an AuditEntry for each changed field.

**Request body (partial update):**
```json
{
  "fulfillmentRoute": "mail",
  "status": "approved",
  "adminNotes": "Routing overridden — event is too far for staff.",
  "assetCategory": "toolkits"
}
```

**Response 200:** Full updated request object (same shape as GET /api/requests/:id)

**Response 400:**
```json
{
  "error": "VALIDATION_ERROR",
  "fields": { "fulfillmentRoute": "Must be one of: staff_deployment, mail, pickup." }
}
```

---

## POST /api/requests/:id/approve

Approve a request. Sets status to `approved`. Returns the .ics file as an
attachment if the route is `staff_deployment`. Also sends an approval email to
the requestor.

**Response 200** (mail/pickup route — no calendar):
```json
{
  "id": "REQ-0003",
  "status": "approved",
  "emailDelivery": {
    "status": "sent",
    "to": "jane@example.com",
    "subject": "Your Community Health Request Update",
    "messageId": "<gmail-message-id>"
  }
}
```

**Response 200** (staff_deployment route — with calendar invite):
```
Content-Type: text/calendar
Content-Disposition: attachment; filename="REQ-0001-Senior-Health-Fair.ics"

BEGIN:VCALENDAR
...
END:VCALENDAR
```

---

## POST /api/requests/:id/reject

Reject a request. Sets status to `rejected`, stores the provided reason in
`adminNotes`, and sends a rejection email to the requestor.

**Request body:**
```json
{ "reason": "Does not align with mission." }
```

**Response 200:**
```json
{
  "id": "REQ-0003",
  "status": "rejected",
  "reason": "Does not align with mission.",
  "emailDelivery": {
    "status": "sent",
    "to": "jane@example.com",
    "subject": "Update on Your Community Health Request",
    "messageId": "<gmail-message-id>"
  }
}
```

---

## POST /api/requests/:id/hold

Move a request to `needs_review`, persist the optional note in `adminNotes`, and
send a clarification email to the requestor.

**Request body:**
```json
{ "note": "Need more info." }
```

**Response 200:**
```json
{
  "id": "REQ-0003",
  "status": "needs_review",
  "note": "Need more info.",
  "emailDelivery": {
    "status": "sent",
    "to": "jane@example.com",
    "subject": "Questions About Your Community Health Request",
    "messageId": "<gmail-message-id>"
  }
}
```

---

## GET /api/analytics/geo

Geographic demand summary by zip code. Used by the equity dashboard.

**Response 200:**
```json
{
  "summary": [
    {
      "zip": "84101",
      "city": "Salt Lake City",
      "state": "UT",
      "isInServiceArea": true,
      "requestCount30d": 5,
      "totalRequestCount": 12,
      "flag": "high_demand"   // "high_demand" | "underserved" | null
    },
    {
      "zip": "89501",
      "city": "Reno",
      "state": "NV",
      "isInServiceArea": true,
      "requestCount30d": 0,
      "totalRequestCount": 1,
      "flag": "underserved"
    }
  ],
  "serviceAreaCoverage": {
    "total": 42,
    "inServiceArea": 35,
    "outsideServiceArea": 7
  }
}
```

---

## GET /api/analytics/trends

Aggregated request counts over time. Used by the demand trend chart.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `groupBy` | string | `day` \| `week` \| `month` (default: `week`) |
| `weeks` | number | How many weeks of history (default: 8) |

**Response 200:**
```json
{
  "labels": ["2026-02-02", "2026-02-09", "2026-02-16"],
  "series": {
    "staff_deployment": [3, 5, 4],
    "mail": [2, 1, 3],
    "pickup": [0, 1, 0]
  }
}
```

---

## GET /api/analytics/upcoming

Upcoming approved staffed events in the next 30 days. Used by the staffing
calendar panel.

**Response 200:**
```json
{
  "events": [
    {
      "id": "REQ-0001",
      "eventName": "Senior Health Fair",
      "eventDate": "2026-04-15",
      "eventCity": "Salt Lake City",
      "eventZip": "84101",
      "estimatedAttendees": 80,
      "requestorName": "Jane Smith",
      "requestorPhone": "801-555-0100"
    }
  ]
}
```

---

## GET /api/auth/google/status

Returns whether backend Google OAuth is configured and whether a Gmail sender
account has already been connected.

**Response 200:**
```json
{
  "configured": true,
  "connected": false,
  "redirectUri": "http://localhost:3001/api/auth/google/callback",
  "fromAddress": "erardjacob@gmail.com",
  "fromName": "Learning Machines",
  "tokenFile": "/path/to/backend/.gmail-oauth.json",
  "hasRefreshToken": false,
  "connectUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

---

## GET /api/auth/google/connect

Redirects the browser to Google's OAuth consent screen for the Gmail send scope.

---

## GET /api/auth/google/callback

OAuth callback endpoint. Exchanges the Google authorization code for tokens and
saves them locally for later form-submission emails.

**Response 200:**
```json
{
  "connected": true,
  "message": "Google authorization saved. New form submissions can now send Gmail messages.",
  "email": "erardjacob@gmail.com",
  "scope": "https://www.googleapis.com/auth/gmail.send",
  "expiryDate": 1770000000000,
  "tokenFile": "/path/to/backend/.gmail-oauth.json"
}
```
