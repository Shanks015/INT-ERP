# Rebuild Discussion — Current ERP → CompAI CRM Architecture

> Scope: this is a **discussion document**, not an implementation plan that has been executed.
> Nothing in the existing app has been migrated. The bug fixes listed in Part 1 *have* been applied
> to the current codebase; everything from Part 2 onward is proposal only.

---

## Part 1 — What Was Actually Broken (and is now fixed)

These were real defects found by reading the code, not style preferences. All are fixed and verified
(`vite build` exits 0; every modified server file passes `node --check`).

### Crash / silent-corruption class

| # | File | Defect | Impact | Fix |
|---|------|--------|--------|-----|
| 1 | `client/src/pages/ActivityLogs/ActivityLogs.jsx` | Early `return` for non-admins sat **above** `useEffect` | Rules-of-Hooks violation. Hook count changes between renders — React throws "Rendered fewer hooks than expected" when a non-admin's role resolves after mount | Moved the guard below the hook; effect early-returns on `!isAdmin` |
| 2 | `server/src/models/Partner.js` | `isExpired` virtual and the `pre('save')` hook both read `this.mouValidityPeriod` — **a field that does not exist on the schema** | `isExpired` was permanently `false`; `recordStatus` never flipped to `expired`. The entire MoU-expiry feature was dead | Repointed both to `expiringDate`, the field that actually exists |
| 3 | `server/src/controllers/googleForms.controller.js` | `normalizedTitle.includes('event')` was tested **before** `includes('mou signing')` | A form titled "MoU Signing **Event**" was written to the `Event` collection instead of `MouSigningCeremony`. Silent, permanent misfiling of production data | Reordered so specific matches (`mou signing`, `mou update`) precede the generic `event` |

### Broken-feature class

| # | File | Defect | Impact | Fix |
|---|------|--------|--------|-----|
| 4 | `events.controller.js` | `exportCSV` returned a **JSON message**, not CSV | Client downloads with `responseType: 'blob'` and saves as `.csv`. Users got a file named `.csv` containing `{"success":true,"message":"Export functionality available..."}` | Real `json2csv` implementation with correct `Content-Type` / `Content-Disposition` |
| 5 | `meetingTrackers.controller.js` | Same JSON-instead-of-CSV bug | Same silent corrupt download | Same fix |
| 6 | `events.controller.js` | `create` did `new Event(req.body)` — never set `createdBy` | Every event had a null owner. `.populate('createdBy')` returned nothing; audit trail broken for the whole module | Added `createdBy: req.userId` |
| 7 | `import.controller.js` + `SocialMediaList.jsx` | `social-media` had **no case** in the import switch → hit `default` → *"Invalid module specified"*. Separately, `ImportModal` was passed `endpoint`/`title` props it does not accept (it takes `moduleName`) | The Import button on Social Media was doubly broken — wrong props *and* no server support | Added the `social-media` case with a column mapping; fixed the props; added it to the modal's dropdown |
| 8 | `SocialMediaList.jsx` | `DetailModal` passed `item=` and `fields=[{label, value}]`; the component reads `data=` and `field.key` | Detail dialog rendered every field blank | Changed to `data=` and `{key, label, type}` |
| 9 | `SocialMediaList.jsx` | `DeleteConfirmModal` had no `requireReason` | Non-admins could fire a delete with no justification, bypassing the maker-checker contract every other module enforces | `requireReason={!isAdmin}` |
| 10 | `MeetingTrackersList.jsx` | `endDate` existed in filter state and was sent in the query, but **no input rendered it** | The "to date" half of every date-range filter was unreachable from the UI | Added the To Date input |
| 11 | `CampusVisitsList.jsx` | `handleClearFilters` omitted the `type` key entirely | "Clear All" left a `type` filter stuck on, and deep-links via `?type=` could never be cleared | Added `type: ''` to the reset object |

### Dead-code / correctness-drift class

