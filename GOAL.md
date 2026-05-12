## Kết luận

Có, **rất hợp lý**.

Nhưng hướng đúng không phải là biến plugin thành một “LMS trong Obsidian”. Hướng đúng hơn là:

```text
ChatUI + ACP coding agent
→ Vault Intelligence
→ Learning State Engine
→ Next Action System
→ Agent Orchestrator
→ Artifact Generator
→ Learning OS inside Obsidian
```

Lý do hợp lý: Obsidian vốn đã là nơi lưu knowledge, còn ACP/coding agent giúp tạo artifact, sửa file, generate explanation, viết note, refactor cấu trúc vault. Nếu thêm một lớp “learning state + next action” ở giữa, plugin sẽ không chỉ trả lời câu hỏi mà còn biết:

```text
Bạn đang học gì?
Note nào còn yếu?
Note nào cần visualize?
Artifact nào còn thiếu?
Hôm nay nên làm gì tiếp?
Agent nào nên xử lý task nào?
Sau khi làm xong thì trạng thái học chuyển sang đâu?
```

Theo phần thông tin repo bạn dán, plugin hiện đã có nền tảng khá đúng hướng: `VaultManager`, `GraphService`, `ContextAssembler`, `WorkerClient`, config ACP/API model, graph worker, PageRank/spreading activation, React UI, và kiến trúc service-based trong `main.ts` . Tức là nó không còn là “chat widget” đơn thuần nữa; nó đã có nhiều mảnh của một vault-intelligence system.

---

# 1. Product direction nên chốt

Tên tư duy nên là:

```text
Eragear Obsidian Copilot
→ Eragear Learning OS
```

Hoặc mềm hơn:

```text
Eragear Knowledge Copilot
```

Core promise:

```text
Turn your Obsidian vault into an active learning system.
```

Không nên pitch là:

```text
Chat with your notes.
```

Câu đó yếu và dễ bị trùng với rất nhiều plugin khác.

Điểm khác biệt nên là:

```text
Cursor hiểu codebase.
Eragear hiểu knowledge vault + learning state.
```

---

# 2. Gap hiện tại vs goal

## Goal cuối

Plugin nên làm được vòng lặp này:

```text
Scan vault
→ hiểu note nào thuộc area nào
→ hiểu trạng thái học của từng note
→ phát hiện gap
→ đề xuất next action
→ gọi agent/API model phù hợp
→ tạo artifact
→ update note/frontmatter
→ chuyển trạng thái học
→ lên lịch review/apply tiếp theo
```

## Gap table

| Layer                   | Hiện tại          | Goal                                                                      | Gap chính                                 |
| ----------------------- | ----------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| Chat UI                 | Có                | Giữ làm interface phụ                                                     | Chat chưa phải learning workflow          |
| ACP agent runner        | Có/đang có hướng  | Dùng làm execution backend                                                | Cần task abstraction rõ                   |
| Vault access            | Có `VaultManager` | Learning-aware vault manager                                              | Cần scan metadata học tập                 |
| Graph intelligence      | Có `GraphService` | Dùng để chọn note quan trọng                                              | Cần nối graph score với learning priority |
| Context assembly        | Có                | Dùng cho prompt học tập/artifact                                          | Cần prompt builders theo task             |
| Settings/API/ACP config | Có                | Model/agent router                                                        | Cần orchestrator chọn model theo task     |
| Learning metadata       | Chưa              | `type`, `area`, `status`, `maturity`, `priority`, `review_due`            | Cần schema + parser/writer                |
| Learning state machine  | Chưa              | `seed → explain → visualize → connect → test → apply → review → mastered` | Đây là gap lớn nhất                       |
| Next action engine      | Chưa              | “What should I do next?”                                                  | Killer feature cần build sớm              |
| Artifact system         | Chưa              | HTML explainer, quiz, case study, bridge note                             | Cần artifact manager                      |
| Dashboard               | Một phần/Chat UI  | Command Center                                                            | Cần view riêng                            |
| Review/quiz engine      | Chưa              | Spaced review + self-test                                                 | Phase sau                                 |
| Safety/diff             | Chưa/rất cần      | Agent ghi file có kiểm soát                                               | Cần permission + preview                  |

---

# 3. Kiến trúc mục tiêu

```text
Obsidian Vault
    ↓
VaultManager
    ↓
Learning Metadata Scanner
    ↓
Learning State Engine
    ↓
Next Action Engine
    ↓
Agent Orchestrator
    ↓
ACP Agents / API Models
    ↓
Artifact Manager
    ↓
Note Writer + Frontmatter Updater
```

Nên tách thành các module mới:

