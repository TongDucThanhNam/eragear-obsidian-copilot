/**
 * useWorker Hook
 *
 * Custom React hook for communicating with Web Worker
 * Provides loading states, error handling, and result caching
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
    AnalyzeGraphPayload,
    GraphStructure,
    SearchContentPayload,
    SearchResults,
} from "@/core/types";
import { getWorkerClient } from "@/core/worker-client";

interface UseWorkerState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}

export function useWorker() {
    const [graphState, setGraphState] = useState<UseWorkerState<GraphStructure>>({
        data: null,
        loading: false,
        error: null,
    });

    const [searchState, setSearchState] = useState<UseWorkerState<SearchResults>>(
        {
            data: null,
            loading: false,
            error: null,
        },
    );

    const [isReady, setIsReady] = useState(false);
    const workerClient = useRef(getWorkerClient());

    // Check worker readiness
    useEffect(() => {
        const checkReady = async () => {
            // Wait a bit for worker to initialize
            await new Promise((resolve) => setTimeout(resolve, 100));
            setIsReady(workerClient.current.getIsReady());
        };

        checkReady();

        // Recheck periodically
        const interval = setInterval(checkReady, 5000);
        return () => clearInterval(interval);
    }, []);

    /**
     * Analyze graph structure
     */
    const analyzeGraph = useCallback(
        async (payload: AnalyzeGraphPayload): Promise<GraphStructure | null> => {
            try {
                setGraphState({ data: null, loading: true, error: null });
                const result = await workerClient.current.analyzeGraph(payload);
                setGraphState({ data: result, loading: false, error: null });
                return result;
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                setGraphState({ data: null, loading: false, error: err });
                console.error("[useWorker] Graph analysis failed:", err);
                return null;
            }
        },
        [],
    );

    /**
     * Search content
     */
    const searchContent = useCallback(
        async (payload: SearchContentPayload): Promise<SearchResults | null> => {
            try {
                setSearchState({ data: null, loading: true, error: null });
                const result = await workerClient.current.searchContent(payload);
                setSearchState({ data: result, loading: false, error: null });
                return result;
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                setSearchState({ data: null, loading: false, error: err });
                console.error("[useWorker] Search failed:", err);
                return null;
            }
        },
        [],
    );

    return {
        // States
        graphState,
        searchState,
        isReady,
        // Methods
        analyzeGraph,
        searchContent,
    };
}