| # | File | Defect | Impact | Fix |
|---|------|--------|--------|-----|
| 12 | `enhancedStats.controller.js` | `default:` sat mid-switch, followed by a **second** `case 'StudentExchange'` duplicating one at line 650 | The later block was unreachable (first case wins). It also queried a `university` field that doesn't exist on StudentExchange — it queries `exchangeUniversity`. Had it ever run, it would have returned zeros | Deleted the dead duplicate; moved `default:` to the end |
| 13 | `events.controller.js`, `meetingTrackers.controller.js` | `getPendingCount` / `getAllPending` queried `'pending_create'` | Not in either schema's status enum. Harmless today, but it signals a workflow that was designed and never built — a future reader would assume pending-create exists | Removed; queries now match the real enum |
| 14 | `Dashboard.jsx` | Quick Access used `<a href>` instead of `<Link>` | Every tile triggered a **full page reload**, destroying SPA state and re-downloading the bundle | Converted to `<Link>`; added the import |
| 15 | `PartnersList.jsx` | Two hardcoded `trend: { change: 5, percentage: 8.3, direction: 'up' }` objects | The dashboard **displayed fabricated growth numbers to users as if they were real analytics**. This is the most serious non-crash bug in the codebase | Removed both; the cards now show only backend-computed values |
| 16 | `Reports.jsx` | `recordCount` / `countLoading` declared, never read | Dead state | Removed |
| 17 | `keepAlive.job.js` | `cron.schedule` with no timezone | Every other job in the codebase pins `Asia/Kolkata`. This one drifted with server TZ | Added the timezone |

**#15 deserves emphasis.** Fabricated metrics rendered indistinguishably from real ones is a
trust defect, not a cosmetic one — someone could have made a decision on "+8.3% growth" that was a
literal constant in the source.

---

## Part 2 — Honest Assessment of the Current Architecture

Before discussing a rebuild, it's worth being precise about what is *actually* wrong, because
"rewrite it in a new stack" is often the wrong answer.

### What the current system does well

- **The generic controller factory is genuinely good.** `generic.controller.js` gives ~14 modules
  full CRUD + approval + pagination + CSV in one place. That is real leverage.
- The maker-checker workflow (`pending_edit` / `pending_delete` + `pendingChanges`) is a coherent,
  correctly-implemented domain concept.
- Activity logging with a TTL index and non-blocking `setImmediate` writes is thoughtful.
- Code-splitting via `lazy`/`Suspense` is done properly throughout.

### What is actually wrong

The core problem is **not the stack**. It is that three modules — Partners, Events,
MeetingTrackers — have **hand-written duplicates** of the factory. Every bug in Part 1's
"broken-feature" class lives in exactly those duplicates:

- Bugs #4, #5 (fake CSV export) — the factory's `exportCSV` is correct. The copies weren't.
- Bug #6 (missing `createdBy`) — the factory sets it. The copy didn't.
- Bug #13 (`pending_create`) — the factory uses the right enum. The copies drifted.

That is the real finding: **the abstraction was right, and the damage came from bypassing it.**
A rewrite that doesn't address *why* people bypassed the factory will reproduce the same problem
in a new language.

The secondary problems are genuine but ordinary:

| Problem | Severity | Rewrite required? |
|---|---|---|
| No test suite anywhere | High | **No** — can be added today |
| No input validation layer (no zod/joi); `req.body` flows into `Object.assign` | High | **No** |
| No schema types; field-name drift caused bugs #2 and #12 | High | Helped by TypeScript |
| `/webhook` for Google Forms is **unauthenticated** | **Critical** | **No** — fix immediately |
| `pendingChanges` is `Schema.Types.Mixed` — unvalidated arbitrary object | Medium | Helped by typed JSON |
| Polling (`setInterval` 5s in UserManagement) instead of push | Low | No |

