# Eragear Learning OS UX/UI plan

Created: 2026-05-17

## Product stance

Eragear should not feel like an AI chat box inside Obsidian. The primary product is a Software Engineering Learning OS that answers three questions every time the user opens it:

```text
Where am I?
What am I missing?
What should I do next today to become stronger?
```

Chat stays available as a secondary tool. Learning state, evidence, and next action are the primary UI.

## UX spine

```text
Command Center
-> Today Focus
-> Concept Inspector
-> Learning Session
-> Examiner
-> Artifact Review
-> Mastery Evidence
```

The default screen should reduce decision load to one clear action:

```text
Today, do this first.
Here is why it matters.
Here is the expected output.
Here is how we will know you actually understand it.
```

## Information architecture

```text
Eragear Learning OS
├── Command Center
│   ├── Today Focus
│   ├── Next Action Queue
│   ├── Active Concept
│   ├── Skill Map Summary
│   ├── Weak Concepts
│   ├── Due Reviews
│   └── ACP Agent Tasks
│
├── Skill Map
│   ├── Systems Internals
│   ├── Data Systems
│   ├── Runtime / Backend
│   ├── Production Debugging
│   ├── Distributed Systems
│   └── AI Engineering
│
├── Concept Inspector
│   ├── Current Concept State
│   ├── Missing Knowledge
│   ├── Prerequisites
│   ├── Related Concepts
│   ├── Evidence
│   └── Suggested Actions
│
├── Learning Session
│   ├── Explain
│   ├── Visualize
│   ├── Connect
│   ├── Test
│   ├── Apply
│   └── Review
│
├── Examiner Mode
│   ├── Question
│   ├── User Answer
│   ├── Rubric Score
│   ├── Misconceptions
│   └── Next Fix
│
└── Artifact Review
    ├── HTML Explainer
    ├── Quiz
    ├── Bridge Note
    ├── Case Study
    ├── ADR
    └── Apply Proposal
```

## Navigation model

### Ribbon

The ribbon icon opens the Learning Command Center.

Label:

```text
Open learning center
```

### Sidebar tabs

The Eragear sidebar should expose these primary tabs:

```text
Learning
Inspector
Examiner
Artifacts
Chat
```

`Learning` is the default tab. `Chat` is intentionally last because chat is support infrastructure, not the core product.

### Command palette

Command names must use sentence case and avoid repeating the plugin name.

```text
Open learning center
Diagnose current note
Generate next action queue
Start learning session
Run examiner
Generate bridge note
Generate case study
Review agent proposals
Run next learning action
Create next learning agent task
Run next learning agent task
```

## Main screen: Command Center

### Layout contract

Desktop and wide sidebar layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Eragear Learning OS                         Sprint: S01       │
│ Rebuilding SWE Foundation                  2026-05-17         │
├───────────────────┬─────────────────────────┬────────────────┤
│ Skill Map         │ Today Focus             │ Active Concept │
│                   │                         │                │
│ Systems        32 │ 1. Build bridge note    │ HashMap vs...  │
│ Data Systems   28 │    HashMap vs Hash Index│ Status: explain│
│ Runtime        21 │    Why: blocker         │ Maturity: 2/6  │
│ Production     12 │    Output: bridge note  │ Missing: ...   │
│ Distributed     8 │                         │                │
│ AI Engineering 45 │ 2. Visualize read path  │ Next action    │
├───────────────────┴─────────────────────────┴────────────────┤
│ Due Reviews                                                   │
├───────────────────────────────────────────────────────────────┤
│ ACP Agent Tasks                                               │
└───────────────────────────────────────────────────────────────┘
```

Narrow sidebar layout:

```text
Header
Today Focus
Active Concept
Next Action Queue
Due Reviews
ACP Agent Tasks
Skill Map Summary
```

### Today Focus

This is the default first panel.

Content hierarchy:

```text
Today Focus
1 thing to do now
Build bridge note: HashMap vs Hash Index