```text
src/learning/
├── types.ts
├── frontmatter.ts
├── note-scanner.ts
├── learning-state.ts
├── next-action-engine.ts
├── artifact-manager.ts
├── sprint-engine.ts
└── prompt-builders/
   ├── html-explainer.prompt.ts
   ├── bridge-note.prompt.ts
   ├── quiz.prompt.ts
   └── case-study.prompt.ts

src/agent/
├── agent-task.ts
├── agent-orchestrator.ts
├── task-router.ts
├── task-history.ts
└── providers/
   ├── api-model-runner.ts
   └── acp-agent-runner.ts

src/views/command-center/
├── CommandCenterView.tsx
├── NextActionPanel.tsx
├── WeakNotesPanel.tsx
├── ArtifactPanel.tsx
├── SprintPanel.tsx
└── AgentTaskPanel.tsx
```

---

# 4. Data model nên thêm trước

Đừng bắt đầu bằng agent. Bắt đầu bằng state.

```ts
export type LearningStatus =
  | "seed"
  | "explain"
  | "visualize"
  | "connect"
  | "test"
  | "apply"
  | "review"
  | "done"
  | "mastered";

export type LearningNoteType =
  | "moc"
  | "concept"
  | "bridge"
  | "tool"
  | "case-study"
  | "project"
  | "question"
  | "source"
  | "adr";

export interface LearningNote {
  path: string;
  title: string;

  type?: LearningNoteType;
  area?: string;
  status?: LearningStatus;

  maturity?: number;
  priority?: number;
  sprint?: string;

  nextAction?: string;
  artifactHtml?: string;
  quizScore?: number;
  reviewDue?: string;
  lastTouched?: string;

  links: string[];
  backlinks: string[];

  graphScore?: number;
  finalScore?: number;
}
```

Frontmatter mẫu:

```yaml
---
type: bridge
area: data-systems
status: visualize
maturity: 2
priority: 95
sprint: systems-bridge
artifact_html:
quiz_score:
review_due:
last_touched: 2026-05-12
---
```

Plugin đọc được metadata này thì mới có thể hành xử như một learning system.

---

# 5. State machine đề xuất

Mỗi note đi qua vòng đời:

```text
seed
→ explain
→ visualize
→ connect
→ test
→ apply
→ review
→ done
→ mastered
```

Ý nghĩa:

| Status      | Ý nghĩa                | Next action thường gặp            |
| ----------- | ---------------------- | --------------------------------- |
| `seed`      | Note thô, mới capture  | Clean up thành structured note    |
| `explain`   | Cần giải thích rõ      | Generate explanation/mental model |
| `visualize` | Cần trực quan hóa      | Generate HTML explainer           |
| `connect`   | Cần nối với vault      | Add links, bridge notes, MOC      |
| `test`      | Cần kiểm tra hiểu biết | Generate quiz/self-test           |
| `apply`     | Cần ứng dụng           | Case study, lab, implementation   |
| `review`    | Cần ôn lại             | Spaced review                     |
| `done`      | Hoàn thành tạm thời    | Schedule review                   |
| `mastered`  | Đã vững                | Không cần action thường xuyên     |

Điểm quan trọng: **LLM không quyết định toàn bộ workflow**. Code deterministic nên quyết định state và next action. LLM chỉ sinh nội dung/artifact.

---

# 6. Next Action Engine là killer feature

Command quan trọng nhất:

```text
Eragear: What should I do next?
```

Output ví dụ:

```markdown
## Next Action

Generate HTML explorable explanation for [[HashMap vs Hash Index]]

Reason:
- status = visualize
- priority = 95
- artifact_html is missing
- note type = bridge
- graph importance is high
- active sprint = systems-bridge

Suggested agent:
- Claude Code ACP for HTML artifact
- GPT/Gemini for explanation refinement

Expected output:
- _explainers/hashmap-vs-hash-index.html
- Update frontmatter: status = connect
```

Scoring sơ bộ:

```ts
score =
  priority
  + statusWeight
  + missingArtifactWeight
  + reviewDueWeight
  + activeSprintWeight
  + graphImportanceWeight
  - recentlyTouchedPenalty;
```

Ví dụ implementation:

```ts
export function inferNextAction(note: LearningNote): string {
  if (!note.type) return "Add note type";
  if (!note.area) return "Add learning area";
  if (!note.status) return "Set learning status";

  switch (note.status) {
    case "seed":
      return "Convert raw note into structured learning note";

    case "explain":
      return "Generate explanation, mechanism, examples, and failure modes";

    case "visualize":
      if (!note.artifactHtml) {
        return "Generate HTML explorable explanation";
      }
      return "Review existing visualization and move to connect stage";

    case "connect":
      if (note.links.length < 5) {
        return "Add links to related notes, MOCs, and bridge notes";
      }
      return "Validate connections and move to test stage";

    case "test":
      if (!note.quizScore) {
        return "Generate quiz and test understanding";
      }
      if (note.quizScore < 7) {
        return "Review weak points from quiz";
      }
      return "Move to apply stage";

    case "apply":
      return "Create case study, lab, or implementation example";

    case "review":
      return "Review note and promote maturity if passed";

    case "done":
      return "Schedule spaced review";

    case "mastered":
      return "No immediate action required";
  }
}
```

