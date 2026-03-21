# Quickstart: Voice Detection Form Input

**Integration scenarios for testing and demo**

---

## Scenario 1: Happy path — all fields in natural language

User opens the form page and clicks "Use Voice Assistant." The modal opens and greets them.

**Conversation flow:**

| Turn | User says | Expected AI behavior |
|------|-----------|----------------------|
| 1 | "My name is Maria Lopez" | Extracts `requestorName: "Maria Lopez"`, asks for email |
| 2 | "You can email me at maria at health dot org" | Extracts `requestorEmail: "maria@health.org"`, asks for phone |
| 3 | "My number is 801 555 0200" | Extracts `requestorPhone: "(801) 555-0200"`, asks for event name |
| 4 | "We're hosting a diabetes awareness screening" | Extracts `eventName: "diabetes awareness screening"`, asks for date |
| 5 | "It's on April 20th, 2026" | Extracts `eventDate: "2026-04-20"`, asks for city |
| 6 | "Salt Lake City, zip code 84102" | Extracts `eventCity: "Salt Lake City"`, `eventZip: "84102"`, asks request type |
| 7 | "We'd like IHC staff to be there" | Extracts `requestType: "staff_support"`, sets `isComplete: true`, shows summary |

**Expected outcome**: `isComplete: true` with all 8 fields populated. Modal shows review step. User confirms → form pre-filled → submit.

---

## Scenario 2: Off-topic redirect

**Turn**: User says "What's the weather like today?"

**Expected AI response**: "I'm here to help you submit a community health request — I'm not able to answer general questions. Let's get back to your event. Could you tell me [next missing field]?"

**Test assertion**: `reply` contains a redirect phrase; `extractedFields` unchanged.

---

## Scenario 3: Ambiguous date — natural language

**Turn**: User says "Sometime next month"

**Expected AI behavior**: AI asks for clarification — "I want to make sure I get the right date. Could you give me the specific date, like 'April 15th'?"

**Test assertion**: `isComplete: false`; `extractedFields.eventDate` remains null.

---

## Scenario 4: Invalid email format

**Turn**: User says "My email is janeatexample"

**Expected AI behavior**: "That doesn't look like a valid email address. Could you say it again, like 'jane at example dot org'?"

**Test assertion**: `extractedFields.requestorEmail` remains null.

---

## Scenario 5: SpeechRecognition not available (Firefox / HTTP)

**Expected UI behavior**: "Use Voice Assistant" button is disabled with tooltip "Voice input requires Chrome or Edge on HTTPS." User falls back to the regular form.

---

## Scenario 6: Claude API unavailable

**Expected behavior**: `POST /api/voice-intake/message` returns `503 { "error": "AI unavailable" }`. Frontend shows: "Voice assistant is currently unavailable. Please fill out the form manually."

---

## Local Development Setup

```bash
# Backend must be running with a valid ANTHROPIC_API_KEY
cd backend
ANTHROPIC_API_KEY=sk-ant-... npm run dev

# Frontend
cd frontend
npm run dev   # localhost:5173 — SpeechRecognition works on localhost
```

Voice input works on `localhost` without HTTPS. On the deployed Render URL (HTTPS), it works on Chrome/Edge/Safari.