> **Act on the webhook issue regardless of any rebuild decision.** An unauthenticated endpoint that
> performs `Model.create()` lets anyone on the internet insert records into ten collections. This is
> a shared-secret header or HMAC signature check — an afternoon's work, not a migration.

---

## Part 3 — What CompAI CRM Actually Is

From `github.com/trycompai/crm`. Worth stating plainly, because the architectural fit is **partial**,
not total.

**Stack:** Next.js (App Router) · NestJS + `nestjs-trpc` · Prisma · PostgreSQL · Better Auth
(Google-only sign-in).

**Its actual thesis — "agentic-first":** the product is built around a **durable research agent**
that runs independently of any user session. The distinguishing design choices:

1. **Queue-driven work.** Jobs are claimed from Postgres with `FOR UPDATE SKIP LOCKED`. Multiple
   workers pull from one queue without stepping on each other. Work survives restarts.
2. **Evidence-based identity matching — explicitly no confidence scores.** A person/company match
   is justified by *citable evidence* (this domain, this email header, this page), not a
   `0.87` similarity float. This is a deliberate rejection of fuzzy-matching heuristics.
3. **Sandboxed bash with deny-all egress.** The agent can execute, but reaches only allow-listed hosts.

### The fit assessment — this is the important part

CompAI CRM is a **CRM for outbound sales research**. The current app is an **institutional records
system** for a university's international office. These are not the same shape.

| Current ERP module | Maps to CompAI concept? |
|---|---|
| **Outreach** (IMAP reply detection, SMTP send, contact matching) | ✅ **Strong fit.** This is literally what CompAI is for |
| **Partners** (MoU lifecycle, expiry) | 🟡 Partial — an entity with a lifecycle, but no research loop |
| Campus Visits, Events, Conferences, Immersion Programs, Student Exchange, Masters Abroad, Scholars, Memberships, Digital Media, Social Media, MoU Updates/Signing, Meeting Trackers | ❌ **No fit.** These are *records of things that happened*. There is nothing for an agent to research. They need a form, a table, a filter, and an export |

**So roughly 2 of 16 modules benefit from the agentic architecture.** The other 14 would gain
Postgres + TypeScript + Prisma (real wins) while paying the full cost of a rewrite for features
they don't use.

The single genuinely compelling mapping is bug-adjacent: the existing Outreach module does contact
matching by **string comparison against an `alternativeEmails` array** (see the two most recent
commits, which are both fixes to exactly this). CompAI's evidence-based matching is a materially
better answer to that specific problem.

---

## Part 4 — Three Honest Options

### Option A — Repair in place *(lowest risk, highest immediate value)*

Do not rewrite. Instead:

1. **Delete the three hand-written controllers.** Fold Partners, Events, and MeetingTrackers back
   into the generic factory. Where the factory can't express something, *extend the factory* with a
   config hook rather than forking it. This structurally prevents the entire class of bugs #4/#5/#6/#13.
2. **Authenticate the webhook.** Today. HMAC signature or shared secret.
3. **Add a validation layer.** `zod` schemas per module at the route boundary. Kills the
   `Mixed`-typed `pendingChanges` hazard and the `Object.assign(record, req.body)` mass-assignment risk.
