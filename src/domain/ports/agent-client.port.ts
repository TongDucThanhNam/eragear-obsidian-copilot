import type { AgentConfig } from "../models/agent-config";
import type { AgentError } from "../models/agent-error";
import type { SessionUpdate } from "../models/session-update";

export interface InitializeResult {
	protocolVersion: string;
	authMethods: {
		id: string;
		type: string;
		description?: string;
		url?: string;
	}[];
}

export interface NewSessionResult {
	sessionId: string;
	availableModes: {
		id: string;
		name: string;
		description: string;
		isCurrent: boolean;
	}[];
}

export interface IAgentClient {
	initialize(config: AgentConfig): Promise<InitializeResult>;
	newSession(workingDirectory: string): Promise<NewSessionResult>;
	authenticate(methodId: string): Promise<boolean>;
	sendMessage(sessionId: string, message: string): Promise<void>;
	cancel(sessionId: string): Promise<void>;
	disconnect(): Promise<void>;

	onSessionUpdate(callback: (update: SessionUpdate) => void): void;
	onError(callback: (error: AgentError) => void): void;
	respondToPermission(requestId: string, optionId: string): Promise<void>;

	isInitialized(): boolean;
	getCurrentAgentId(): string | null;
	setSessionMode(sessionId: string, modeId: string): Promise<void>;
	setSessionModel(sessionId: string, modelId: string): Promise<void>;
}
