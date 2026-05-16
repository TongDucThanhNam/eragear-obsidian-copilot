# Learning OS maturity spec

Created: 2026-05-15

## Goal

Bring Eragear Copilot from `Learning OS MVP / alpha` to a mature Learning OS for software engineering in Obsidian.

The target product is not a chat sidebar. It is a workflow system that can answer:

```text
What should I learn, build, connect, test, or review next?
Why now?
What output proves progress?
Which action can be deterministic, which needs a reasoning model, and which needs an ACP agent?
Which evidence is required before a note can move to done or mastered?
```

## Current baseline

The repo already has the hard MVP pieces:

| Layer | Current module | Current state |
| --- | --- | --- |
| Learning metadata | `src/learning/types.ts`, `src/learning/constants.ts`, `src/learning/frontmatter.ts` | Basic note schema exists |
| Vault scanner | `src/learning/note-scanner.ts` | Scans learning notes, weak notes, missing artifacts, due reviews |
| State machine | `src/learning/learning-state.ts` | Handles basic state transitions |
| Next-action engine | `src/learning/next-action-engine.ts` | Scores notes and recommends next actions |
| Command Center | `src/views/command-center/CommandCenterView.tsx` | Presents queue, weak notes, ACP tasks, proposals |
| Artifact pipeline | `src/learning/*-manager.ts`, `src/learning/prompt-builders/*` | Generates scaffolds and handoff prompts |
| ACP execution | `src/agent/learning-agent-executor.ts`, `src/agent/task-*`, `src/agent/write-proposal.ts` | Bounded task execution and proposal apply flow |
| Safety | `src/agent/task-guard.ts`, `src/agent/write-proposal.ts` | Write zones and proposal validation |

The remaining work is to close the learning loop:

1. Turn artifact scaffolds into real learning artifacts.
2. Track mastery evidence, not only `quiz_score`.
3. Add prerequisite and unlock graph logic.
4. Code Definition of Done gates for state transitions.
5. Add examiner, review, and weak-answer loops.
6. Add curriculum intelligence for Systems Bridge, Data Systems, Runtime/Backend, Production Debugging, Distributed Systems, and AI Engineering.

## Target frontmatter schema

Keep the existing flat fields for compatibility, then add structured fields incrementally.

```yaml
type: concept
area: systems-bridge
status: visualize
maturity: 2
priority: 80
sprint: systems-bridge
artifact_html: _explainers/hash-map-vs-hash-index.html
quiz_score: 6
review_due: 2026-05-22
last_touched: 2026-05-15

prerequisites:
  - "[[Memory vs Disk]]"
  - "[[Array vs Disk Page]]"
  - "[[Pointer vs Row Pointer]]"
unlocks:
  - "[[PostgreSQL Read Path]]"
  - "[[B-Tree vs Hash Index]]"

mastery:
  explain_score: 0
  compare_score: 0
  mechanism_score: 0
  application_score: 0
  last_examined:
  evidence_notes: []
  weak_points: []

artifacts:
  explainer:
    path: _explainers/hash-map-vs-hash-index.html
    quality_score: 0
    last_generated: 2026-05-15
  quiz:
    path: _quizzes/hash-map-vs-hash-index.md
    score: 6
    graded_at: 2026-05-15
  bridge:
    path: 03_Bridge_Notes/hash-map-vs-hash-index-bridge.md
  case_study:
    path: 05_Case_Studies/hash-map-vs-hash-index-case-study.md

dod:
  mechanism: false
  tradeoffs: false
  failure_modes: false
  production_implication: false
  links_minimum: false
  case_study: false
  review_passed: false
```

Implementation rule: parser functions must tolerate missing nested fields. Existing vault notes should continue to work without migration.

## Target state gates

`status` should no longer advance only because an action ran. It advances when evidence passes a gate.

| From | To | Required gate |
| --- | --- | --- |
| `seed` | `explain` | Has `type`, `area`, `status`, priority, and a structured note draft |
| `explain` | `visualize` | Has mechanism, example, tradeoff, failure mode, and source-backed explanation |
| `visualize` | `connect` | Has explainer artifact with passing quality score |
| `connect` | `test` | Has enough links, bridge note, and prerequisite references |
| `test` | `apply` | Quiz or examiner score passes rubric |
| `apply` | `review` | Has case study, lab, ADR, debugging report, or project evidence |
| `review` | `done` | Review checklist passed and weak points are either closed or scheduled |
| `done` | `mastered` | Mastery scores and evidence notes meet threshold across recall, mechanism, transfer, and application |