4. **Add tests** for the factory, the approval state machine, and the Google Forms title router
   (bug #3 would have been caught by one three-line test).
5. Optionally adopt TypeScript incrementally via JSDoc + `checkJs` — catches bugs #2 and #12
   with zero migration.

**Cost:** ~2–3 weeks. **Risk:** low. **Addresses:** every root cause identified in Part 1.

### Option B — Strangler-fig: new Outreach service only

Keep the ERP as-is. Build **only the Outreach module** on the CompAI stack as a separate service:
NestJS + Prisma + Postgres + the queue/agent pattern + evidence-based matching. Point the existing
React app's Outreach pages at the new service.

This puts the agentic architecture exactly where it earns its keep, and leaves the 14 CRUD modules
alone. If it succeeds, you have a real basis for judging whether to migrate more. If it fails, the
blast radius is one module.

**Cost:** ~4–6 weeks. **Risk:** medium, well-contained. **Addresses:** the outreach-matching
problem properly; leaves the Part 1 root causes untouched (so do Option A's steps 1–3 too).

### Option C — Full rebuild on CompAI CRM

Port all 16 modules to Next.js + NestJS + Prisma + Postgres.

**What you'd genuinely gain:** relational integrity (Mongoose refs with no FK enforcement is a real
weakness here), TypeScript end-to-end, Prisma migrations vs. the current schemaless drift, a
proper agent runtime for Outreach.

**What it would cost:** re-implementing 16 modules, the RBAC + `allowedModules` system, the
maker-checker workflow, the XLSX/CSV importers with their layout-agnostic parsing, PDF/DOCX report
generation, the IMAP/SMTP stack, and the Google Forms ingestion — plus migrating live Mongo data
into a relational schema. Realistically a multi-month effort, during which no user-visible
improvement ships.

**The honest concern:** the current codebase's problems are *discipline* problems (bypassed
abstraction, no validation, no tests), not *stack* problems. A rewrite does not automatically
supply discipline. Without tests and a validation layer, the new system drifts the same way — just
in TypeScript.

---

## Part 5 — Recommendation

**Do Option A now, then evaluate Option B.**

Concretely, in order:

1. **This week:** authenticate the Google Forms webhook. It is an open write endpoint.
2. **Next:** collapse the three duplicate controllers into the factory. This is the single
   highest-leverage change available — it eliminates the root cause of 4 of the 17 bugs fixed above
   and prevents recurrence.
3. **Then:** zod validation at every route boundary, plus tests for the factory and the approval
   state machine.
4. **Only after 1–3 are done:** if outreach contact-matching is still causing real pain (the commit
   history suggests it is), build Option B as a separate service and let the two architectures
   coexist. That gives a genuine, low-risk read on whether the CompAI model suits this domain
   before committing to it wholesale.

If a full migration is chosen anyway, the sequencing that minimises risk is: Outreach first (highest
fit, proves the stack), Partners second (lifecycle logic, moderate fit), then the 14 CRUD modules
last as a mostly-mechanical port — and build the generic factory equivalent *first* in the new
stack, before porting any module, so the duplication problem isn't recreated on day one.

---

## Appendix — Files Modified in Part 1

**Client (8):** `ActivityLogs.jsx` · `Dashboard.jsx` · `SocialMediaList.jsx` · `Settings.jsx` ·
`CampusVisitsList.jsx` · `MeetingTrackersList.jsx` · `PartnersList.jsx` · `Reports.jsx` ·
`components/Modal/ImportModal.jsx`

**Server (6):** `models/Partner.js` · `controllers/events.controller.js` ·
`controllers/meetingTrackers.controller.js` · `controllers/googleForms.controller.js` ·
`controllers/enhancedStats.controller.js` · `controllers/import.controller.js` ·
`jobs/keepAlive.job.js`

**Verification:** `vite build` → exit 0. `node --check` → passes on all modified server files.
No test suite exists to run, which is itself a finding.

### Known issues deliberately NOT fixed (out of scope, flagged for decision)

- **Unauthenticated `/webhook`** — a security fix, not a bug fix; wanted your call before adding auth
  that could break the live Google Forms integration.
- **`Object.assign(record, req.body)` mass-assignment** in the factory's `update` — a client can set
  any schema field, including `status` and `createdBy`. Needs a validation layer, not a one-line patch.
- **`allowedModules` module-name lists drift** across `PendingActions`, `MyRequests`,
  `UserManagement`, `Reports`, and `ImportModal` — five hardcoded lists that disagree. Should be one
  shared constant; consolidating it touches permission behaviour, so it wants a deliberate decision
  rather than a quiet edit.
