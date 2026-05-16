# Learning OS todo checklist

Created: 2026-05-15

Use this as the execution checklist. A task is done only when code, tests, and verification are complete.

## 0. Baseline

- [x] Add tests for existing frontmatter parsing.
- [x] Add tests for `scanLearningNote` and `scanVaultLearningNotes`.
- [x] Add tests for `inferNextAction` across all statuses.
- [x] Add tests for `scoreLearningNote` priority, sprint, review, graph score, and recently touched penalty.
- [x] Add tests for `inferDeterministicTransition`.
- [x] Add tests for `validateAgentWritePlan`.
- [x] Add tests for `applyAgentWriteProposal` using valid and rejected paths.
- [x] Run `npm run lint`.
- [x] Run `npm run test`.
- [x] Run `npm run build`.

## 1. Schema v2

- [x] Add `LearningMastery`, `LearningArtifacts`, `LearningArtifactRecord`, `LearningDefinitionOfDone`, and `LearningDependencyLink` types.
- [x] Add `prerequisites?: string[]` to `LearningNote`.
- [x] Add `unlocks?: string[]` to `LearningNote`.
- [x] Add `mastery?: LearningMastery` to `LearningNote`.
- [x] Add `artifacts?: LearningArtifacts` to `LearningNote`.
- [x] Add `dod?: LearningDefinitionOfDone` to `LearningNote`.
- [x] Update frontmatter parser to read missing nested fields safely.
- [x] Update frontmatter parser to reject invalid nested values without throwing.
- [x] Update scanner summary with `blockedNotes`, `masteryGaps`, and `artifactQualityIssues`.
- [x] Add fixture notes for old schema, partial schema v2, full schema v2, and malformed schema v2.
- [x] Verify old vault notes still scan without migration.

## 2. Definition of Done

- [x] Create `src/learning/definition-of-done.ts`.
- [x] Implement `evaluateDefinitionOfDone(note)`.
- [x] Implement `getPromotionBlockers(note, targetStatus)`.
- [x] Implement `canPromoteStatus(note, targetStatus)`.
- [x] Define DoD for `explain -> visualize`.
- [x] Define DoD for `visualize -> connect`.
- [x] Define DoD for `connect -> test`.
- [x] Define DoD for `test -> apply`.
- [x] Define DoD for `apply -> review`.
- [x] Define DoD for `review -> done`.
- [x] Define DoD for `done -> mastered`.
- [x] Update `inferDeterministicTransition` to use DoD.
- [x] Add tests for every allowed and blocked transition.
- [x] Add blocker messages suitable for Command Center display.

## 3. Artifact quality

- [x] Create `src/learning/artifact-contracts.ts`.
- [x] Create `src/learning/artifact-quality.ts`.
- [x] Add HTML explainer quality checks.
- [x] Add quiz quality checks.
- [x] Add bridge note quality checks.
- [x] Add case study quality checks.
- [x] Add review quality checks.
- [x] Reject obvious scaffold placeholders.
- [x] Reject empty or source-only artifacts.
- [x] Store quality score in `artifacts.<type>.quality_score`.
- [x] Add tests for passing and failing artifacts.

## 4. Scaffold plus ACP fill flow

- [x] Keep deterministic scaffold generation available.
- [x] Add action to create an ACP fill task for an artifact scaffold.
- [x] Update artifact prompts to request concrete filled output.
- [x] Include quality contract in generated agent task files.
- [x] Ensure ACP executor still writes only proposal JSON.
- [x] Extend proposal validation to call artifact quality checks.
- [x] Prevent proposal apply when quality checks fail.
- [x] Update task status when a proposal is rejected for quality.
- [x] Update artifact metadata after proposal apply.
- [x] Add tests for valid proposal, invalid path, invalid artifact content, and accepted artifact content.

## 5. Mastery evidence

- [x] Create `src/learning/mastery.ts`.
- [x] Implement recall score update.
- [x] Implement mechanism score update.
- [x] Implement transfer score update.
- [x] Implement application score update.
- [x] Track `mastery.last_examined`.
- [x] Track `mastery.evidence_notes`.
- [x] Track `mastery.weak_points`.
- [x] Define thresholds for `done`.
- [x] Define thresholds for `mastered`.
- [x] Update DoD to require mastery thresholds.
- [x] Add tests for score updates and thresholds.

