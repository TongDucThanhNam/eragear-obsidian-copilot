# Eragear Obsidian Copilot

AI-powered Learning OS for Obsidian.

## Current features

- Chat with vault context
- Learning Command Center
- Learning metadata scanner
- Weak note detection
- Next action recommendation
- Suggested action runner
- Learning metadata fixer
- Seed note structure draft generation
- Explanation draft generation
- HTML explainer artifact generation
- Quiz artifact generation
- Bridge note artifact generation
- Case study artifact generation
- Review checklist generation
- Agent task generation with allowed write zones
- Bounded ACP agent task execution
- Agent task status tracking
- Agent write proposal validation and apply flow

## Learning frontmatter schema

Learning notes are prioritized from frontmatter and vault graph state.

```yaml
type: concept
area: systems-bridge
status: visualize
maturity: 2
priority: 80
sprint: systems-bridge
artifact_html: _explainers/example.html
quiz_score: 6
review_due: 2026-05-12
last_touched: 2026-05-12
```

Supported `type` values:

- `moc`
- `concept`
- `bridge`
- `tool`
- `case-study`
- `project`
- `question`
- `source`
- `adr`

Supported `status` values:

- `seed`
- `explain`
- `visualize`
- `connect`
- `test`
- `apply`
- `review`
- `done`
- `mastered`

## Learning loop

1. Scan vault learning notes.
2. Detect missing metadata, weak notes, missing artifacts, and due reviews.
3. Score notes into a next action queue.
4. Run the suggested action from the Command Center.
5. Update frontmatter or generate an artifact.
6. Refresh the queue and move to the next action.

## Artifact outputs

- `_explainers/<note-slug>.html`
- `_quizzes/<note-slug>.md`
- `03_Bridge_Notes/<note-slug>-bridge.md`
- `05_Case_Studies/<note-slug>-case-study.md`
- `_reviews/<note-slug>-review.md`
- `00_Command_Center/learning-drafts/<note-slug>-structure.md`
- `00_Command_Center/learning-drafts/<note-slug>-explanation.md`
- `00_Command_Center/agent-tasks/<task-id>.md`
- `00_Command_Center/agent-proposals/<proposal-id>.json`
- `00_Command_Center/learning-action-log.md`

## Agent task safety

Agent tasks are written as markdown files before any external execution path is needed. Each task includes:

- source note path
- suggested agent
- expected output
- allowed write zones
- prompt
- completion checklist

The codebase includes a deterministic write-zone guard so proposed agent output paths can be checked before applying changes. Agent output should be staged as JSON proposals in `00_Command_Center/agent-proposals`; the Command Center validates the paths before the user applies them.

When a task is run through an ACP agent from the Command Center, terminal access is disabled and the adapter only allows writes inside `00_Command_Center/agent-proposals`. Final artifact writes are applied later by the plugin after validation.

Proposal shape:

```json
{
  "taskPath": "00_Command_Center/agent-tasks/example.md",
  "writes": [
    {
      "path": "_explainers/example.html",
      "content": "<!doctype html>"
    }
  ]
}
```

## Development

```bash
npm install
npm run lint
npm run test
npm run build
```

## Learning OS roadmap

- [Learning OS UX/UI plan](docs/learning-os/UX_UI_PLAN.md)
- [Learning OS maturity spec](docs/learning-os/README.md)
- [Learning OS implementation plan](docs/learning-os/PLAN.md)
- [Learning OS todo checklist](docs/learning-os/TODO.md)

For runtime verification in the development vault:

```bash
obsidian vault=PlaygrondObsidianVault plugin:reload id=eragear-copilot
obsidian vault=PlaygrondObsidianVault dev:errors
```