Why this matters
This blocks database indexing, PostgreSQL read path, and query performance.

Expected output
- Explain HashMap vs Hash Index
- Show key -> hash -> bucket -> row pointer
- Explain why range query fails
- Link to B-Tree and PostgreSQL Read Path

Primary action: Start 25-min session
Secondary action: Generate scaffold
```

Rules:

- Show one primary action only.
- If the top action is blocked, show the blocker and the prerequisite action instead.
- The score is visible but secondary to the human explanation.
- The expected output must be concrete enough to verify.

### Next Action Queue

The queue is a learning scheduler, not a generic todo list.

Each row should show:

```text
Rank
Action
Concept
Why
Expected output
Score
Suggested agent
Blocked by
Actions
```

Expanded reason panel:

```text
Priority: 95
Reason:
- Active sprint match
- Prerequisite for PostgreSQL Read Path
- Missing mechanism evidence
- No quiz score
- No case study
- Weak confidence
```

Actions:

```text
Run suggested action
Create agent task
Run with ACP
Open note
```

### Active Concept

The panel mirrors the active note and should be useful even when the user never opens YAML.

Required fields:

```text
Title
Area
Status
Maturity
Status stepper
Missing knowledge
Prerequisites
Definition of Done blockers
Suggested next action
Artifact quality
Mastery evidence
```

The most important rule: do not let the user believe a concept is done without evidence.

### Due Reviews

Rows should show:

```text
Concept
Due date
Last score
Weak point
Action
```

Primary actions:

```text
Start review
Run examiner
Schedule next review
```

### ACP Agent Tasks

ACP tasks should never feel like direct vault writes. The lane must make the staging model visible.

States:

```text
Queued
Running
Blocked
Proposal pending
Applied
Rejected
```

Required affordances:

- Run queued task.
- Mark blocked.
- Review proposal.
- Apply proposal only after validation passes.
- Reject proposal with visible reason.

## Core screen: Skill Map

Skill Map answers: "Where am I?"

### Categories

```text
Systems Internals
Data Systems
Runtime / Backend
Production Debugging
Distributed Systems
AI Engineering
```

Each category row:

```text
Name
Progress bar
Percent
Weakest concept
Next unlock
```

Diagnosis panel:

```text
You are tool-capable, but systems foundation and production debugging are weak.
Recommended sprint: S01 - Systems Bridge
Focus: Memory -> HashMap -> Index -> Query Path
```

Progress should be derived from maturity and evidence, not note count alone.

## Core screen: Concept Inspector

Concept Inspector answers: "What am I missing in this note?"

### Layout

```text
Title
Area
Status
Maturity

Current understanding
Missing concepts
Prerequisites
Related concepts
Evidence
Suggested next action
Actions
```

For `HashMap vs Hash Index`, a good inspector state is:

```text
Current understanding
You can explain the surface analogy: "Hash Index is like HashMap on disk."
But the mechanism is incomplete.

Missing concepts
- Bucket mechanism
- Collision handling
- Row pointer / tuple id
- Disk page
- Buffer cache
- WAL / recovery
- Range query tradeoff

Suggested next action
Create bridge note: HashMap in RAM vs Hash Index in Database
```

Actions:

```text
Explain
Visualize
Connect
Quiz
Case
Run examiner
```

## Core screen: Learning Session

Learning Session answers: "How do I work through this concept now?"

Flow:

```text
Explain -> Visualize -> Connect -> Test -> Apply -> Review
```

Each step should show:

```text
Current answer or current artifact
Diagnosis
Required fix
Expected output
Step actions
Completion gate
```

Example:

```text
Step 1 / 6: Explain

Current answer
Both use hashing. HashMap is in RAM, Hash Index is disk.

Diagnosis
Good start, but missing bucket, collision, and row pointer.

