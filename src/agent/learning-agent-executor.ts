import { type App, normalizePath, Platform, TFile, TFolder } from "obsidian";
import { getActiveAgentConfig, toAcpAgentConfig } from "@/agent/acp-agent-config";
import { scanAgentWriteProposals } from "@/agent/write-proposal";
import { isPathAllowed } from "@/agent/task-guard";
import { updateLearningAgentTaskStatus } from "@/agent/task-store";
import { AcpAdapter } from "@/infra/acp/acp.adapter";
import { ARTIFACT_FOLDERS } from "@/learning/constants";
import type { MyPluginSettings } from "@/app/settings/plugin-settings";
import type { AgentTaskStatus } from "@/agent/agent-task";
import type { LearningAgentTaskSummary } from "@/agent/task-frontmatter";
import type {
	SessionModelState,
	StopReason,
} from "@/core/models/session-update";
import type {
	AcpAdapterRuntimeEvent,
	AcpAdapterRuntimeEventSeverity,
} from "@/infra/acp/acp.adapter";

const PROPOSAL_FOLDER = normalizePath(
	`${ARTIFACT_FOLDERS.commandCenter}/agent-proposals`,
);
const DEFAULT_AGENT_TASK_TIMEOUT_MS = 180000;
const MAX_EXECUTION_TASK_CONTENT_CHARS = 18000;
const MAX_EXECUTION_PROMPT_SECTION_CHARS = 14000;

export interface LearningAgentExecutionResult {
	stopReason: StopReason;
	proposalCount: number;
}

export interface LearningAgentExecutionEvent {
	kind: "task_status" | "proposal_scan" | "agent_error" | AcpAdapterRuntimeEvent["kind"];
	taskPath: string;
	taskTitle: string;
	message: string;
	createdAt: string;
	severity?: AcpAdapterRuntimeEventSeverity;
	status?: AgentTaskStatus;
	path?: string;
	detail?: string;
	outcome?: string;
	stopReason?: StopReason;
	chars?: number;
	proposalCount?: number;
}

interface LearningAgentExecutorAdapter {
	setTerminalAccess: (enabled: boolean) => void;
	setAutoApproveSafeFilePermissions: (enabled: boolean) => void;
	setRuntimeEventSink?: (
		sink: ((event: AcpAdapterRuntimeEvent) => void) | null,
	) => void;
	setWriteGuard: (
		guard: (path: string) => { allowed: boolean; message?: string },
	) => void;
	setReadGuard?: (
		guard: (path: string) => {
			allowed: boolean;
			content?: string;
			message?: string;
		},
	) => void;
	initialize: (config: ReturnType<typeof toAcpAgentConfig>) => Promise<unknown>;
	newSession: (workingDirectory: string) => Promise<{
		sessionId: string;
		models?: SessionModelState;
	}>;
	setSessionModel?: (sessionId: string, modelId: string) => Promise<void>;
	sendMessage: (
		sessionId: string,
		message: string,
	) => Promise<{ stopReason: StopReason }>;
	disconnect: () => Promise<void>;
}

export interface LearningAgentExecutorOptions {
	adapterFactory?: (app: App) => LearningAgentExecutorAdapter;
	isDesktopApp?: boolean;
	timeoutMs?: number;
	onEvent?: (event: LearningAgentExecutionEvent) => void;
}

