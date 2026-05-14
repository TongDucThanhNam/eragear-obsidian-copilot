import type { LearningAgentTask } from "@/agent/agent-task";

export function formatLearningAgentTaskFile(task: LearningAgentTask): string {
	return `---
type: agent-task
status: ${task.status}
source_note: ${task.notePath}
action: ${task.action}
suggested_agent: ${task.suggestedAgent}
created: ${task.createdAt}
allowed_write_zones:
${task.allowedWriteZones.map((zone) => `  - ${zone}`).join("\n")}
---

# ${task.title}

## Task

- Action: ${task.action}
- Source note: \`${task.notePath}\`
- Expected output: ${task.expectedOutput ?? "Update the source note safely."}
- Suggested agent: ${task.suggestedAgent}

## Allowed write zones

${task.allowedWriteZones.map((zone) => `- \`${zone}\``).join("\n")}

## Prompt

\`\`\`text
${task.prompt}
\`\`\`

## Completion checklist

- [ ] Output stays inside allowed write zones.
- [ ] Proposed write paths pass the agent task write guard.
- [ ] Create proposal JSON in \`00_Command_Center/agent-proposals\` before applying writes.
- [ ] Source note frontmatter is updated if state changes.
- [ ] Learning action log is updated after execution.
- [ ] Command Center scan is refreshed.

## Proposal JSON schema

\`\`\`json
{
  "taskPath": "00_Command_Center/agent-tasks/${task.id}.md",
  "writes": [
    {
      "path": "${task.allowedWriteZones[0] ?? task.notePath}/example.md",
      "content": "Full replacement file content"
    }
  ]
}
\`\`\`
`;
}
