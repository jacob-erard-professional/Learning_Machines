# Tasks: Voice Detection Form Input

**Input**: `specs/feat/voice-detection-form-input/`
**Branch**: `feat/voice-detection-form-input`
**Tests**: MANDATORY per Constitution Principle III — unit, integration, and component tests required at every level.

---

## Two Voice Features — Shared Infrastructure

Both features share a common voice capture layer. They are independently deployable but built to be interoperable.

| Feature | Who | How | AI Role |
|---------|-----|-----|---------|
| **Conversational AI Intake** | Requestors (user-side) | Speak OR type naturally ("We're hosting a school health fair with 200 kids") | Claude extracts multiple fields from natural language, has a chatbot conversation |
| **Voice Command Interface** | Admins (admin-side) | Short spoken commands ("Show high priority events this week") | Claude interprets command → returns filter/navigate action → UI updates |

**Shared layer**: `useVoiceCapture` base hook (MediaRecorder + Web Speech API) extracted so both features import it.

---

## User Stories

- **US1 (P1)**: As a user, I can record my voice and have it transcribed to text using HuggingFace Whisper (Transformers.js) running in the browser.
- **US2 (P2)**: As a requestor, I can have a natural chatbot conversation with Claude (typing or speaking) that extracts form fields from what I say — including multiple fields from a single sentence — until all 8 required fields are collected.
- **US3 (P3)**: As a requestor, I can review the AI-extracted form data in an editable review step and submit my request.
- **US4 (P4)**: As an admin, I can speak a voice command ("Show high priority events this week") and the admin queue UI updates its filters instantly — using Web Speech API (no model download, fast).

---

## Phase 1: Setup

**Purpose**: Install dependencies and scaffold new files so all subsequent tasks have a clear target.

