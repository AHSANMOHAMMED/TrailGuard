# SE3070 Assignment 02 — Design Critique & Justified Improvements

**Smart Wildlife Conservation and Anti-Poaching Monitoring System — "TrailGuard"**
Group CSSE_2025_Y3_NU_WE2 · Case Studies in Software Engineering (SE3070)
Critiqued design: Assignment 01 — *Functional and Interaction Design* (September 2026)

---

## 0. Scope and method

This report critiques the **Assignment 01 design** for the Smart Wildlife Conservation and
Anti-Poaching Monitoring System and proposes **justified improvements** to the use case
diagram, class diagram, sequence diagrams, use case scenarios, and user interfaces.

**Evaluation dimensions**

| Dimension | Weight | How it was assessed |
|---|---|---|
| Functional design | 90% | Requirement coverage against the case study, logical soundness of flows/state, correctness of UML usage |
| Interaction design | 10% | Usability, logical flow, adherence to HCI principles (Nielsen heuristics, Shneiderman's rules, mobile field ergonomics) |

**Method.** Every artifact from Assignment 01 was traced end-to-end: the high-level and
detailed use case diagrams, the shared class diagram, the four detailed scenarios with their
extensions, the four sequence diagrams, the storyboards, and the low/high-fidelity
wireframes. The critique distinguishes **faults that break the offline-first contract**
(highest severity), **faults that make the model logically unsound**, and **faults that are
UML usage errors**, because they require different remedies. Proposed changes are numbered
(R-01…R-10) and each cites the critique point(s) it resolves; traceability is consolidated
in §7.

**What the original design gets right** (kept as-is, per the brief to preserve the design):
the four substantial business use cases are the right decomposition of the case study; the
offline-first contract (local-first writes, explicit PENDING → SYNCED, idempotent upsert by
client UUID, complete-receipt for media, "UI never claims Submitted before Ack") is an
excellent, coherent central decision; delivery-vs-acknowledgement separation in UC03 is
correct; UC04's single-snapshot report with a data cutoff is the right answer to report
consistency; and the domain vocabulary is consistent across all artifacts.

---

## 1. Use case model — critique

### F1. UC diagram is unreadable: 35 bubbles, granularities mixed
**Artifact:** high-level use case diagram (Figure G1) and `01_usecase.puml`.

The model mixes **three levels of abstraction in one diagram**: business use cases
("Generate Conservation Report"), sub-steps of those use cases ("Select Report Filters",
"Validate Report Scope", "Calculate Incident Counts"), and technical sub-steps that are not
goals of any actor at all ("Save Patrol Offline", "Record Delivery State", "Attach
Observation Time"). The case-study requirement — four substantial business use cases — is
met, but a reader cannot recover *which four* from the diagram itself. This also violates
Cockburn's actor-goal level discipline: a use case should be a **goal**, and "Attach
Observation Time" is a form field, not a goal.

### F2. `<<include>>` used in reverse (UML misuse)
**Artifact:** `01_usecase.puml`.

The model draws `Generate Report ..> Select Filters : <<include>>` — i.e., the *base* use
case includes a *smaller* one, which is the correct direction — but it also draws
`GPS Waypoint ..> Start Patrol : <<extend>>` and `Acknowledge ..> Assign Officer :
<<extend>>` **backwards**: `<<extend>>` points from the extension to the base, and the
arrow is drawn from the *base* to the *fragment*. Worse, several `<<include>>` arrows are
inverted in meaning: "Sync Patrol Data includes Save Patrol Offline" makes sync depend on
the thing it uploads, and "Create Alert includes Assess Risk" duplicates the sequence
diagram, where assessment is a step *inside* ingest, not a separate use case. Net effect:
include/extend are used decoratively rather than semantically.

### F3. Actor–use case mismatches (semantic errors)
**Artifact:** `01_usecase.puml`.

1. **Ranger is associated with "Sync Patrol Data" and "Sync Incident Complete-Receipt"** —
   correct in principle, but the Community member, who in UC03 submits verified reports
   through SMS/app (per the case study's community channel), is attached *only* to
   "Submit Community Report"; the verification decision chain is left actor-less.
2. **Sensor Gateway → "Validate Reading Freshness"**: freshness validation is internal
   logic, not an actor-visible goal; the sensor's goal is "deliver reading", which is
   already covered by Ingest.
3. **"Notify Officer" has no initiating actor** on the manager side: in the sequence
   diagram the notification follows assignment as a system step, yet in the use case
   diagram it is drawn as a standalone goal associated only with the Liaison. The Liaison's
   real UC03 goals — record outcomes, close resolved alerts — are under-represented while
   a system step is over-represented.

### F4. Missing business use cases the case study demands
**Artifact:** high-level use case diagram vs. case study text.

- **Escalate unassigned alert** exists as a bubble, but its *scenario* is absent: no
  sequence, no storyboard, no member owns it. A conflict desk that cannot escalate is
  incomplete for the anti-poaching mission.
- **Close alert with outcome** — Liaison's "record outcomes" from the stakeholder table
  never appears in any scenario or sequence.
- **Offline queue review & retry**: the class diagram has `LocalStore.pending()`, and the
  UI shows a pending badge, but no use case lets the ranger *inspect and retry* the pending
  queue. When a sync fails (extension 5b in UC01), the model dead-ends.
- **Manual location entry in UC02** appears as an extend fragment but UC01's manual
  waypoint (the same user goal in a different use case) has no symmetric description —
  asymmetric modeling of the same concept.

---

## 2. Class diagram — critique

### F5. Dangling type references
**Artifact:** `02_class.puml`.

`Patrol.source : GPS|MANUAL` is written as an inline union on Waypoint, `Alert.status :
OPEN..CLOSED` as a text range, `CommunityReport.channel : SMS|APP` likewise — but the
**enumerations themselves are never declared**. The referenced types `SyncState`,
`OfficerRole`, `GeoPoint`, `GeoPolygon`, `Status`, `DeliveryState`, `Ack` are used in
attributes, parameters and returns but never defined anywhere in the model. This is the
single most damaging compile-if-you-can error: the diagram cannot be implemented as drawn.
`ConservationAPI.upsert(record) : Ack` references an `Ack` class that does not exist; the
complete-receipt concept — the design's flagship — has **no type**.

### F6. Operation placement / responsibility errors (SOLID)
**Artifact:** `02_class.puml`.

- `Officer.isAvailable()` exists, but **Alert.assign() also mutates officer availability**
  implicitly; two classes own one rule — a hidden coupling. In the sequence diagram the
  *service* validates availability; the class diagram gives the rule to the entity. The two
  artifacts disagree.
- `LocalStore` knows domain statuses (`status(id) : SyncState`) while `SyncService`
  owns synchronization policy — acceptable, but `ConservationAPI.upsert()` returning a bare
  `Ack` and `ReportService.aggregate(snapshot)` taking a `snapshot` *parameter* of
  unspecified type make the service contracts unimplementable.
- `ReportCriteria.categories : List` — a raw `List` with no type parameter, in a model that
  elsewhere uses UUIDs and DateTime precisely.
- No **repository/boundary stereotype** separation: services talk to entities and to the
  gateway in the same diagram without layering stereotypes («service», «repository»,
  «gateway»), so the architecture described in ARCHITECTURE.md §4 is invisible in UML.

### F7. Multiplicity errors vs. the stated rules
**Artifact:** `02_class.puml` and A01 report §3.

A01's own text states **"At most one active ResponseAssignment per Alert"**, but the
diagram draws `Alert "1" -- "0..*" ResponseAssignment` with **no constraint** — the model
permits what the text forbids. Also `Animal "0..1" -- "0..1" GPSCollar : active collar`
cannot express collar history (an animal has many collars over time; a collar moves between
animals), which the sensor-ingestion flow depends on; and `IncidentReport` has no
association to the **Officer** who reported it, though every scenario names the reporting
ranger.

---

## 3. Sequence diagrams — critique

### S1. UC01: Finish does not flush in-flight waypoints
The sequence shows `completePatrol(id)` saving `COMPLETED, PENDING` — but if a waypoint
save is in flight (Ranger taps Finish while position is being recorded), the diagram has no
interaction for reconciling the tail of the track. The scenario's extension 4a ("Cancel
finish → keep ACTIVE") is likewise absent from the sequence.

### S2. UC01/UC02: no retry interaction after failure
The `alt` for "remains offline" shows the status returning to PENDING — and stops. Who
retries? When? The `SyncService` receives no schedule/retry interaction, yet the scenario
promises "retry after restored". A patrol recorded at dawn would never sync until the ranger
manually re-opens the app — an unmodeled business rule.

### S3. UC02: partial upload of media is unhandled
The diagram notes "complete-receipt required for media" but the interaction has exactly two
outcomes: full ack or "upload interrupted". Real networks deliver the third case: *report
text acked, photo interrupted*. Because the mark-synced decision depends on the complete
receipt, the sequence needs a branch that keeps the attachment PENDING while the report
itself is acked — the scenario text supports it, the diagram does not show it.

### S4. UC03: notification failure leaves the model in limbo
`send(assignment) : DeliveryState` returns a state, but no branch handles `FAILED` — the
manager is left with an ASSIGNED alert, an un-notified officer, and no modeled recovery
(re-notify, reassign, escalate). This contradicts UC03's own storyboard step 5 ("delivery
state recorded") — recorded, yes, but then what?

### S5. UC04: no guard against an empty or over-large window
The interaction queries a snapshot and aggregates; there is no frame for **no synced
records in range** (the scenario has no extension either) nor for a window so large the
snapshot must be paginated. The wireframe shows an empty chart, so the UI anticipates it —
the sequence doesn't.

### S6. Missing system boundary & inconsistent actor coupling
Only UC03's sequence shows the sensor gateway as a true actor; UC04's `ConservationAPI` is
a participant but UC02's `upsert` target is the same boundary drawn differently
("ConservationAPI" vs "API"). Boundary naming should be uniform across all four diagrams.

---

## 4. Use case scenarios — critique

### T1. Happy paths are complete; extensions are inconsistent
Strengths: every scenario numbers its steps, separates action from system response, and
grounds IDs (PT-104, IR-208, RA-031) used consistently in storyboards — genuinely good
practice. Weaknesses:

- **Extension numbering is not anchor-consistent**: UC01 has `2b` (storage failure) after
  `5b` (timeout) in the same table, breaking the convention that extension *N*x branches
  from step *N*.
- **Missing extensions at decision points the case study names**: confidence-based
  triage in UC03 (what does the manager do with a *Low* confidence alert?), camera-trap
  review producing an incident in UC02 (the use case diagram has "Review Camera Trap
  Image" but no scenario), and duplicated-submission behavior in UC02 (the case study's
  complete-receipt concept implies idempotency, but no extension demonstrates a *retry
  after partial upload*).
- **No performance/abundance constraints**: an offline queue of 200 waypoints and 40
  incident drafts is normal for a multi-day patrol; no scenario says what the UI shows for
  queue depth, though the wireframe shows a "Pending" badge with a count.

### T2. UC04's "coverage percent" is undefined
The scenario promises a coverage metric; no formula, no denominator (route-km covered?
waypoints-per-route? time-on-route?). As drawn, two implementers would produce different
numbers. This is a logical soundness fault, not a documentation nit.

---

## 5. Interaction design — critique (10%)

### H1. Offline state is invisible at the point of action
The wireframes show a global "Last sync" line and an offline banner, but **form screens do
not change when the device is offline**: UC02's "Save Report" button looks identical
online/offline. Users cannot form a correct mental model of what will happen on tap — a
violation of **visibility of system status** (Nielsen #1) and **match between system and
real world**. Field users consistently overestimate what "saved" means.

### H2. Destructive ambiguity: Finish and Save lack confirmation semantics
UC01's storyboard shows Finish + confirm (good), but UC02's Save is a single tap with no
draft review, while the high-fi "Review" screen exists *after* saving. Confirmation should
precede commitment (Shneiderman #3: offer simple error handling; Nielsen #5: prevent
errors). Reversal is impossible offline because there is no server to reconcile with.

### H3. Waypoint and evidence capture require too many taps under field conditions
The storyboards show: menu → form → type → photo → location → description → save (6+
interactions). Rangers wear gloves, work in rain, and hold the device one-handed. Large
touch targets exist in the hi-fi (good, ≥44px), but the *flow* violates **recognition over
recall** — the type list is flat, uncategorized, and requires reading all five options.

### H4. No feedback loops for sync progress
The hi-fi shows "Synced at 14:22" or a pending badge — binary endpoints. During a 40-record
upload on a weak link, nothing communicates progress, interruptibility, or per-record
failure. Nielsen #1 again, at the moment of highest user anxiety (will my evidence
survive?).

### H5. Error messages name IDs, not user consequences
"IR-208 PENDING" is machine vocabulary. The user needs "Report saved on this phone. It will
send automatically when you have signal." — the storyboard's *intent* is right but the
strings shown are developer-facing.

---

## 6. Proposed improvements (with justification)

Each change cites the critique points it resolves. All changes preserve the original four
business use cases — none are replaced — and extend scope only where the case study
demands it.

**R-01 (resolves F1, F2, F3) — Restructure the use case model into a two-level diagram.**
Level 1: exactly the four business use cases (UC01–UC04) with actors. Level 2: each use
case gets a *contained* sub-goal view (package per UC) where include/extend are used with
correct arrow direction: `<<include>>` for mandatory sub-behavior (Sync includes
Upload-Pending), `<<extend>>` for conditional behavior pointing extension → base (Manual
Waypoint extends Record Patrol; Escalate extends Assign Response). Actor associations are
corrected: Sensor Gateway attaches only to Ingest Reading; Community → Submit & Verify
chain; Liaison gains Record Outcome & Close Alert. *Justification: restores readability
(the case study's "exactly four major business use cases" becomes visible), fixes the UML
misuse, and makes the anti-poaching escalation path first-class.*

**R-02 (resolves F4) — Add three scoped use cases without replacing any.**
(a) **UC01b Retry Failed Sync** (ranger inspects pending queue, retries individual records)
— dead-end removal; (b) **UC03b Escalate Unassigned Alert** (time-boxed auto-escalation to
backup officer list) — closes the anti-poaching gap; (c) **UC03c Close Alert with
Outcome** (liaison records resolution) — completes the conflict lifecycle. All three are
domain-specific, are scoped as extensions of existing UCs, and inherit the offline-first
contract. *Justification: each is demanded by the case study (unreliable connectivity,
anti-poaching response, outcome recording) and each currently dead-ends.*

**R-03 (resolves F5, F6, F7) — Rebuild the class diagram: declare every type; stereotype
the layers.** Add enums `SyncState{PENDING,SYNCED,FAILED}`, `DeliveryState{PENDING,SENT,
FAILED}`, `PatrolStatus{ACTIVE,COMPLETED,CANCELLED}`, `AlertStatus{OPEN,ASSIGNED,ESCALATED,
CLOSED}`, `LocationSource{GPS,MANUAL}`, `Confidence{HIGH,MEDIUM,LOW}`, and value objects
`GeoPoint`, `GeoPolygon`, `CompleteReceipt`, `SyncAck`. Introduce stereotypes
`«service»`, `«repository»`, `«gateway»`, `«value object»`. Move the availability rule to
`Officer.isAvailable()` consumed by `ConflictService.assign()` (single source of truth).
Replace `List` with `List<IncidentCategory>`. Add `CompleteReceipt` as the return type of
`upsert()` — giving the flagship concept a first-class type. *Justification: the model
becomes compilable and implementable; SOLID single-responsibility restored; the design's
central artifact (complete receipt) is typed.*

**R-04 (resolves F7) — Enforce "at most one active ResponseAssignment per Alert" in the
model.** Draw `Alert "1" -- "0..*" ResponseAssignment {active only}` with a UML constraint
note and make `Alert.assign()` the only writer of `ResponseAssignment.active` — or model
explicitly: a *new* assignment closes the prior one (reassignment), never two active.
*Justification: model now permits exactly what A01's text promises; reassignment becomes a
modeled flow instead of an accident.*

**R-05 (resolves S1, S2, S3) — Complete the offline interactions.** (a) UC01 sequence
gains a **Finish** frame that flushes in-flight waypoints before COMPLETED, plus the 4a
cancel branch; (b) all sync sequences gain a **retry schedule** interaction (SyncService
schedules `retryAfter` on failure; extension 5b becomes a modeled loop); (c) UC02 gains
the **partial-upload branch**: report acked + attachment kept PENDING, resumed with the
same IDs; (d) a uniform `ConservationAPI` boundary name across diagrams. *Justification:
closes the gap between scenario promises ("retry after restored") and modeled behavior;
partial upload is the normal case on field networks, not the exceptional one.*

**R-06 (resolves S4) — Give UC03 a notification-failure branch with a business rule.**
`send()` returns `DeliveryState.FAILED` → assignment stays **PENDING-DELIVERY**, officer
availability is **restored**, and the alert returns to OPEN after a modeled re-notify
attempt ×2 then auto-escalate (linking to R-02b). *Justification: a response chain that
silently absorbs failure is unsafe for anti-poaching; the rule is simple, testable, and
closes the storyboard's own loop.*

**R-07 (resolves S5, T2) — Make UC04's report defined, bounded, and honest.** (a) Define
coverage: `coverage% = synced completed patrol waypoint-distance ÷ assigned-route distance
for the window` (per route, capped at 100); (b) empty-window extension: report generates
with explicit zero-state ("No synced records in range") and the cutoff still displayed;
(c) cap window length (e.g. 92 days) with a validation message. *Justification: two
implementers now produce the same number; the zero-state removes the only unhandled
interaction branch; the window cap prevents unbounded queries on field hardware.*

**R-08 (resolves T1) — Rewrite scenarios with anchored extensions and add the three
missing ones.** Extension numbering normalized to *step*x; new extensions: UC02
camera-trap-review-creates-incident, UC02 retry-after-partial-upload, UC03
low-confidence-triage (Low confidence alerts enter a review queue rather than paging an
officer immediately). Every extension gets at most one sentence of UI-visible consequence.
*Justification: extensions are the contract implementers code against; anchored numbering
and explicit branching make the rubric's "alignment with use case scenarios" checkable.*

**R-09 (resolves H1, H4, H5) — Offline-aware, progress-honest UI language.** Every save
surface shows a **mode chip** (ONLINE / OFFLINE — QUEUED LOCALLY) at the point of action;
sync shows **per-record progress** ("Uploading 3 of 7…") with per-record failure list;
all user-facing strings use consequence language ("Saved on this phone — will send when
signal returns") with IDs demoted to secondary typography. *Justification: directly
applies Nielsen #1/#5 and the storyboard's own intent; zero design-invention cost — the
states already exist in the domain model.*

**R-10 (resolves H2, H3) — Commit-confirm capture flow.** UC02's capture becomes
**draft → review → confirm** (the hi-fi "Review" screen moves *before* commit, not after);
category chips gain icons + grouping (Snares / Animal / Other) for recognition over
recall; UC01's waypoint capture gets a **one-tap big target** (≥64px) and a persistent
undo toast for manual marks. *Justification: Shneiderman #3 (easy reversal) and #4
(internal locus of control); field ergonomics; keeps the wireframe visual language intact.*

---

## 7. Traceability matrix

| Critique point | Improvement(s) | Affected artifacts |
|---|---|---|
| F1 granularities mixed | R-01 | Use case diagram |
| F2 include/extend misuse | R-01 | Use case diagram |
| F3 actor mismatches | R-01 | Use case diagram |
| F4 missing UCs / dead ends | R-02 | Use case diagram, scenarios, sequences |
| F5 dangling types | R-03 | Class diagram |
| F6 responsibility errors | R-03 | Class diagram |
| F7 multiplicity vs. rules | R-03, R-04 | Class diagram |
| S1 finish flush / cancel | R-05 | UC01 sequence, scenario |
| S2 no retry loop | R-05 | UC01/UC02 sequences |
| S3 partial upload | R-05 | UC02 sequence, scenario |
| S4 notification failure | R-06 | UC03 sequence, scenario |
| S5 empty/over-large report | R-07 | UC04 sequence, scenario, UI |
| S6 boundary naming | R-05 | All sequences |
| T1 extension inconsistencies | R-08 | All scenarios |
| T2 coverage undefined | R-07 | UC04 scenario, implementation |
| H1 offline invisibility | R-09 | UIs |
| H2 commit-confirm | R-10 | UIs, UC02 flow |
| H3 tap cost | R-10 | UIs |
| H4 sync progress | R-09 | UIs |
| H5 error strings | R-09 | UIs |

## 8. Implementation contract (for the individual deliverables)

The four implementations follow these rules, which encode R-03…R-09 exactly:

1. **Domain model** (per R-03): the enums and value objects above exist as code; services
   are the only writers of sync/delivery state; entities expose state transitions, not
   raw field writes.
2. **Sync** (per R-05): `synchronize()` iterates the pending queue, attempts each record,
   and applies: full ack → SYNCED; report-ack + attachment-fail → report SYNCED,
   attachment PENDING (same IDs); failure → PENDING with `retryAfter` (exponential
   backoff, capped); offline → no-op with user-visible state.
3. **Conflict** (per R-04, R-06): `assign()` validates `Officer.isAvailable()`; one
   active assignment per alert (reassignment closes the prior); notification FAILED →
   assignment delivery FAILED, availability restored, alert back to OPEN; two failed
   re-notifies → ESCALATED with a notified backup officer.
4. **Reports** (per R-07): snapshot from SYNCED records only; cutoff recorded on the
   snapshot; coverage per the formula; empty window → explicit zero-state; exports reuse
   the same snapshot id.
5. **UI** (per R-09, R-10): mode chip on every save surface; per-record sync progress;
   consequence-language strings; draft → review → confirm incident flow; one-tap
   waypoint with undo.
6. **Tests**: every rule above is a test case — idempotent upsert (same UUID twice → one
   record), partial upload, backoff schedule, single-active-assignment, escalation
   ladder, coverage formula, empty window, offline no-op, plus UI-agnostic validation
   errors. 80%+ line coverage on service code.
