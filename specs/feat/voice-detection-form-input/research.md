# Research: Voice Detection Form Input

**Branch**: `feat/voice-detection-form-input` | **Date**: 2026-03-21

---

## Decision 1: Speech-to-Text Engine

**Decision**: `@xenova/transformers` (HuggingFace Transformers.js) running **Whisper-tiny.en** in-browser via WebAssembly + ONNX.

**Architecture**:
- Audio captured via browser `MediaRecorder` API → WAV/WebM blob
- Blob processed in a **Web Worker** (`frontend/src/workers/whisper.worker.js`) to avoid blocking the UI
- Transformers.js `pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en')` runs inference
- Worker posts transcript back to main thread → sent to Claude via backend API

**Rationale**: User explicitly requested HuggingFace model. `@xenova/transformers` runs Whisper natively in the browser — no external STT service, no API key for transcription, works offline, higher accuracy than Web Speech API, consistent across all browsers that support WebAssembly (all modern browsers).

**Trade-offs**:
- First load downloads the model (~150MB for whisper-tiny.en). Cache with `transformers.env.cacheDir`.
- Inference takes 1–3s per utterance (whisper-tiny is the fastest Whisper variant).
- `@xenova/transformers` does not support streaming — record full utterance, then transcribe.

**Alternatives considered**:
- **Web Speech API** — browser-native, streaming, but accuracy is lower and Firefox support is limited. Does not use HuggingFace models as requested.
- **OpenAI Whisper API** — server-side, requires billing/API key. Adds dependency.
- **Deepgram** — excellent real-time quality, but paid service.

**Install**: `npm install @xenova/transformers` in `frontend/`.

---

## Decision 2: Session State Storage

**Decision**: In-memory `Map` on the Express server (module-level, keyed by `sessionId`)

**Rationale**: No database overhead, zero setup time. Sessions last the lifetime of the server process — acceptable for a demo. CLAUDE.md names `lowdb` as the swap target if persistence is needed.

**Alternatives considered**:
- **lowdb**: file-backed JSON, easy swap. Slightly more setup; defer to post-hackathon.
- **Redis**: production-grade session store. Complete overkill for prototype.

**Session lifecycle**: UUID generated client-side at modal open, cleaned up when modal closes or session completes.

---

## Decision 3: Structured Field Extraction

**Decision**: JSON mode — system prompt defines exact JSON schema; Claude returns only valid JSON each turn.

**Response schema**:
```json
{
  "message": "...",
  "extractedFields": {
    "requestorName": null,
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

**Rationale**: Fastest to implement. Tool use guarantees schema compliance but adds ~30% more code. For a hackathon, JSON mode with `temperature: 0` is reliable enough.

**Alternatives considered**:
- **Tool use (function calling)**: More reliable schema enforcement, but extra parsing logic and slightly more tokens. Recommended post-hackathon.
- **Free-text response + regex extraction**: Brittle, error-prone. Rejected.

---

## Decision 4: Topic Enforcement

**Decision**: System prompt constraint with explicit redirect phrase + `formState` injection each turn.

**Pattern**:
- Include current `formState` in system prompt so Claude knows what's already collected.
- Explicit instruction: "If the user discusses anything unrelated to their community health event request, immediately redirect them with: 'I'm here to help you submit a community health request. Let's get back to your event — [next missing field question]'"
- `temperature: 0` for deterministic redirection behavior.

**Rationale**: Claude follows explicit persona constraints reliably at temperature 0. No need for a separate moderation layer in a demo.

---

## Decision 5: Conversation Completion Flow

**Decision**: When `isComplete: true` is returned, the backend finalizes the session and returns the full `formData` object ready for `POST /api/requests`. The frontend pre-fills the `RequestForm` (or directly submits) using the returned data.

**Pre-fill vs. direct submit**: Pre-fill is safer — user sees data before it's submitted, satisfying WCAG requirements for user control and healthcare trust standards. Confirmation step required.