- [X] T001 Install deps: run `npm install @xenova/transformers` in `frontend/`; then update `frontend/vite.config.js` to add `optimizeDeps: { exclude: ['@xenova/transformers'] }` and `worker: { format: 'es' }` inside `defineConfig`
- [X] T002 Verify `@anthropic-ai/sdk` is present in `backend/package.json`; if missing run `npm install @anthropic-ai/sdk` inside `backend/`
- [X] T003 Create empty stub files for user-side feature: `frontend/src/workers/whisper.worker.js`, `frontend/src/hooks/useWhisperTranscription.js`, `frontend/src/hooks/useVoiceCapture.js`, `frontend/src/components/VoiceIntakeModal.jsx`
- [X] T004 [P] Create empty stub files for backend + admin: `backend/src/routes/voiceIntake.js`, `backend/src/services/voiceIntakeService.js`, `backend/src/routes/voiceCommand.js`, `backend/src/services/voiceCommandService.js`, `frontend/src/hooks/useVoiceCommand.js`, `frontend/src/components/VoiceCommandBar.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend session infrastructure and Claude integration must be complete before any UI work can reference them.

**⚠️ CRITICAL**: US1, US2, and US3 all depend on this phase.

- [X] T005 Implement `voiceIntakeService.js` in `backend/src/services/voiceIntakeService.js`:
  - Module-level `Map` keyed by `sessionId` (UUID string) storing `{ messages: [], extractedFields: {...}, isComplete: false, createdAt }`
  - `createSession()` → returns `{ sessionId, greeting }` where greeting is the first AI message
  - `sendMessage(sessionId, userMessage)` → calls Claude API (`claude-sonnet-4-6`) with system prompt (see below), appends to messages, merges extractedFields, returns `{ reply, extractedFields, isComplete }`
  - `deleteSession(sessionId)` → removes session from Map, returns true/false
  - System prompt must: (1) define JSON response schema `{ message, extractedFields, isComplete }`, (2) inject current `extractedFields` state AND `initialFields` passed from the form, (3) instruct Claude to behave like a friendly intake specialist — extract MULTIPLE fields from a single message when possible (e.g. "We're hosting a school health fair with 200 kids" → extract eventName, estimatedAttendees, requestType hint), ask natural follow-up questions rather than robotically listing fields one by one, (4) explicitly instruct Claude to redirect off-topic messages back to the form with a friendly nudge, (5) use `temperature: 0.3` (slight warmth for conversational feel while staying accurate)
  - Required `extractedFields` keys: `requestorName`, `requestorEmail`, `requestorPhone`, `eventName`, `eventDate`, `eventCity`, `eventZip`, `requestType`
  - `isComplete` is true only when all 8 keys are non-null
  - Export: `createSession`, `sendMessage`, `deleteSession`

- [X] T006 Implement `voiceIntake.js` route in `backend/src/routes/voiceIntake.js`:
  - `POST /api/voice-intake/start` → accepts optional `{ initialFields }` body, passes to `createSession(initialFields)`, returns `{ sessionId, greeting }` where greeting acknowledges any pre-filled fields ("I can see you've already filled in your name — let's get the rest!")
  - `POST /api/voice-intake/message` → validates `{ sessionId, message }` (both required, message max 2000 chars), calls `sendMessage()`, returns `{ reply, extractedFields, isComplete }`; returns 400 on missing fields, 404 if session not found, 503 if Claude unavailable
  - `DELETE /api/voice-intake/:sessionId` → calls `deleteSession()`, returns 204 (idempotent)

- [X] T007 Register voice intake route in `backend/src/server.js` (or the main Express app file): `app.use('/api/voice-intake', voiceIntakeRouter)` — find the correct file by looking for other route registrations like `app.use('/api/requests', ...)`

- [X] T008 Write backend unit tests in `backend/tests/unit/voiceIntakeService.test.js`:
  - Mock `@anthropic-ai/sdk` so tests do not hit the real API
  - Test `createSession()`: returns `{ sessionId, greeting }` with a UUID sessionId
  - Test `sendMessage()`: merges returned extractedFields into session state; sets `isComplete: true` when all 8 fields present
  - Test `deleteSession()`: removes session, returns false for unknown id
  - Test off-topic handling: verify system prompt includes redirect instruction (inspect the prompt string)

- [X] T009 Write backend integration tests in `backend/tests/integration/voiceIntake.test.js` using Supertest:
  - Mock Anthropic SDK at the module level
  - `POST /api/voice-intake/start` → 200 with `{ sessionId, greeting }`
  - `POST /api/voice-intake/message` with valid body → 200 with `{ reply, extractedFields, isComplete }`
  - `POST /api/voice-intake/message` missing sessionId → 400
  - `POST /api/voice-intake/message` unknown sessionId → 404
  - `DELETE /api/voice-intake/:sessionId` → 204; second call also 204 (idempotent)

**Checkpoint**: Backend fully functional. Test with `curl -X POST http://localhost:3001/api/voice-intake/start`.

---

## Phase 3: User Story 1 — HuggingFace Whisper Transcription (P1) 🎯 MVP

**Goal**: User can click a mic button, speak, stop, and see the transcript appear as a text message ready to send.

**Independent Test**: Open VoiceIntakeModal in isolation (Storybook or direct render), click Start, speak, click Stop → transcript appears in the input field.

### Tests (MANDATORY) ✅

- [X] T010 [P] [US1] Write unit tests for `useWhisperTranscription` hook in `frontend/tests/hooks/useWhisperTranscription.test.js`:
  - Mock `@xenova/transformers` pipeline — do not run actual Whisper
  - Test: hook initializes with `{ isLoading: false, isRecording: false, transcript: '', error: null }`
  - Test: `startRecording()` sets `isRecording: true`; `stopRecording()` sets `isRecording: false`
  - Test: when worker posts `{ type: 'transcript', text: '...' }`, hook updates `transcript` state
  - Test: when worker posts `{ type: 'error', message: '...' }`, hook sets `error` state