Required fix
Explain why a database index entry usually stores a row pointer instead of the full row.

Actions
Ask Socratic question
Generate diagram
Take quiz
Create bridge note
Mark step complete
```

Completion is blocked until the relevant Definition of Done gate passes.

## Core screen: Examiner Mode

Examiner answers: "Do I actually understand this?"

### Before submit

```text
Concept
Question number
Question
Answer textarea
Rubric checklist
Submit answer
```

Rubric example:

```text
- Mentions index as access path
- Mentions row lives in table/heap page
- Mentions pointer / tuple id / row id
- Mentions storage efficiency
- Mentions MVCC / visibility check
```

### After submit

```text
Score
What you got right
Missing
Misconceptions
Next fix
Actions
```

Actions:

```text
Open note
Generate bridge
Ask next question
Schedule review
Update mastery evidence
```

Scoring must update mastery categories:

```text
Recall
Mechanism
Transfer
Application
```

Weak answers should create follow-up review tasks instead of only showing feedback.

## Core screen: Artifact Review

Artifact Review answers: "What will change in my vault?"

ACP agents must produce proposals, not direct final writes. The UI should make this explicit.

Required sections:

```text
Generated by
Artifact type
Target file
Proposed changes
Diff preview
Validation
Quality score
Actions
```

Validation checklist:

```text
- File path allowed
- No external writes
- Metadata valid
- Links resolved
- Artifact quality passed
- Quiz score or review state present when required
```

Actions:

```text
Apply
Apply and update status
Reject
Edit manually
```

`Apply and update status` is enabled only when the proposal satisfies the next state gate.

## Status model

Use a compact stepper:

```text
Seed -> Explain -> Visualize -> Connect -> Test -> Apply -> Review -> Done -> Mastered
```

Definitions:

| Status | Meaning |
| --- | --- |
| `seed` | New concept, not structured yet. |
| `explain` | Has a definition, but depth is incomplete. |
| `visualize` | Needs a diagram, flow, or mental model. |
| `connect` | Needs a bridge to related concepts. |
| `test` | Needs quiz or examiner evidence. |
| `apply` | Needs lab, case study, ADR, or project evidence. |
| `review` | Waiting for spaced review. |
| `done` | Minimum evidence checklist passed. |
| `mastered` | Strong evidence across recall, mechanism, transfer, and application. |

## Definition of Done UI

The UI should show why a concept cannot move forward.

```text
Definition of Done
- Has one-line explanation
- Has mechanism explanation
- Has comparison with related concept
- Missing failure modes
- Missing production case study
- Quiz score below 7
- Not reviewed after 7 days

Status cannot move to done yet.
Next required action: Generate failure modes.
```

Rules:

- Never promote to `done` from status alone.
- Show blockers as human-readable strings from `definition-of-done.ts`.
- Keep blockers actionable.
- Put the next required action near the blocked state control.

## Data model shown by UI

YAML is backend state. The user should not need to edit it manually.

Recommended frontmatter shape:

```yaml
type: concept
area: data-systems
status: explain
maturity: 2
priority: 95
sprint: S01-Systems-Bridge

prerequisites:
  - "[[Hash Function]]"
  - "[[Memory vs Disk]]"
  - "[[Database Page]]"

missing:
  - bucket mechanism
  - collision handling
  - row pointer
  - WAL/recovery
  - range query tradeoff

mastery:
  recall_score: 0
  mechanism_score: 0
  transfer_score: 0
  application_score: 0
  last_examined:
  evidence_notes: []
  weak_points: []

artifacts:
  html_explainer:
    path:
    quality_score:
  quiz:
    path:
    quality_score:
  bridge_note:
    path:
    quality_score:
  case_study:
    path:
    quality_score:

review:
  last_reviewed:
  review_due: 2026-05-22
  quiz_score:
