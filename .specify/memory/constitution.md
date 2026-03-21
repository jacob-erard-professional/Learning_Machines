<!--
SYNC IMPACT REPORT
==================
Version change: N/A → 1.0.0 (initial ratification)

Modified principles: None (initial)

Added sections:
  - Core Principles (I–V)
  - Healthcare UI/UX Standards
  - Development Workflow
  - Governance

Removed sections: None

Templates updated:
  ✅ .specify/templates/plan-template.md — Constitution Check gates aligned
  ✅ .specify/templates/spec-template.md — Testing + docs requirements align
  ✅ .specify/templates/tasks-template.md — Tests are MANDATORY (not optional) per Principle III

Deferred TODOs: None
-->

# Intermountain Healthcare Community Health Request System Constitution

## Core Principles

### I. Accessibility First (NON-NEGOTIABLE)

The UI MUST conform to WCAG 2.1 AA standards at minimum. Every interactive element
MUST be keyboard-navigable and screen-reader compatible. Color contrast ratios MUST
meet AA thresholds (4.5:1 for normal text, 3:1 for large text). Forms MUST include
visible labels, descriptive error messages, and focus indicators. No feature is
considered complete until it passes an accessibility check.

**Rationale**: The application serves a broad community health audience including
people with disabilities. Healthcare context makes accessibility a legal and ethical
requirement, not a nice-to-have.

### II. Node.js + React Full Stack

The application MUST use React (with Vite) on the frontend and Node.js/Express on
the backend. No alternative runtimes or frontend frameworks are permitted without a
recorded constitution amendment. Tailwind CSS is the sole styling system. State
management MUST use React Context or Zustand — no Redux or other heavy solutions.
API communication MUST use clearly typed request/response shapes (documented in
`contracts/`).

**Rationale**: Time-constrained hackathon environment requires a single, well-understood
stack the whole team can move fast with. Diverging runtimes increases cognitive overhead
and deployment complexity.

### III. Test Coverage at Every Level (NON-NEGOTIABLE)

Tests are MANDATORY, not optional. Every feature MUST include:
- **Unit tests** for utilities, helpers, routing logic, and data transforms
- **Integration tests** for API endpoints and database interactions
- **Component tests** for React components with user-interaction scenarios

Tests MUST be written before or alongside implementation — not as an afterthought.
A feature is not complete until its tests pass. Frontend tests use Vitest + React
Testing Library. Backend tests use Jest or Vitest with Supertest for HTTP layer testing.

**Rationale**: Healthcare data routing errors have real consequences. Test coverage
ensures correctness of fulfillment logic, geographic routing, and form validation
across the full stack.

### IV. Documentation and Living README

All non-obvious logic MUST include inline comments explaining the "why", not the
"what". Every public function and component MUST have a JSDoc-style docstring. The
`README.md` MUST be updated at every meaningful iteration — it is the single source
of truth for setup, architecture, and deployment. Documentation debt is treated the
same as code debt: it blocks the feature from being considered complete.

**Rationale**: The hackathon team operates under time pressure and teammates must
read each other's code fast. Undocumented code slows everyone down. Judges also
evaluate on clarity and polish.

### V. Concise, Purpose-Driven Code

Every function, component, and module MUST do exactly one thing. Code MUST NOT be
added speculatively for future use. Abstractions are only introduced when the same
logic appears in three or more places. Prefer explicit over clever. Inline magic
values MUST be extracted to named constants. Files exceeding 200 lines MUST be
reviewed for decomposition opportunities.

**Rationale**: Over-engineered solutions in a 6-hour hackathon create blockers,
merge conflicts, and unmaintainable code. Conciseness is a competitive advantage.

## Healthcare UI/UX Standards

The UI MUST reflect Intermountain Healthcare's brand values: trustworthy, warm, and
professional. Specific requirements:

- **Color palette**: Blues and teals as primary anchors; soft amber or green for
  positive accents; avoid heavy reds or alarming contrast combinations
- **Typography**: Modern, legible sans-serif; prioritize readability over decorative choices
- **Mobile-first responsive design**: All views MUST be functional on screens ≥320px wide
- **Form UX**: Required fields MUST be clearly marked; inline validation MUST fire on blur,
  not only on submit; errors MUST be descriptive and actionable
- **Empty & loading states**: Every data-driven view MUST handle empty and loading states
  gracefully — no raw spinners or blank screens

## Development Workflow

- **Branch strategy**: Feature branches only; no direct commits to `main`
- **PR merges**: At minimum one teammate review before merge into `main`
- **Commit style**: Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`)
- **Mock-first development**: UI MUST be built against mock data in `src/data/` before
  real API integration; mock data MUST mirror real data shapes exactly
- **AI integration**: All Claude API calls MUST be isolated in `src/lib/ai.js` (frontend)
  or `backend/src/lib/ai.js` (backend) — never inline in components or route handlers
- **Environment secrets**: No secrets in code; all env vars in `.env` (local) and Render
  dashboard (production); `.env` MUST be in `.gitignore`

## Governance

This constitution supersedes all other informal practices. Amendments require:
1. A written rationale recorded in this file's Sync Impact Report header
2. Version bump per semantic versioning rules (MAJOR/MINOR/PATCH as defined below)
3. Propagation of changes to all dependent templates within the same commit

**Versioning policy**:
- MAJOR: Removal or redefinition of a Core Principle
- MINOR: New principle or section added; material expansion of existing guidance
- PATCH: Clarification, wording improvement, or non-semantic refinement

**Compliance review**: Every PR description MUST include a one-line constitution check
affirming no principles were violated (or documenting a justified exception in the
Complexity Tracking table of `plan.md`).

All PRs and code reviews MUST verify compliance with Principles I (Accessibility),
III (Testing), and IV (Documentation) before approval. These three are non-negotiable
and cannot be deferred to a follow-up ticket.

**Version**: 1.0.0 | **Ratified**: 2026-03-21 | **Last Amended**: 2026-03-21