## Target artifact pipeline

Current artifact managers generate useful scaffolds. The mature pipeline should keep deterministic scaffolding but add a reasoning or coding agent fill step.

```text
1. Deterministic scaffold
2. Agent task generation with source excerpt and allowed write zones
3. ACP bounded execution writes proposal JSON only
4. Proposal validation checks paths, artifact shape, and quality gates
5. User applies proposal
6. Plugin updates artifact metadata and state gate result
7. Command Center refreshes queue
```

Artifact quality checks should verify content, not style only:

| Artifact | Required quality signals |
| --- | --- |
| HTML explainer | Core idea, mechanism, interactive model, tradeoffs, failure modes, self-test, source note grounding |
| Quiz | Recall, mechanism, transfer, application, misconception checks, answer rubric |
| Bridge note | At least 5 meaningful links, source note, related MOC, why the bridge matters, missing-link actions |
| Case study | Real scenario, decision point, failure mode, debugging or implementation evidence, lesson learned |
| Review | Spaced review date, weak points, pass/fail rubric, next task generation |

## Mastery model

Use four evidence categories:

| Category | Meaning | Example signal |
| --- | --- | --- |
| Recall | Can remember the concept | Short-answer score |
| Mechanism | Can explain why it works | Mechanism answer or examiner transcript |
| Transfer | Can compare and map across systems | Bridge note or comparison answer |
| Application | Can build, debug, or decide with it | Case study, lab, ADR, or project note |

Suggested thresholds:

```text
done:
  explain_score >= 7
  mechanism_score >= 7
  at least one evidence note

mastered:
  explain_score >= 8
  compare_score >= 8
  mechanism_score >= 8
  application_score >= 7
  at least two evidence notes
  no due weak points
```

## Curriculum model

`priority`, `sprint`, and graph score are not enough for a mature Learning OS. The queue should understand dependencies.

Start with explicit frontmatter:

```yaml
prerequisites:
  - "[[Memory vs Disk]]"
unlocks:
  - "[[B-Tree vs Hash Index]]"
```

Then add deterministic queue effects:

| Condition | Queue effect |
| --- | --- |
| A note has unmet prerequisites | Penalize its score and show blocker reason |
| A note is a prerequisite for many high-priority notes | Boost its score |
| A prerequisite is `mastered` | Boost unlocked notes |
| Active sprint matches area | Boost only if blockers are clear |

## Command Center target UX

The user should not need to understand YAML to move through the workflow.

Required panels:

1. Active note readiness: current state, blockers, Definition of Done, next action.
2. Queue: score, reason, expected output, suggested agent, blocked-by.
3. Artifact quality: missing, scaffold-only, agent-filled, accepted.
4. Mastery evidence: recall, mechanism, transfer, application.
5. Curriculum: prerequisites, unlocks, active sprint, dependency blockers.
6. Review loop: due reviews, weak answers, generated follow-up tasks.

Every command and button label should use sentence case and avoid repeating the plugin name.

## Safety constraints

Keep the current ACP safety model:

1. ACP agents do not write directly to final vault destinations.
2. ACP agents write proposal JSON under `00_Command_Center/agent-proposals`.
3. Final writes are applied by the plugin after validation.
4. Write paths stay inside `ALLOWED_WRITE_ZONES`.
5. Source note edits require explicit proposal and user apply.

When new artifact types are added, update both allowed zones and proposal validators together.

## Done definition for this roadmap

The roadmap is complete when:

1. State transitions use Definition of Done validators.
2. Notes can declare prerequisites and unlocks.
3. Queue scoring uses dependency blockers and mastery evidence.
4. Artifact generation supports scaffold plus agent-filled proposal flow.
5. Artifact quality is validated before state promotion.
6. Mastery evidence is tracked and visible in Command Center.
7. Examiner/review mode creates weak-point follow-up tasks.
8. Curriculum sprints can be generated from dependency graph and mastery gaps.
9. `npm run lint`, `npm run test`, and `npm run build` pass.
10. Runtime reload on `PlaygrondObsidianVault` reports no plugin errors.