export async function runLearningAgentTaskWithAcp(
	app: App,
	settings: MyPluginSettings,
	task: LearningAgentTaskSummary,
	options: LearningAgentExecutorOptions = {},
): Promise<LearningAgentExecutionResult> {
	const isDesktopApp = options.isDesktopApp ?? Platform.isDesktopApp;
	if (!isDesktopApp) {
		throw new Error("Local ACP agent execution requires the desktop app.");
	}

	const agentConfig = getActiveAgentConfig(settings);
	if (!agentConfig || !agentConfig.command) {
		throw new Error("No enabled ACP agent is configured.");
	}

	const taskFile = app.vault.getAbstractFileByPath(task.path);
	if (!(taskFile instanceof TFile) || taskFile.extension !== "md") {
		throw new Error(`Agent task not found: ${task.path}`);
	}

	const taskContent = await app.vault.cachedRead(taskFile);
	const compactTaskContent = compactLearningAgentTaskContent(taskContent);
	await ensureProposalFolder(app);
	const adapter = options.adapterFactory?.(app) ?? new AcpAdapter(app);
	const emit = (event: LearningAgentExecutionEventInput) =>
		emitLearningAgentEvent(options, task, event);
	adapter.setTerminalAccess(false);
	adapter.setAutoApproveSafeFilePermissions(true);
	adapter.setRuntimeEventSink?.((event) =>
		emit({
			kind: event.kind,
			message: event.message,
			severity: event.severity,
			path: event.path,
			detail: event.title,
			outcome: event.outcome,
			stopReason: event.stopReason,
			chars: event.chars,
		}),
	);
	adapter.setWriteGuard((path) => {
		if (isPathAllowed(path, [PROPOSAL_FOLDER])) {
			return { allowed: true };
		}
		return {
			allowed: false,
			message: `Write rejected. Create proposal JSON under ${PROPOSAL_FOLDER}.`,
		};
	});
	adapter.setReadGuard?.((path) => {
		if (path === normalizePath(task.path)) {
			return { allowed: true, content: compactTaskContent };
		}
		if (path === normalizePath(task.notePath)) {
			return {
				allowed: false,
				message:
					"Source note reads are disabled for this bounded Learning OS run. Use the task excerpt already provided in the prompt.",
			};
		}
		if (path.startsWith(`${PROPOSAL_FOLDER}/`)) {
			return { allowed: true };
		}
		return {
			allowed: false,
			message:
				"Vault reads are disabled for this bounded Learning OS run. Create the proposal from the task excerpt.",
		};
	});

	await updateLearningAgentTaskStatus(app, task.path, "running");
	emit({
		kind: "task_status",
		message: "Agent task marked running",
		severity: "info",
		status: "running",
	});

	try {
		const timeoutMs = options.timeoutMs ?? DEFAULT_AGENT_TASK_TIMEOUT_MS;
		const baseConfig = toAcpAgentConfig(agentConfig);
		const acpConfig = {
			...baseConfig,
			workingDirectory: getVaultBasePath(app) ?? baseConfig.workingDirectory,
		};
		emit({
			kind: "task_status",
			message: "Initializing ACP agent",
			severity: "info",
			status: "running",
		});
		await withTimeout(
			adapter.initialize(acpConfig),
			timeoutMs,
			"Agent initialization timed out.",
		);
		emit({
			kind: "task_status",
			message: "Creating ACP session",
			severity: "info",
			status: "running",
		});
		const session = await withTimeout(
			adapter.newSession(acpConfig.workingDirectory ?? process.cwd()),
			timeoutMs,
			"Agent session creation timed out.",
		);
		await selectLearningAgentModel(adapter, session);
		emit({
			kind: "task_status",
			message: "Generating proposal JSON",
			severity: "info",
			status: "running",
		});
		const response = await withTimeout(
			adapter.sendMessage(
				session.sessionId,
				buildExecutionPrompt(task, compactTaskContent),
			),
			timeoutMs,
			"Agent proposal generation timed out.",
		);
		const proposals = await scanAgentWriteProposals(app, [task]);
		const proposalCount = proposals.filter(
			(proposal) =>
				proposal.taskPath === task.path && proposal.status === "pending",
		).length;
		emit({
			kind: "proposal_scan",
			message:
				proposalCount > 0
					? "Pending proposal detected"
					: "No pending proposal detected",
			severity: proposalCount > 0 ? "success" : "warning",
			proposalCount,
		});

		await updateLearningAgentTaskStatus(
			app,
			task.path,
			proposalCount > 0 ? "proposed" : "blocked",
		);
		emit({
			kind: "task_status",
			message:
				proposalCount > 0
					? "Agent task marked proposed"
					: "Agent task marked blocked",
			severity: proposalCount > 0 ? "success" : "warning",
			status: proposalCount > 0 ? "proposed" : "blocked",
			proposalCount,
		});

		return {
			stopReason: response.stopReason,
			proposalCount,
		};
	} catch (error) {
		await updateLearningAgentTaskStatus(app, task.path, "blocked");
		emit({
			kind: "task_status",
			message: "Agent task marked blocked",
			severity: "error",
			status: "blocked",
		});
		emit({
			kind: "agent_error",
			message: error instanceof Error ? error.message : String(error),
			severity: "error",
		});
		throw error;
	} finally {
		await adapter.disconnect();
	}
}