```

Implementation note: the current parser must keep tolerating old flat frontmatter. UI can prefer nested data when available and fall back to flat fields.

## Visual design direction

Style:

```text
Developer tool
Learning dashboard
Obsidian-native
Low distraction
High signal
```

Avoid:

```text
Cute AI chatbot tone
Marketing hero layout
Heavy shadows
Gradients
Large decorative panels
Global CSS selectors
Inline styles
```

Use Obsidian variables:

```css
--background-primary
--background-secondary
--text-normal
--text-muted
--interactive-accent
--interactive-accent-hover
--background-modifier-border
--background-modifier-border-hover
--text-error
--text-warning
--text-success
--radius-s
--radius-m
--size-4-1
--size-4-2
--size-4-3
--size-4-4
```

Component rules:

- Scope all CSS under `.eragear-copilot-root`.
- UI wrapper classes use `cui-`.
- Feature classes use `eragear-`.
- Keep cards subtle: border, small radius, low or no shadow.
- Prefer compact progress bars and small badges.
- Use status colors sparingly and always through variables or component tokens.
- Keep touch targets at least 44px for interactive controls.

## Semantic status treatments

These are semantic intentions. Actual colors should map through Obsidian variables or scoped component tokens.

| Status | Treatment |
| --- | --- |
| `seed` | Muted neutral badge. |
| `explain` | Informational badge. |
| `visualize` | Model-building badge. |
| `connect` | Relationship badge. |
| `test` | Attention badge. |
| `apply` | Action badge. |
| `review` | Scheduled badge. |
| `done` | Success badge. |
| `mastered` | Strong success badge. |
| `blocked` | Error or warning badge depending on severity. |

## Component plan

Primary components:

```text
CommandCenterView
HeaderBar
TodayFocusPanel
SkillMapPanel
NextActionQueue
NextActionCard
ActiveConceptPanel
ConceptInspectorPanel
LearningSessionView
ExaminerView
ArtifactProposalReview
DueReviewList
AgentTaskLane
MaturityBadge
StatusStepper
MissingKnowledgeChecklist
EvidenceChecklist
DefinitionOfDonePanel
PrerequisiteGraph
ArtifactQualityPanel
MasteryEvidencePanel
```

Command Center hierarchy:

```text
CommandCenterView
├── HeaderBar
├── TodayFocusPanel
│   ├── NextActionCard
│   └── ExpectedOutputList
├── ActiveConceptPanel
│   ├── MaturityBadge
│   ├── StatusStepper
│   ├── MissingKnowledgeChecklist
│   ├── DefinitionOfDonePanel
│   └── SuggestedActionButtons
├── NextActionQueue
│   └── NextActionCard[]
├── SkillMapPanel
├── DueReviewList
└── AgentTaskLane
    └── ArtifactProposalReview
