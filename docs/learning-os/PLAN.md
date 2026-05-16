# Learning OS implementation plan

Created: 2026-05-15

This plan turns the maturity spec into implementation phases. Complete the phases in order unless a later task is explicitly independent.

## Phase 0 - Baseline and guardrails

Goal: make the current MVP measurable before changing behavior.

Tasks:

1. Capture current behavior with tests around `scanLearningNote`, `scanVaultLearningNotes`, `inferNextAction`, `scoreLearningNote`, `generateNextActionQueue`, `inferDeterministicTransition`, `validateAgentWritePlan`, and `applyAgentWriteProposal`.
2. Add fixture notes for each status: `seed`, `explain`, `visualize`, `connect`, `test`, `apply`, `review`, `done`, `mastered`.
3. Add regression tests proving existing flat frontmatter still works when new nested fields are absent.
4. Run `npm run lint`, `npm run test`, and `npm run build`.

Acceptance criteria:

1. Existing behavior is covered before schema expansion.
2. Tests document the current MVP state machine and queue scoring.
3. No runtime code changes are made without test coverage.

Suggested files:

```text
src/learning/*.test.ts
src/agent/*.test.ts
```

## Phase 1 - Schema v2 and Definition of Done

Goal: add structured learning evidence without breaking existing notes.

Tasks:

1. Extend `LearningNote` in `src/learning/types.ts` with:
   - `prerequisites`
   - `unlocks`
   - `mastery`
   - `artifacts`
   - `dod`
2. Extend `LEARNING_FRONTMATTER_KEYS` only where flat key constants are still useful. Do not force nested keys into the flat-key object if direct parsing is clearer.
3. Update `parseLearningFrontmatter` so malformed or missing nested fields fall back to safe defaults.
4. Create `src/learning/definition-of-done.ts`.
5. Implement validators:
   - `evaluateDefinitionOfDone(note)`
   - `canPromoteStatus(note, targetStatus)`
   - `getPromotionBlockers(note, targetStatus)`
6. Update `learning-state.ts` so deterministic transitions consult DoD validators.
7. Update `note-scanner.ts` summary with blocked notes and evidence gaps.
8. Add tests for old schema, partial schema v2, full schema v2, and malformed values.

Acceptance criteria:

1. Existing notes without schema v2 still scan.
2. A note cannot move to `done` or `mastered` without evidence.
3. Blockers are human-readable and usable by Command Center.
4. Tests cover every status gate.

Implementation notes:

1. Use Obsidian `processFrontMatter` for writes.
2. Use `normalizePath()` for path-like frontmatter created from settings or user input.
3. Keep frontmatter parser pure where possible so tests do not need an Obsidian app.

## Phase 2 - Real artifact pipeline

Goal: upgrade artifacts from scaffold-only to scaffold plus agent-filled proposal flow.

Tasks:

1. Keep existing deterministic scaffold managers:
   - `artifact-manager.ts`
   - `quiz-manager.ts`
   - `bridge-note-manager.ts`
   - `case-study-manager.ts`
   - `review-manager.ts`
2. Add artifact quality validators in `src/learning/artifact-quality.ts`.
3. Add artifact contracts:
   - HTML explainer contract
   - Quiz contract
   - Bridge note contract
   - Case study contract
   - Review contract
4. Update prompt builders so ACP tasks request concrete filled outputs, not only handoff prompts.
5. Extend proposal validation so an applied proposal must satisfy:
   - path allowed by task guard
   - artifact type matches task
   - artifact quality passes minimum checks
6. Store quality results under `artifacts.<type>.quality_score`.
7. Update state promotion from `visualize` to `connect` so it requires a passing explainer.

Acceptance criteria:

1. Scaffold generation remains deterministic.
2. ACP-filled artifacts are applied only through proposal validation.
3. Placeholder text such as "Replace this section" cannot pass quality checks.
4. Artifact metadata is written back after apply.
5. Failing artifacts keep the note in its current state and show blockers.

Suggested files:

```text
src/learning/artifact-quality.ts
src/learning/artifact-contracts.ts
src/learning/prompt-builders/*.prompt.ts
src/agent/write-proposal.ts
src/agent/write-proposal-format.ts
```

## Phase 3 - Mastery evidence and examiner loop

Goal: measure real understanding instead of relying on a single quiz score.

Tasks:

1. Add `src/learning/mastery.ts`.
2. Implement scoring categories:
   - recall
   - mechanism
   - transfer
   - application
3. Add an examiner artifact manager or mode that generates:
   - question set
   - answer rubric
   - weak-point extraction
   - follow-up review task
4. Update quiz generation so each question maps to a mastery category.
5. Add a grading result format that can update `mastery.*_score` and `mastery.weak_points`.
6. Update review generation to consume weak points and produce focused review tasks.
7. Update next-action queue so weak points and due reviews increase priority.
8. Add tests for score update, weak-point scheduling, and transition blockers.

