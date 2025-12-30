import type { AgentConfig } from "../models/agent-config";
import type { AgentError } from "../models/agent-error";
import type {
	PromptResponse,
	SessionModelState,
	SessionUpdate,
} from "../models/session-update";

// ============================================================================
// Connection State - Tracks the lifecycle of the agent connection
// ============================================================================
export enum ConnectionState {
	/** No connection established */
	DISCONNECTED = "disconnected",
	/** Connection is being established (spawn, handshake) */
	INITIALIZING = "initializing",
	/** Connection ready for use */
	READY = "ready",
	/** Connection encountered a fatal error */
	ERROR = "error",
	/** Connection is being gracefully closed */
	CLOSING = "closing",
}

// ============================================================================
// Subscription handle - Used to unsubscribe from events
// ============================================================================
export interface Subscription {
	/** Unique identifier for this subscription */
	id: string;
	/** Unsubscribe from the event */
	unsubscribe: () => void;
}

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
	/** Models available in this session (experimental, agent-dependent) */
	models?: SessionModelState;
}

export interface IAgentClient {
	// ========================================================================
	// Lifecycle Methods
	// ========================================================================

	initialize(config: AgentConfig): Promise<InitializeResult>;
	disconnect(): Promise<void>;

	// ========================================================================
	// Session Management
	// ========================================================================

	newSession(workingDirectory: string): Promise<NewSessionResult>;
	authenticate(methodId: string): Promise<boolean>;

	// ========================================================================
	// Messaging
	// ========================================================================

	/** Send a prompt to the agent within an existing session */
	sendMessage(sessionId: string, message: string): Promise<PromptResponse>;

	/** Cancel any ongoing operation in the session */
	cancel(sessionId: string): Promise<void>;

	/** Respond to a permission request from the agent */
	respondToPermission(requestId: string, optionId: string): Promise<void>;

	// ========================================================================
	// Session Configuration
	// ========================================================================

	setSessionMode(sessionId: string, modeId: string): Promise<void>;
	setSessionModel(sessionId: string, modelId: string): Promise<void>;

	// ========================================================================
	// Event Subscriptions - Returns Subscription for cleanup
	// ========================================================================

	/**
	 * Subscribe to session updates. Returns a Subscription object with unsubscribe method.
	 * IMPORTANT: Always unsubscribe when done to prevent memory leaks.
	 */
	onSessionUpdate(callback: (update: SessionUpdate) => void): Subscription;

	/** Subscribe to connection errors */
	onError(callback: (error: AgentError) => void): Subscription;

	// ========================================================================
	// State Queries
	// ========================================================================

	/** Check if connection is ready for use */
	isInitialized(): boolean;

	/** Get the current connection state */
	getConnectionState(): ConnectionState;

	/** Get the ID of the currently connected agent */
	getCurrentAgentId(): string | null;
}
