# API Contract: Voice Intake

**Feature**: Voice Detection Form Input
**Base path**: `/api/voice-intake`
**Auth**: None (same as existing request API)

---

## POST /api/voice-intake/start

Creates a new voice intake session.

### Request

```json
{
  "initialFields": {
    "requestorName": "Jane Smith",
    "requestorEmail": null,
    "requestorPhone": null,
    "eventName": "Health Fair",
    "eventDate": null,
    "eventCity": null,
    "eventZip": null,
    "requestType": null
  }
}
```

All fields in `initialFields` are optional. Pass any already-filled form values so Claude skips them. Omit the body entirely (or send `{}`) to start a fresh session.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `initialFields` | object | no | Partial `ExtractedFields` — null values treated as not yet collected |

### Response `200 OK`

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "greeting": "Hi! I'm here to help you submit a community health request. Let's start — what's your full name?"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string (UUID) | Used in all subsequent `/message` calls |
| `greeting` | string | First AI message shown in the chat UI |

---

## POST /api/voice-intake/message

Sends one user message and receives the AI reply and current field state.

### Request

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "My name is Jane Smith"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `sessionId` | string | yes | Must match an active session |
| `message` | string | yes | 1–2000 chars, non-empty after trim |

### Response `200 OK`

```json
{
  "reply": "Nice to meet you, Jane! What's the best email address to reach you?",
  "extractedFields": {
    "requestorName": "Jane Smith",
    "requestorEmail": null,
    "requestorPhone": null,
    "eventName": null,
    "eventDate": null,
    "eventCity": null,
    "eventZip": null,
    "requestType": null
  },
  "isComplete": false
}
```

### Response `200 OK` — when all fields collected

```json
{
  "reply": "I have everything I need! Here's a summary — please confirm: Name: Jane Smith, Email: jane@example.org, ...",
  "extractedFields": {
    "requestorName": "Jane Smith",
    "requestorEmail": "jane@example.org",
    "requestorPhone": "(801) 555-0100",
    "eventName": "Senior Health Fair",
    "eventDate": "2026-05-15",
    "eventCity": "Salt Lake City",
    "eventZip": "84101",
    "requestType": "staff_support"
  },
  "isComplete": true
}
```

### Error responses

| Status | Body | When |
|--------|------|------|
| `400` | `{ "error": "sessionId is required" }` | Missing sessionId |
| `400` | `{ "error": "message is required" }` | Missing or empty message |
| `404` | `{ "error": "Session not found or expired" }` | Unknown sessionId |
| `503` | `{ "error": "AI unavailable" }` | Claude API unreachable |

---

## DELETE /api/voice-intake/:sessionId

Cleans up a session explicitly (e.g., user closes modal before completing).

### Response `204 No Content`

No body. Idempotent — returns 204 even if session doesn't exist.

---

## Frontend UI Contract

The `VoiceIntakeModal` component exposes the following props:

```typescript
interface VoiceIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Called when isComplete === true with the full form data ready to submit
  onComplete: (formData: ExtractedFields) => void;
}
```

`onComplete` receives the `extractedFields` object from the final `/message` response. The parent (`RequestForm` or the page) then either:
- Pre-fills the `RequestForm` state and closes the modal (preferred — user reviews before submit), OR
- Directly submits to `POST /api/requests` and shows the `ConfirmationCard`.