### Implementation for User Story 1

- [X] T011 [P] [US1] Implement shared `frontend/src/hooks/useVoiceCapture.js`:
  - Encapsulates `navigator.mediaDevices.getUserMedia({ audio: true })` + `MediaRecorder` setup
  - State: `isRecording` (bool), `audioBlob` (Blob|null), `error` (string|null)
  - `startCapture()`: starts MediaRecorder, accumulates chunks in a ref, sets `isRecording: true`
  - `stopCapture()`: stops MediaRecorder, creates Blob from chunks, sets `audioBlob`, sets `isRecording: false`
  - `reset()`: clears `audioBlob` and `error`
  - Export: default `useVoiceCapture()` — used by both `useWhisperTranscription` (user intake) and `useVoiceCommand` (admin commands)

- [X] T012a [P] [US1] Implement `frontend/src/workers/whisper.worker.js`:
  - Import `pipeline` and `env` from `@xenova/transformers`
  - Set `env.allowLocalModels = false` (use HuggingFace Hub CDN)
  - Lazy-load pipeline on first message: `pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en')`
  - Listen for `message` events with `{ type: 'transcribe', audioData: Float32Array }` payload
  - Run inference: `await transcriber(audioData, { language: 'english', task: 'transcribe' })`
  - Post back `{ type: 'transcript', text: result.text.trim() }` on success
  - Post back `{ type: 'error', message: err.message }` on failure
  - Post `{ type: 'loading', progress }` during model download so the UI can show progress

- [X] T012 [US1] Implement `frontend/src/hooks/useWhisperTranscription.js` (builds on `useVoiceCapture`):
  - Create Web Worker from `whisper.worker.js` using `new Worker(new URL('../workers/whisper.worker.js', import.meta.url), { type: 'module' })`
  - State: `isModelLoading` (bool), `modelProgress` (0–100), `isRecording` (bool), `transcript` (string), `error` (string|null)
  - Uses `useVoiceCapture` internally for audio capture; when `audioBlob` is set, decodes to AudioBuffer via `AudioContext.decodeAudioData` → resamples to 16kHz Float32Array → posts `{ type: 'transcribe', audioData }` to worker
  - `startRecording()` → calls `startCapture()`; `stopRecording()` → calls `stopCapture()`
  - `clearTranscript()`: resets transcript to ''
  - Listens for worker messages: on `loading` → updates `modelProgress`; on `transcript` → sets `transcript`; on `error` → sets `error`
  - Cleanup: terminate worker on unmount
  - Export: default function `useWhisperTranscription()`; returns `{ isModelLoading, modelProgress, isRecording, transcript, error, startRecording, stopRecording, clearTranscript }`

**Checkpoint**: `useWhisperTranscription` works in isolation — speak and get a transcript.

---

## Phase 4: User Story 2 — Claude Conversation (P2)

**Goal**: The VoiceIntakeModal shows a chat interface. Each transcribed utterance is sent to the backend Claude conversation. The AI replies with the next question and the extracted fields panel updates in real time.

**Independent Test**: Render `VoiceIntakeModal` with a mocked API; type a text message (no voice) and confirm Claude reply appears and extractedFields panel shows updated fields.

### Tests (MANDATORY) ✅

- [X] T013 [P] [US2] Write component tests for `VoiceIntakeModal` in `frontend/tests/components/VoiceIntakeModal.test.jsx`:
  - Mock `../../src/lib/api.js` (apiPost, apiDelete) — do not hit real backend
  - Mock `../../src/hooks/useWhisperTranscription` — expose `isRecording: false, transcript: '', startRecording, stopRecording, clearTranscript`
  - Test: modal renders greeting message after `POST /api/voice-intake/start` resolves
  - Test: clicking mic button calls `startRecording()`; clicking again calls `stopRecording()`
  - Test: when `transcript` updates, it populates the message input automatically and clears after send
  - Test: submitting a text message shows the user message and AI reply in the chat log
  - Test: `extractedFields` panel shows field names with ✓/✗ indicators that update as fields are collected
  - Test: when `isComplete: true` is returned, a "Review & Submit" button appears
  - Test: close button calls `onClose` and sends `DELETE /api/voice-intake/:sessionId`
  - Test: modal has `role="dialog"`, `aria-modal="true"`, `aria-label="Voice intake assistant"`, and traps focus

