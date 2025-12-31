/**
 * App Context
 *
 * Global state management for the Eragear plugin
 * Manages:
 * - Current selected file
 * - Active AI stream
 * - Chat history
 * - Error states
 * - Worker/Service readiness
 */

import React, {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";
import type {
	ChatMessage,
	ContextPayload,
	StreamChunk,
} from "@/core/types";

export interface AppContextValue {
	// State
	selectedFilePath: string | null;
	activeMessages: ChatMessage[];
	streamingChunks: Map<string, string>;
	isStreaming: boolean;
	workerReady: boolean;
	cloudflareConnected: boolean;
	error: Error | null;

	// Actions
	setSelectedFile: (path: string | null) => void;
	addMessage: (message: ChatMessage) => void;
	clearMessages: () => void;
	addStreamChunk: (requestId: string, chunk: string) => void;
	getStreamingContent: (requestId: string) => string;
	clearStream: (requestId: string) => void;
	setStreaming: (isStreaming: boolean) => void;
	setWorkerReady: (ready: boolean) => void;
	setCloudflareConnected: (connected: boolean) => void;
	setError: (error: Error | null) => void;
	clearError: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export interface AppContextProviderProps {
	children: ReactNode;
}

export function AppContextProvider({ children }: AppContextProviderProps) {
	const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
	const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
	const [streamingChunks, setStreamingChunks] = useState<Map<string, string>>(
		new Map(),
	);
	const [isStreaming, setIsStreaming] = useState(false);
	const [workerReady, setWorkerReady] = useState(false);
	const [cloudflareConnected, setCloudflareConnected] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const addMessage = useCallback((message: ChatMessage) => {
		setActiveMessages((prev) => [...prev, message]);
	}, []);

	const clearMessages = useCallback(() => {
		setActiveMessages([]);
	}, []);

	const addStreamChunk = useCallback((requestId: string, chunk: string) => {
		setStreamingChunks((prev) => {
			const updated = new Map(prev);
			const current = updated.get(requestId) || "";
			updated.set(requestId, current + chunk);
			return updated;
		});
	}, []);

	const getStreamingContent = useCallback(
		(requestId: string): string => {
			return streamingChunks.get(requestId) || "";
		},
		[streamingChunks],
	);

	const clearStream = useCallback((requestId: string) => {
		setStreamingChunks((prev) => {
			const updated = new Map(prev);
			updated.delete(requestId);
			return updated;
		});
	}, []);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	const value: AppContextValue = {
		// State
		selectedFilePath,
		activeMessages,
		streamingChunks,
		isStreaming,
		workerReady,
		cloudflareConnected,
		error,

		// Actions
		setSelectedFile: setSelectedFilePath,
		addMessage,
		clearMessages,
		addStreamChunk,
		getStreamingContent,
		clearStream,
		setStreaming: setIsStreaming,
		setWorkerReady,
		setCloudflareConnected,
		setError,
		clearError,
	};

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Hook to use App Context
 * Throws error if used outside provider
 */
export function useAppContext(): AppContextValue {
	const context = useContext(AppContext);
	if (context === undefined) {
		throw new Error("useAppContext must be used within AppContextProvider");
	}
	return context;
}