```

Boundary rules:

- Feature components may import `@/components/ui/*`.
- Feature components must not import `@base-ui/react/*` directly.
- Portal UI must use `PortalProvider` so popups stay under the plugin root.
- Icon-only buttons require `aria-label`.

## MVP order

### MVP 1: Learning control panel

Goal: one session can answer "what should I do now?"

Build or refine:

```text
Command Center
Today Focus
Active Concept Inspector
Next Action Queue
Weak Concept Detector
Status Stepper
Definition of Done blockers
```

Acceptance:

- User sees one recommended action.
- User sees why it was selected.
- User sees expected output.
- User sees blockers before promoting status.
- User can run deterministic action from the UI.

### MVP 2: Evidence loop

Goal: prevent false confidence.

Build or refine:

```text
Examiner Mode
Artifact Proposal Review
Evidence Checklist
Artifact Quality Panel
Mastery Evidence Panel
Due Review List
```

Acceptance:

- Examiner result updates mastery evidence.
- Weak answer creates follow-up action.
- Proposal apply is blocked when validation fails.
- Done requires real evidence.

### MVP 3: Curriculum intelligence

Goal: recommend the right order, not only the highest score.

Build or refine:

```text
Skill Map
Prerequisite Graph
Case Study Generator
Review Scheduler
Learning Sprint Planner
Dependency-aware queue
```

Acceptance:

- Blocked notes explain unmet prerequisites.
- Foundational prerequisites are prioritized before dependent notes.
- Active sprint produces a finite ordered learning path.
- Skill Map progress reflects mastery evidence.

## Primary user flows

### Flow A: I do not know where I am

```text
Open learning center
-> View Skill Map
-> See weakest areas
-> Start Diagnostic Mode
-> Examiner updates maturity and weak points
-> Next Action Queue refreshes
```

### Flow B: I do not understand this concept

```text
Open note
-> Concept Inspector detects weak concept
-> Start Learning Session
-> Explain
-> Visualize
-> Connect
-> Quiz
-> Generate case study
-> Schedule review
```

### Flow C: I want to learn today

```text
Open learning center
-> Today Focus
-> Start 25-min session
-> Complete one artifact
-> Examiner checks understanding
-> Update status and evidence
-> Queue refreshes
```

### Flow D: I want to use an ACP agent

```text
Click generate artifact
-> Create agent task
-> ACP agent creates proposal JSON
-> Proposal appears in Artifact Review
-> User reviews diff and validation
-> Apply
-> Metadata and queue update
```

## Diagnostic Mode

Diagnostic Mode is for the overwhelmed user.

Start state:

```text
Goal
Find your current SWE foundation level.

Test areas
- Memory vs Disk
- HashMap vs Hash Index
- B-Tree vs Hash Index
- Event Loop vs Thread Pool
- Cache Failure
- Slow Query Debugging

Action
Start 15-min diagnostic
```

Result state:

```text
Current profile
Tool-capable developer

Weakness
Systems mechanism

Stronger
- Surface explanation
- Tool familiarity
- High curiosity

Weaker
- Internal mechanism
- Storage/runtime model
- Production failure mode

Recommended sprint
S01 - Systems Bridge
```

## Accessibility and Obsidian constraints

Required:

- Native `button`, `input`, `textarea`, and `select` where possible.
- Keyboard access for all controls.
- `aria-label` on icon-only buttons.
- `role="status"` and `aria-live="polite"` for scan/queue updates.
- `:focus-visible` styles using Obsidian variables.
- No `innerHTML` or `outerHTML`.
- No default hotkeys.
- No global CSS selectors.
- No hard-coded colors, spacing, or inline visual styles.

Verification checks:

```bash
rg -n "from ['\"]@base-ui/react" src --glob '!src/components/ui/**'
rg -n '#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(' src styles.css
npm run lint
npm run build
```

Runtime checks when Obsidian is open:

```bash
obsidian vault=PlaygrondObsidianVault plugin id=eragear-copilot
obsidian vault=PlaygrondObsidianVault plugin:reload id=eragear-copilot
obsidian vault=PlaygrondObsidianVault dev:errors
obsidian vault=PlaygrondObsidianVault dev:console level=error limit=50
obsidian vault=PlaygrondObsidianVault dev:dom selector=".eragear-copilot-root" total
```

## Definition of done for this UX plan

This plan is implemented when:

- The default view is Today Focus plus Active Concept plus Next Action Queue.
- The queue explains priority, reason, expected output, blocked state, and suggested agent.
- The active concept panel shows status, maturity, missing knowledge, prerequisites, DoD blockers, artifacts, and mastery evidence.
- Examiner Mode can produce score, missing concepts, weak points, and next fix.
- Artifact Review validates and stages ACP output before writing to final vault paths.
- A note cannot move to `done` or `mastered` unless evidence gates pass.
- Skill Map reflects evidence-based progress across SWE domains.
- UI can be used without manually editing YAML.
- CSS remains scoped to `.eragear-copilot-root` and uses Obsidian variables.
- Lint, build, and dev-vault reload pass.