## 6. Examiner and review loop

- [x] Create `src/learning/examiner-manager.ts`.
- [x] Add examiner prompt builder.
- [x] Generate question sets by mastery category.
- [x] Generate grading rubric by mastery category.
- [x] Parse or store examiner result artifact.
- [x] Extract weak points from failed answers.
- [x] Generate review tasks from weak points.
- [x] Update `review-manager.ts` to focus on weak points.
- [x] Update `next-action-engine.ts` so weak points boost queue priority.
- [x] Add tests for weak-point extraction and review scheduling.

## 7. Prerequisite graph

- [x] Create `src/learning/curriculum-graph.ts`.
- [x] Parse `prerequisites` as wikilink strings.
- [x] Parse `unlocks` as wikilink strings.
- [x] Resolve dependency links to note paths when possible.
- [x] Compute unmet prerequisites.
- [x] Compute unlock count.
- [x] Compute blocked notes.
- [x] Detect circular prerequisites.
- [x] Add queue penalty for blocked notes.
- [x] Add queue boost for prerequisite notes that unlock high-priority notes.
- [x] Add queue blocker reasons.
- [x] Add tests for dependency order, blocked notes, missing links, and cycles.

## 8. Curriculum sprints

- [x] Define Systems Bridge roadmap seed list.
- [x] Define Data Systems roadmap seed list.
- [x] Define Runtime/Backend Execution roadmap seed list.
- [x] Define Production Debugging roadmap seed list.
- [x] Define Distributed Systems roadmap seed list.
- [x] Define AI Engineering roadmap seed list.
- [x] Add sprint generation from graph gaps and active goals.
- [x] Add tests for sprint generation.
- [x] Ensure generated sprint respects prerequisites.

## 9. Command Center UX

- [x] Show DoD blockers for active note.
- [x] Show artifact quality state.
- [x] Show mastery evidence scores.
- [x] Show weak points.
- [x] Show prerequisites and unlocks.
- [x] Show blocked-by reasons in the queue.
- [x] Add action button for scaffold generation.
- [x] Add action button for ACP fill task generation.
- [x] Add action button for proposal review.
- [x] Add action button for proposal apply.
- [x] Add action button for schedule review.
- [x] Ensure all icon-only buttons have `aria-label`.
- [x] Ensure keyboard access for all custom controls.
- [x] Keep CSS scoped to `.eragear-copilot-root`.
- [x] Run boundary check: `rg -n "from ['\"]@base-ui/react" src --glob '!src/components/ui/**'`.
- [x] Run hard-coded color check: `rg -n '#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(' src styles.css`.

## 10. Runtime verification

- [x] Run `npm run lint`.
- [x] Run `npm run test`.
- [x] Run `npm run build`.
- [x] Run `obsidian version`.
- [x] Run `obsidian vault=PlaygrondObsidianVault vault info=path`.
- [x] Run `obsidian vault=PlaygrondObsidianVault plugin id=eragear-copilot`.
- [x] Run `obsidian vault=PlaygrondObsidianVault plugin:reload id=eragear-copilot`.
- [x] Run `obsidian vault=PlaygrondObsidianVault dev:errors`.
- [x] Run `obsidian vault=PlaygrondObsidianVault dev:console level=error limit=50`.
- [x] If Command Center is open, run `obsidian vault=PlaygrondObsidianVault dev:dom selector=".eragear-copilot-root" total`.
- [x] If Command Center is open, run `obsidian vault=PlaygrondObsidianVault dev:screenshot path="/tmp/eragear-copilot-learning-os.png"`.

## Final acceptance

- [x] A fresh old-schema note can be scanned.
- [x] A schema v2 note can be scanned.
- [x] A blocked note explains blockers.
- [x] A prerequisite note is prioritized before its dependent note.
- [x] A scaffold artifact can be generated.
- [x] An ACP fill task can be generated.
- [x] A proposal with invalid path is rejected.
- [x] A proposal with low-quality artifact is rejected.
- [x] A proposal with valid artifact is applied.
- [x] Artifact metadata is updated after apply.
- [x] Mastery scores update from quiz or examiner result.
- [x] Weak answers generate review tasks.
- [x] `done` requires real evidence.
- [x] `mastered` requires recall, mechanism, transfer, and application evidence.
- [x] Command Center supports the full loop without manual YAML editing.
