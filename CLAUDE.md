# CLAUDE.md — Intermountain Healthcare Hackathon

## Project Overview

We are building a web application for Intermountain Healthcare in a 6-hour hackathon. The problem statement will be inserted below on the day of the competition.

---

## 🏥 Business Case

> **[INSERT PROBLEM STATEMENT HERE ON THE DAY OF THE COMPETITION]**
>
> _Paste the full business case text here before starting work. Include any constraints, target users, success criteria, and any data or APIs provided._

---

## Tech Stack

- **Frontend**: React + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **State**: React Context or Zustand (keep it simple)
- **Backend** (if needed): Node/Express or serverless functions
- **Deployment**: Vercel or Netlify (fast deploys)

Avoid over-engineering. Prefer solutions that ship fast and look polished.

---

## Repository & Branch Strategy

We work on **feature branches** and merge into `main` only when stable.

```
main          ← stable, demo-ready at all times
├── feat/ui-shell         ← layout, nav, design system
├── feat/core-feature-1   ← [rename to match problem]
├── feat/core-feature-2   ← [rename to match problem]
└── feat/data-integration ← API calls, mock data, backend
```

**Rules:**
- Never commit directly to `main`
- Keep branches focused — one concern per branch
- Merge via PR with at least one teammate glance
- Resolve conflicts quickly; communicate in-person when branches overlap
- If a branch is abandoned, delete it to reduce noise

---

## Project Structure

```
src/
├── components/       # Reusable UI components
│   └── ui/           # Primitive elements (Button, Card, Input, etc.)
├── pages/            # Top-level route pages
├── hooks/            # Custom React hooks
├── lib/              # Utilities, helpers, API clients
├── data/             # Mock data / static assets
└── App.jsx           # Root component + routing
```

---

## Design & UI Guidelines

**Client:** Intermountain Healthcare — a trusted regional health system. The UI should feel:
- **Clean, accessible, and trustworthy** — this is a healthcare context
- **Professional but not sterile** — warm, human, approachable
- **Mobile-aware** — assume judges may view on any screen size

**Palette inspiration:** Blues, teals, and whites are safe anchors. Accent with a warm tone (soft amber or green) to signal health/vitality. Avoid anything that reads as alarming (heavy red, harsh contrasts).

**Typography:** Use a legible, modern sans-serif. Prioritize readability over flair.

**Components to build early (Day-of priority):**
1. App shell (nav, sidebar or header, footer)
2. A reusable `Card` component
3. A reusable `Button` with primary/secondary variants
4. Loading and empty states

---

## Development Principles

### Move Fast, Stay Clean
- Write code that works first, then tidy — don't gold-plate during the competition
- Use comments for anything non-obvious; teammates need to read your code fast
- Prefer explicit over clever

### Mock Early, Integrate Late
- Stand up the UI with hardcoded/mock data immediately
- Wire real data or APIs only once the UI is working
- Keep mock data in `src/data/` so it's easy to swap

### Communication
- Call out blockers immediately — we have 6 hours, not 6 days
- Assign owners to each branch at the start
- Check in as a team every ~90 minutes

---

## Git Workflow (Quick Reference)

```bash
# Start a new feature branch
git checkout main && git pull
git checkout -b feat/your-feature-name

# Save work frequently
git add -A && git commit -m "feat: short description"

# Push branch
git push -u origin feat/your-feature-name

# Merge into main (when ready)
git checkout main && git pull
git merge feat/your-feature-name
git push
```

---

## Day-Of Checklist

**First 15 minutes:**
- [ ] Read and discuss the business case as a team
- [ ] Agree on core features vs. stretch features
- [ ] Assign branch ownership
- [ ] Scaffold the project and push initial commit

**By hour 2:**
- [ ] App shell deployed and live
- [ ] Core feature UI (with mock data) visible

**By hour 4:**
- [ ] Core feature functional end-to-end
- [ ] Real data wired in (if applicable)

**Final hour:**
- [ ] Polish UI — spacing, color, typography, loading states
- [ ] Test on mobile / different browser
- [ ] Prepare demo flow — know what you're clicking through
- [ ] Deploy final version

---

## What Claude Should Know When Helping

- We are time-constrained — **favor fast, correct solutions over perfect ones**
- Prefer **self-contained components** that don't require much global context
- When suggesting architecture, **default to the simplest thing that works**
- We are building for **healthcare users** — prioritize clarity, accessibility (a11y), and trust
- If generating UI, match the Intermountain Healthcare aesthetic: clean, professional, warm
- When working on a branch, **stay focused on that branch's concern** — don't refactor unrelated code