---

# 7. Agent Orchestrator nên hoạt động thế nào

Không nên hardcode một agent. Nên tạo abstraction:

```ts
export type AgentTaskKind =
  | "explain_note"
  | "generate_html_explainer"
  | "create_bridge_note"
  | "generate_quiz"
  | "create_case_study"
  | "audit_note"
  | "refactor_vault"
  | "write_adr";

export interface AgentTask {
  id: string;
  kind: AgentTaskKind;
  inputNotePaths: string[];
  outputPath?: string;
  modelPreference?: "reasoning" | "coding" | "fast" | "cheap";
  requiresWrite?: boolean;
  createdAt: string;
}
```

Mapping:

| Task                     | Model/agent phù hợp               |
| ------------------------ | --------------------------------- |
| Explain note             | API model reasoning               |
| Generate HTML explainer  | Claude Code ACP / coding agent    |
| Create bridge note       | Reasoning model                   |
| Generate quiz            | API model                         |
| Create case study        | API model                         |
| Refactor vault structure | ACP coding agent, có confirm      |
| Update frontmatter       | Deterministic code, không cần LLM |
| Audit note quality       | Reasoning model                   |

Agent chỉ là executor. Learning system mới là planner.

---

# 8. HTML Explainer Pipeline

Đây nên là first-class artifact.

Flow:

```text
Current note has status = visualize
→ Build context from current note + related notes
→ Build HTML explainer prompt
→ Run coding-capable agent/model
→ Save to _explainers/<slug>.html
→ Update note frontmatter artifact_html
→ Move status visualize → connect
```

Command:

```text
Eragear: Generate HTML Explainer for Current Note
```

Output:

```text
_explainers/hashmap-vs-hash-index.html
```

Update note:

```yaml
---
artifact_html: _explainers/hashmap-vs-hash-index.html
status: connect
last_touched: 2026-05-12
---
```

Nên giới hạn ban đầu:

```text
Agent chỉ được ghi vào:
- _explainers/
- 03_Bridge_Notes/
- 05_Case_Studies/
- 00_Command_Center/
```

Không cho agent rewrite toàn vault ở MVP.

---

# 9. Command Center thay cho ChatUI thuần

Chat sidebar vẫn giữ, nhưng nên có view riêng:

```text
Eragear Command Center
```

Sections:

```text
1. Next Action
2. Active Sprint
3. Weak Notes
4. Missing HTML Explainers
5. Due Reviews
6. Notes by Status
7. Suggested Bridge Notes
8. Agent Task Queue
```

UI này mới thể hiện “Learning System”. Chat chỉ là một input mode.

---

# 10. Roadmap implement thực tế

## Phase 0 — Chốt schema và folder convention

Mục tiêu: xác định ngôn ngữ chung cho plugin.

Làm:

```text
- Define LearningStatus
- Define LearningNoteType
- Define LearningNote
- Define artifact folders
- Define frontmatter keys
- Define allowed write zones
```

Không cần AI.

Deliverable:

```text
src/learning/types.ts
src/learning/constants.ts
```

---

## Phase 1 — Learning Metadata Scanner

Mục tiêu: plugin hiểu vault hiện tại.

Build:

```text
- scanVaultLearningNotes()
- parseLearningFrontmatter()
- detectMissingFields()
- detectWeakNotes()
- detectMissingArtifacts()
- detectDueReviews()
```

Command:

```text
Eragear: Scan Learning Notes
```

Output mẫu:

```text
Found:
- 42 notes missing type
- 18 notes missing area
- 9 notes missing status
- 7 visualize notes missing artifact_html
- 5 notes due for review
```

Đây là phase quan trọng nhất vì nó biến vault từ markdown rời rạc thành dataset học tập.

---

## Phase 2 — Next Action Engine

Mục tiêu: trả lời được câu hỏi “giờ làm gì tiếp?”

Build:

```text
- scoreLearningNote()
- inferNextAction()
- generateNextActionQueue()
- combine priority + status + graph score + sprint
```

Command:

```text
Eragear: What should I do next?
```

Output:

```text
Next: Generate HTML explainer for [[HashMap vs Hash Index]]
Reason: status=visualize, priority=95, artifact_html missing, high graph score
```