type LearningAgentExecutionEventInput = Omit<
	LearningAgentExecutionEvent,
	"taskPath" | "taskTitle" | "createdAt"
>;

function emitLearningAgentEvent(
	options: LearningAgentExecutorOptions,
	task: LearningAgentTaskSummary,
	event: LearningAgentExecutionEventInput,
): void {
	options.onEvent?.({
		...event,
		taskPath: task.path,
		taskTitle: task.title,
		createdAt: new Date().toISOString(),
	});
}

async function selectLearningAgentModel(
	adapter: LearningAgentExecutorAdapter,
	session: { sessionId: string; models?: SessionModelState },
): Promise<void> {
	if (!adapter.setSessionModel || !session.models) return;

	const modelId = chooseLearningAgentModel(session.models);
	if (!modelId || modelId === session.models.currentModelId) return;

	try {
		await withTimeout(
			adapter.setSessionModel(session.sessionId, modelId),
			15000,
			"Agent model selection timed out.",
		);
	} catch {
		// Continue with the agent default if model switching is not supported.
	}
}

function chooseLearningAgentModel(models: SessionModelState): string | undefined {
	const available = new Set(
		models.availableModels.map((model) => model.modelId),
	);

	for (const preferred of ["haiku", "opus"]) {
		if (available.has(preferred)) return preferred;
	}

	return models.currentModelId;
}

function getVaultBasePath(app: App): string | undefined {
	const adapter = app.vault.adapter as { basePath?: string };
	return adapter.basePath;
}

function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	message: string,
): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
	});

	return Promise.race([promise, timeout]).finally(() => {
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
	});
}

async function ensureProposalFolder(app: App): Promise<void> {
	const parts = PROPOSAL_FOLDER.split("/").filter(Boolean);
	let current = "";

	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		const existing = app.vault.getAbstractFileByPath(current);
		if (existing instanceof TFolder) continue;
		if (existing) {
			throw new Error(`${current} exists but is not a folder`);
		}
		await app.vault.createFolder(current);
	}
}

function buildExecutionPrompt(
	task: LearningAgentTaskSummary,
	taskContent: string,
): string {
	const proposalPath = normalizePath(`${PROPOSAL_FOLDER}/${task.id}.json`);

	return `You are executing an Eragear Learning OS agent task.

You must not write final artifacts or source notes directly.
Do not inspect the vault, do not read the source note separately, and do not run terminal commands.
Use only the bounded task excerpt below as source context.
Your only allowed write path is:
- ${PROPOSAL_FOLDER}

Create exactly one JSON proposal file:
${proposalPath}

The proposal file must be valid JSON with this shape:
{
  "id": "${task.id}",
  "taskPath": "${task.path}",
  "status": "pending",
  "writes": [
    {
      "path": "target vault path from the task allowed write zones",
      "content": "full replacement file content"
    }
  ]
}

The plugin will validate every proposed write path and the user will apply the proposal manually.
If you cannot produce a safe proposal, do not write a proposal file and explain the blocker in your final response.
Prefer creating the proposal immediately. Do not spend time rereading large source notes.

Task file:

\`\`\`markdown
${taskContent}
\`\`\`
`;
}

function compactLearningAgentTaskContent(taskContent: string): string {
	const promptMarker = "\n## Prompt\n";
	const checklistMarker = "\n## Completion checklist";
	const promptStart = taskContent.indexOf(promptMarker);
	const checklistStart = taskContent.indexOf(checklistMarker);

	if (
		promptStart === -1 ||
		checklistStart === -1 ||
		checklistStart <= promptStart
	) {
		return limitText(taskContent, MAX_EXECUTION_TASK_CONTENT_CHARS);
	}

	const header = taskContent.slice(0, promptStart + promptMarker.length);
	const promptSection = taskContent.slice(
		promptStart + promptMarker.length,
		checklistStart,
	);
	const suffix = taskContent.slice(checklistStart);

	return [
		limitText(header, 4000),
		limitText(promptSection, MAX_EXECUTION_PROMPT_SECTION_CHARS),
		limitText(suffix, 4000),
	]
		.join("")
		.trimEnd();
}

function limitText(value: string, maxChars: number): string {
	if (value.length <= maxChars) return value;
	const omittedChars = value.length - maxChars;
	return `${value.slice(0, maxChars).trimEnd()}\n\n[Task content truncated: ${omittedChars} chars omitted.]`;
}
