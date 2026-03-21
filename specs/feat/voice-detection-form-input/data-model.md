# Data Model: Voice Detection Form Input

**Branch**: `feat/voice-detection-form-input` | **Date**: 2026-03-21

---

## Entities

### VoiceSession

Tracks a single voice-driven form intake conversation. Stored in-memory on the backend, keyed by `sessionId`.

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| `id` | string (UUID) | yes | UUIDv4 format | Generated client-side at modal open |
| `messages` | Message[] | yes | alternating user/assistant | Full Claude API message history |
| `extractedFields` | ExtractedFields | yes | see below | Accumulated field state across turns |
| `isComplete` | boolean | yes | — | True when all 8 required fields confirmed |
| `createdAt` | ISO 8601 string | yes | — | Server timestamp on session creation |

### Message

One turn in the conversation, directly compatible with the Claude API `messages` array.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `role` | `'user'` \| `'assistant'` | yes | Must alternate; always starts with `user` |
| `content` | string | yes | Raw text content |

### ExtractedFields

Mirrors the 8 required fields of the existing RequestForm. `null` = not yet collected.

| Field | Type | Required in form | Validation rule |
|-------|------|-----------------|-----------------|
| `requestorName` | string \| null | yes | Non-empty |
| `requestorEmail` | string \| null | yes | RFC 5322 simplified |
| `requestorPhone` | string \| null | yes | US phone, formatted as `(XXX) XXX-XXXX` |
| `eventName` | string \| null | yes | Non-empty |
| `eventDate` | string \| null | yes | ISO date (YYYY-MM-DD), today or future |
| `eventCity` | string \| null | yes | Non-empty |
| `eventZip` | string \| null | yes | 5-digit or ZIP+4 |
| `requestType` | `'staff_support'` \| `'mailed_materials'` \| `'pickup'` \| null | yes | Enum match |

---

## State Transitions

```
VoiceSession lifecycle:

  [OPEN]
    │  POST /api/voice-intake/start
    ▼
  [ACTIVE]  ──── POST /api/voice-intake/message (N turns)
    │               isComplete: false → keep conversing
    │               isComplete: true ↓
    ▼
  [COMPLETE]  ──── Full extractedFields returned to frontend
    │               Frontend confirms → POST /api/requests
    ▼
  [SUBMITTED] (session cleaned up from memory)
```

---

## Required Fields Completion Rule

A session is `isComplete = true` when ALL 8 fields in `ExtractedFields` are non-null AND pass their individual validation rules. Claude is instructed to:
1. Confirm ambiguous values with the user before marking them extracted
2. Reformat phone to `(XXX) XXX-XXXX` format
3. Convert natural-language dates ("next Friday") to YYYY-MM-DD
4. Map request type descriptions ("I want staff to come") to the enum value