Vẫn chưa cần LLM. Nên deterministic trước.

---

## Phase 3 — Command Center basic

Mục tiêu: có dashboard thay vì chỉ chat.

Build:

```text
- CommandCenterView
- NextActionPanel
- WeakNotesPanel
- MissingArtifactsPanel
- DueReviewsPanel
```

Nên làm đơn giản, không cần đẹp quá. Quan trọng là workflow.

---

## Phase 4 — Agent Task Pipeline

Mục tiêu: biến next action thành executable task.

Build:

```text
- AgentTask type
- AgentOrchestrator
- PromptBuilder
- TaskRunner
- TaskHistory
- Safe write policy
```

Commands:

```text
Eragear: Run Suggested Action
Eragear: Generate Bridge Note
Eragear: Audit Current Note
```

Cần có preview/diff trước khi ghi file nếu agent sửa note hiện có.

---

## Phase 5 — HTML Explainer Generator

Mục tiêu: tạo interactive learning artifact.

Build:

```text
- html-explainer.prompt.ts
- artifact-manager.ts
- saveHtmlArtifact()
- updateArtifactHtmlFrontmatter()
- openHtmlPreview()
- transition visualize → connect
```

Command:

```text
Eragear: Generate HTML Explainer
```

Đây là phase tạo khác biệt sản phẩm rõ nhất.

---

## Phase 6 — Quiz + Review Engine

Mục tiêu: đóng vòng học tập.

Build:

```text
- Generate quiz from note
- Store quiz_score
- Detect weak answers
- Set review_due
- Move status test → apply/review
```

Frontmatter:

```yaml
quiz_score: 8
review_due: 2026-05-19
status: apply
```

---

## Phase 7 — Sprint Engine

Mục tiêu: plugin biết bạn đang tập trung vào area nào.

Build:

```text
- active_sprint setting
- sprintWeight in scoring
- sprint dashboard
- suggested notes for current sprint
```

Ví dụ:

```yaml
sprint: systems-bridge
```

Command:

```text
Eragear: Set Active Learning Sprint
Eragear: Show Sprint Queue
```

---

# 11. Thứ tự build nên dùng

Nên theo thứ tự này:

```text
1. Learning metadata schema
2. Frontmatter scanner/writer
3. Weak note detector
4. Next action engine
5. Command Center basic
6. Agent task abstraction
7. HTML explainer pipeline
8. Bridge note generator
9. Quiz/review system
10. Sprint engine
```

Không nên làm:

```text
ACP agent orchestration
→ rồi mới nghĩ learning state
```

Vì như vậy sẽ dễ thành “agent chạy task tùy hứng”, không thành system.

---

# 12. MVP nhỏ nhất nên ship

MVP 1 nên chỉ gồm 4 tính năng:

```text
1. Scan Learning Notes
2. Show Weak Notes
3. What Should I Do Next?
4. Generate HTML Explainer for Current Note
```

Chỉ cần 4 cái này là plugin đã khác hẳn ChatUI.

MVP UX:

```text
User mở Obsidian
→ Command: Eragear Command Center
→ Thấy Next Action
→ Click Run
→ Agent tạo artifact
→ Plugin update frontmatter
→ Note chuyển state
→ Next Action mới xuất hiện
```

Đây là learning loop.

---

# 13. Điều nên tránh

## Không biến thành chat app clone

Chat nên là interface phụ. Core phải là:

```text
state machine + next action + artifact generation
```

## Không dùng LLM cho việc deterministic

Không cần LLM cho:

```text
- parse frontmatter
- detect missing fields
- sort notes
- score priority
- update status
- write YAML
```

Dùng LLM cho:

```text
- explain
- generate bridge note
- generate HTML explainer
- create quiz
- create case study
- audit quality
```

## Không cho agent tự sửa vault quá rộng

Ban đầu chỉ cho ghi vào folder an toàn:

```text
_explainers/
03_Bridge_Notes/
05_Case_Studies/
00_Command_Center/
```

Với note đang mở, nên có confirm/diff trước khi overwrite.

---

# 14. Đánh giá cuối

Ý tưởng này **ổn và đáng làm**.

Gap chính không nằm ở ACP agent. Gap chính là plugin chưa có:

```text
Learning metadata
Learning state machine
Next action engine
Artifact lifecycle
Command Center
```

ACP/coding agent chỉ nên là execution layer. Cái biến plugin thành Learning System là lớp này:

```text
Vault state → Learning state → Next action → Agent task → Artifact → State transition
```

Nếu build đúng, Eragear Obsidian Copilot có thể thành:

```text
Personal Engineering Learning OS inside Obsidian
```

Không phải chỉ là:

```text
ChatGPT sidebar trong Obsidian
```
