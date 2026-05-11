/**
 * Use Sessions Hook
 *
 * Provides session persistence operations for chat interface.
 */

import type { SessionSummary } from "@/core/models/session-persistence";
import type { IAgentClient } from "@/core/ports/agent-client.port";

export function useSessions(agentClient: IAgentClient | null) {
	/**
	 * Load all saved sessions
	 */
	const loadSessions = async (): Promise<SessionSummary[]> => {
		if (!agentClient) {
			return [];
		}
		try {
			return await agentClient.listSessions();
		} catch (error) {
			console.error("[useSessions] Failed to load sessions:", error);
			return [];
		}
	};

	/**
	 * Save current session
	 */
	const saveSession = async (
		title: string,
		updates: any[],
	): Promise<string | null> => {
		if (!agentClient) {
			return null;
		}
		try {
			return await agentClient.saveCurrentSession(title, updates);
		} catch (error) {
			console.error("[useSessions] Failed to save session:", error);
			return null;
		}
	};

	return {
		loadSessions,
		saveSession,
	};
}