### Implementation for User Story 2

- [X] T014 [US2] Implement `frontend/src/components/VoiceIntakeModal.jsx`:
  - **Props**: `isOpen: bool`, `onClose: () => void`, `onComplete: (extractedFields) => void`
  - **State**: `sessionId`, `messages` (array of `{role, text}`), `extractedFields` (object, 8 keys), `isComplete`, `inputText`, `isSending`, `apiError`
  - **On open** (`isOpen` changes to true): call `POST /api/voice-intake/start` with `{ initialFields: currentFormValues }` (pass in any already-filled form fields so Claude skips them) → store `sessionId`, add greeting to messages
  - **On close**: call `DELETE /api/voice-intake/:sessionId` (fire-and-forget), reset all state, call `onClose`
  - **sendMessage(text)**: append `{role: 'user', text}` to messages, call `POST /api/voice-intake/message` with `{ sessionId, message: text }` → append `{role: 'assistant', text: reply}`, merge `extractedFields`, set `isComplete`
  - **Voice integration**: use `useWhisperTranscription` hook; when `transcript` changes to a non-empty string, auto-populate `inputText` and clear transcript via `clearTranscript()`; show mic button (red when recording); show model loading progress bar when `isModelLoading`
  - **Layout**: two-column (desktop) / single-column (mobile): left = chat + voice input, right = field extraction status panel showing all 8 fields with ✓ (filled) or pending indicator
  - **Field status panel**: list `requestorName`, `requestorEmail`, `requestorPhone`, `eventName`, `eventDate`, `eventCity`, `eventZip`, `requestType` with human-readable labels; green check when non-null
  - **When `isComplete`**: hide the chat input; show a review panel with all 8 fields as editable `<input>` elements pre-filled with `extractedFields` values; user can correct any field directly; "Confirm & Fill Form" button calls `onComplete(editedFields)` with the current review panel values (not the original extracted values — user edits take precedence)
  - **Accessibility**: `role="dialog"`, `aria-modal="true"`, `aria-label="Voice intake assistant"`, focus trap (use `useRef` on first focusable + last focusable, `Tab`/`Shift+Tab` intercepted), `aria-busy` on send button while loading, error messages with `role="alert"`
  - **Tailwind styling**: IHC teal header, white body, border on field panel, mic button is `bg-red-500` when recording, `bg-ihc-blue-600` at rest

**Checkpoint**: Full voice → Claude conversation loop works end-to-end.

---

## Phase 5: User Story 3 — Form Pre-fill & Submission (P3)

**Goal**: When the conversation completes, the extracted data pre-fills the `RequestForm`. The user reviews and submits.

**Independent Test**: Call `onComplete` with a full `extractedFields` object → verify `RequestForm` fields are populated without page reload.

### Tests (MANDATORY) ✅

- [X] T015 [P] [US3] Add integration test to `frontend/tests/components/RequestForm.test.jsx`:
  - Add a test group "VoiceIntakeModal integration"
  - Test: when `VoiceIntakeModal` calls `onComplete` with full `extractedFields`, all 8 `RequestForm` inputs have the correct values
  - Test: submit button is enabled after pre-fill (no required-field errors)

### Implementation for User Story 3