Acceptance criteria:

1. `mastered` requires evidence across recall, mechanism, transfer, and application.
2. Weak answers create actionable follow-up tasks.
3. Review tasks are tied to specific weak points, not generic reminders.
4. Command Center can display mastery category scores.

Suggested files:

```text
src/learning/mastery.ts
src/learning/examiner-manager.ts
src/learning/review-manager.ts
src/learning/quiz-manager.ts
src/learning/next-action-engine.ts
```

## Phase 4 - Prerequisite graph and curriculum engine

Goal: teach in the right order, not just the highest score.

Tasks:

1. Add `src/learning/curriculum-graph.ts`.
2. Parse `prerequisites` and `unlocks` from frontmatter.
3. Resolve wikilinks to note paths using Obsidian metadata and direct file lookup where possible.
4. Compute:
   - unmet prerequisites
   - unlock count
   - blocked notes
   - dependency depth
   - sprint readiness
5. Update `scoreLearningNote` to:
   - penalize blocked notes
   - boost prerequisite notes that unlock high-priority notes
   - boost active sprint notes only when blockers are clear
6. Add sprint generation for:
   - Systems Bridge
   - Data Systems
   - Runtime/Backend Execution
   - Production Debugging
   - Distributed Systems
   - AI Engineering
7. Add tests for dependency ordering and circular dependency handling.

Acceptance criteria:

1. A blocked note shows why it is blocked.
2. The queue recommends prerequisites before dependent advanced notes.
3. Circular prerequisites do not crash scanning or scoring.
4. Active sprint generation produces a finite ordered list of notes.

Suggested files:

```text
src/learning/curriculum-graph.ts
src/learning/next-action-engine.ts
src/learning/note-scanner.ts
src/views/command-center/CommandCenterView.tsx
```

## Phase 5 - Command Center UX for non-schema users

Goal: make the workflow usable without asking the user to inspect YAML.

Tasks:

1. Add panels for:
   - DoD blockers
   - artifact quality
   - mastery evidence
   - prerequisites and unlocks
   - weak points and reviews
2. Add action buttons for:
   - generate scaffold
   - create agent fill task
   - review proposal
   - apply proposal
   - mark evidence reviewed
   - schedule review
3. Keep UI imports within project boundaries:
   - feature layer imports `@/components/ui/*`
   - `@base-ui/react/*` only inside `src/components/ui/**`
4. Ensure icon-only buttons have `aria-label` and tooltip or clear focus state.
5. Keep CSS scoped under `.eragear-copilot-root`.

Acceptance criteria:

1. A user can move one note from `seed` to `done` from Command Center.
2. Blocked transitions explain the exact missing evidence.
3. No hard-coded colors or unscoped selectors are added.
4. Keyboard navigation works for all new controls.

Suggested files:

```text
src/views/command-center/CommandCenterView.tsx
src/views/command-center/*
src/components/ui/*
styles.css
```

## Phase 6 - Runtime verification and release readiness

Goal: prove the mature Learning OS works inside the development vault.

Tasks:

1. Run:

```bash
npm run lint
npm run test
npm run build
```

2. Verify the dev vault target:

```bash
obsidian version
obsidian vault=PlaygrondObsidianVault vault info=path
obsidian vault=PlaygrondObsidianVault plugin id=eragear-copilot
```

3. Reload and inspect runtime:

```bash
obsidian vault=PlaygrondObsidianVault plugin:reload id=eragear-copilot
obsidian vault=PlaygrondObsidianVault dev:errors
obsidian vault=PlaygrondObsidianVault dev:console level=error limit=50
```

4. Validate Command Center DOM if Obsidian is open:

```bash
obsidian vault=PlaygrondObsidianVault dev:dom selector=".eragear-copilot-root" total
obsidian vault=PlaygrondObsidianVault dev:screenshot path="/tmp/eragear-copilot-learning-os.png"
```

Acceptance criteria:

1. Lint, tests, and build pass.
2. Plugin reloads in `PlaygrondObsidianVault`.
3. No new runtime errors appear.
4. A manual smoke test completes one full learning loop:
   - scan
   - choose next action
   - generate scaffold
   - create agent task
   - apply proposal
   - update evidence
   - refresh queue

## Recommended implementation order

1. Phase 0
2. Phase 1 DoD validators
3. Phase 4 prerequisite parser and queue blockers
4. Phase 2 artifact quality validators
5. Phase 3 mastery and examiner loop
6. Phase 5 Command Center UX
7. Phase 6 verification

Reasoning: DoD and prerequisites affect core state and scoring. Artifact and examiner quality should then write evidence into that model. UX comes after the model can explain real blockers.