- [X] T016 [US3] Add "Use Voice Assistant" button to `frontend/src/components/RequestForm.jsx`:
  - Add `voiceModalOpen` state (bool, default false)
  - Render a secondary `Button` (variant secondary) labeled "Use Voice Assistant" with a microphone SVG icon, positioned above or beside the form title
  - On click: set `voiceModalOpen: true`
  - Render `<VoiceIntakeModal isOpen={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} onComplete={handleVoiceComplete} />`
  - Implement `handleVoiceComplete(extractedFields)`: call `setForm(prev => ({ ...prev, ...extractedFields }))` to merge all returned fields, then call `setVoiceModalOpen(false)`
  - Also set `setTouched({})` and `setErrors({})` after merge so stale errors are cleared

- [X] T017 [US3] Add `apiDelete` helper to `frontend/src/lib/api.js` if not already present:
  - Pattern mirrors `apiGet`/`apiPost`: `export async function apiDelete(path) { const res = await fetch(path, { method: 'DELETE' }); if (!res.ok && res.status !== 204) throw new Error(...); }`

**Checkpoint**: Full end-to-end flow: voice → transcript → Claude conversation → form pre-filled → submit → ConfirmationCard.

---

## Phase 6: User Story 4 — Admin Voice Command Interface (P4) ⚡ HIGH IMPACT / LOW EFFORT

**Goal**: Admin says "Show high priority events this week" → the request queue filters instantly. Uses Web Speech API (no model download — commands are short).

**Independent Test**: Render `VoiceCommandBar` on the admin queue page, mock Web Speech API result as "show urgent events", confirm queue filter state updates to `{ priority: 'urgent' }`.

**Shared layer**: `useVoiceCommand` hook uses `useVoiceCapture` for audio but switches to `window.SpeechRecognition` (faster, streaming, no WASM needed for short commands).

### Tests (MANDATORY) ✅

- [X] T023 [P] [US4] Write unit tests for `voiceCommandService.js` in `backend/tests/unit/voiceCommandService.test.js`:
  - Mock `@anthropic-ai/sdk`
  - Test: `interpretCommand('Show high priority events this week')` → returns `{ action: 'filter', params: { priority: 'high', dateRange: 'this_week' } }`
  - Test: `interpretCommand('Show underserved regions')` → returns `{ action: 'filter', params: { geoFlag: 'underserved' } }`
  - Test: `interpretCommand('Reset filters')` → returns `{ action: 'reset', params: {} }`
  - Test: unrecognised command → returns `{ action: 'unknown', params: {}, message: '...' }`

- [X] T024 [P] [US4] Write component tests for `VoiceCommandBar` in `frontend/tests/components/VoiceCommandBar.test.jsx`:
  - Mock `useVoiceCommand` hook
  - Test: "Start voice command" button is present with `aria-label`
  - Test: when `transcript` updates, it is displayed in the bar and auto-submitted
  - Test: when API returns `{ action: 'filter', params }`, `onCommand` prop is called with those params
  - Test: when API returns `{ action: 'unknown' }`, an error message appears with `role="alert"`

### Implementation for User Story 4

- [X] T025 [US4] Implement `backend/src/services/voiceCommandService.js`:
  - `interpretCommand(commandText)` → calls Claude API with a system prompt that maps natural language admin commands to a structured `{ action, params }` JSON object
  - Supported `action` values: `'filter'`, `'reset'`, `'navigate'`, `'unknown'`
  - Supported `params` keys for `filter`: `priority` (`'high'|'urgent'|'low'`), `dateRange` (`'today'|'this_week'|'this_month'`), `requestType` (`'staff_support'|'mailed_materials'|'pickup'`), `geoFlag` (`'high_demand'|'underserved'`), `status` (any valid status string)
  - System prompt: `temperature: 0`, JSON-mode response schema `{ action, params, message }`, include today's date so relative date ranges resolve correctly
  - Export: `interpretCommand`

- [X] T026 [US4] Implement `backend/src/routes/voiceCommand.js`:
  - `POST /api/voice-command/interpret` → validates `{ command }` (required, string, max 500 chars), calls `interpretCommand()`, returns `{ action, params, message }`; 400 on missing command, 503 if Claude unavailable
  - Register route in `backend/src/server.js`: `app.use('/api/voice-command', voiceCommandRouter)`

- [X] T027 [US4] Implement `frontend/src/hooks/useVoiceCommand.js`:
  - Uses `window.SpeechRecognition || window.webkitSpeechRecognition` (NOT Whisper — commands are short, streaming recognition is faster and needs no model)
  - State: `isListening` (bool), `transcript` (string), `error` (string|null), `isSupported` (bool — false if SpeechRecognition unavailable)
  - `startListening()`: starts recognition with `continuous: false`, `interimResults: false` — captures one command utterance then auto-stops
  - `stopListening()`: aborts recognition
  - On `onresult`: sets `transcript` to the final result; on `onerror`: sets `error`
  - `clearTranscript()`: resets transcript
  - Export: default `useVoiceCommand()`

- [X] T028 [US4] Implement `frontend/src/components/VoiceCommandBar.jsx`:
  - **Props**: `onCommand: ({ action, params }) => void` — called when API returns a recognized action
  - Uses `useVoiceCommand` hook
  - Layout: a compact horizontal bar with a mic icon button + a small transcript display area
  - When `isSupported: false`: render nothing (hide entirely — don't block admin UI)
  - Click mic → `startListening()`; when `transcript` is set, auto-POST to `/api/voice-command/interpret` → call `onCommand(result)` if action !== 'unknown'
  - If `action === 'unknown'`: show inline message `result.message` with `role="alert"` for 3s then clear
  - Accessibility: mic button has `aria-label="Start voice command"`, `aria-pressed={isListening}`, `aria-live="polite"` region for transcript display

- [X] T029 [US4] Integrate `VoiceCommandBar` into the admin request queue page `frontend/src/pages/QueueView.jsx` (or equivalent admin queue component — find by searching for where requests are listed and filtered):
  - Import `VoiceCommandBar`
  - Add handler `handleVoiceCommand({ action, params })`:
    - `action === 'filter'` → merge `params` into existing filter state (priority, dateRange, requestType, geoFlag, status)
    - `action === 'reset'` → clear all filters to defaults
    - `action === 'navigate'` → use React Router `navigate()` if a route is specified
  - Render `<VoiceCommandBar onCommand={handleVoiceCommand} />` at the top of the queue page, above the existing filter controls
  - Visually indicate active voice-applied filters with a small "Applied by voice" badge next to filter chips

**Checkpoint**: Say "Show high priority events this week" → queue filters to high priority + this week. Say "Reset filters" → all filters clear.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T030 Add model download progress UI in `VoiceIntakeModal.jsx`: when `isModelLoading: true`, show a progress bar (`role="progressbar"` with `aria-valuenow={modelProgress}`) and message "Loading voice model… {modelProgress}%"
- [ ] T031 Add graceful fallback in `frontend/src/components/RequestForm.jsx`: if `window.Worker` or `window.AudioContext` is undefined, disable the "Use Voice Assistant" button and show tooltip "Voice input requires a modern browser"; voice fallback (text-only mode) still allows full conversation
- [ ] T032 Add inline AI notice to `VoiceIntakeModal.jsx` header: render a `<p>` element reading "Your responses are processed by AI to fill your form" — small, subdued text, no user action required
- [ ] T033 [P] Add JSDoc docstring to every exported function in: `frontend/src/hooks/useVoiceCapture.js`, `frontend/src/hooks/useWhisperTranscription.js`, `frontend/src/hooks/useVoiceCommand.js`, `frontend/src/workers/whisper.worker.js`, `frontend/src/components/VoiceIntakeModal.jsx`, `frontend/src/components/VoiceCommandBar.jsx`, `backend/src/services/voiceIntakeService.js`, `backend/src/routes/voiceIntake.js`, `backend/src/services/voiceCommandService.js`, `backend/src/routes/voiceCommand.js`
- [ ] T034 [P] Update `README.md` at repo root: add "Voice Features" section covering both the Conversational AI Intake (user-side, Whisper model, ANTHROPIC_API_KEY required) and Voice Command Interface (admin-side, Web Speech API, no extra setup); note browser requirements and first-load model download
- [X] T035 Run all frontend tests (`npm test --run` in `frontend/`) and backend tests (`npm test` in `backend/`) — all must pass before this phase is complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2; `useVoiceCapture` (T011) is shared and must complete first
- **Phase 4 (US2)**: Depends on Phase 2 (backend) and Phase 3 (voice hook + worker)
- **Phase 5 (US3)**: Depends on Phase 4 (modal must exist for pre-fill integration)
- **Phase 6 (US4 Admin)**: Depends on Phase 2 (backend); **parallel with Phases 3–5** — admin voice is independent of Whisper
- **Phase 7 (Polish)**: Depends on Phases 3–6 all complete

### Split-team opportunity

With two developers (Jacob on user intake, someone on admin commands):
- **Dev A**: Phases 1 → 2 → 3 → 4 → 5 (user-side conversational intake)
- **Dev B**: Phase 1 → Phase 6 (admin voice commands, parallel after Phase 2 backend is ready)

### Parallel Opportunities

```
Phase 2: T005 (intake service) ──┐
         T025 (command service)──┤── all parallel after T001-T004
         T006 (intake routes)    │   T006 depends on T005; T026 depends on T025
         T026 (command routes) ──┘

Phase 3: T010 (hook tests)   [P] ─┐
         T011 (useVoiceCapture)[P]─┤── all parallel
         T012a (worker)       [P]─┤
         T012 (whisper hook)      └── after T011 + T012a

Phase 6: T023 (svc tests)    [P] ─┐
         T024 (bar tests)    [P] ─┤── all parallel
         T025 (svc impl)         ─┤
         T027 (hook impl)    [P] ─┤
         T028 (bar impl)         └── after T027
```

---

## Implementation Strategy

### MVP — User Intake (US1 + US2, Phases 1–4)

1. Phase 1: install deps, create stubs
2. Phase 2: backend session + Claude conversation working
3. Phase 3: `useVoiceCapture` + Whisper hook + worker
4. Phase 4: `VoiceIntakeModal` with voice → chatbot → field extraction
5. **STOP**: demo conversational intake — speak naturally, watch fields fill in

### MVP — Admin Commands (US4, Phase 6 — parallel with above)

1. Phase 1: stubs already created
2. Phase 2: voice command backend (`interpretCommand`) working
3. Phase 6: `useVoiceCommand` hook + `VoiceCommandBar` + queue integration
4. **STOP**: demo "Show high priority events this week" → queue filters live

### Full Delivery (US3 + Polish — Phases 5 + 7)

- Phase 5: wire `onComplete` + review step → pre-fill RequestForm
- Phase 7: progress bar, fallback, AI notice, docs, final test run

---

## Notes

- **Shared layer**: `useVoiceCapture` (T011) is the common audio capture hook used by both Whisper (user intake) and `useVoiceCommand` (admin). Build it first.
- **User intake** uses Whisper-tiny.en (~150MB first load, cached). **Admin commands** use Web Speech API — zero download, streaming, instant.
- `@xenova/transformers` requires Vite config: `optimizeDeps.exclude: ['@xenova/transformers']` + `worker.format: 'es'` — handled in T001.
- `ANTHROPIC_API_KEY` required in `backend/.env` for both voice features.
- All voice session state is in-memory; sessions auto-expire when modal closes (DELETE in T014).
- Admin `VoiceCommandBar` is hidden (not disabled) when `window.SpeechRecognition` is unavailable — no broken UI.
- The chatbot system prompt (T005) should NOT ask fields one-by-one. It should extract multiple fields from a single natural message and respond conversationally.
