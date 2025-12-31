/**
 * useTestOutput Hook
 * Manages test output logging and display
 */

import { useState } from "react";
import type { TestOutput } from "types/testPanel";

export function useTestOutput() {
    const [testOutputs, setTestOutputs] = useState<TestOutput[]>([]);

    const addTestOutput = (
        title: string,
        content: string,
        status: "success" | "error" | "info",
    ) => {
        const newOutput: TestOutput = {
            id: `${Date.now()}-${Math.random()}`,
            title,
            content,
            status,
            timestamp: new Date().toLocaleTimeString(),
        };
        setTestOutputs((prev) => [newOutput, ...prev].slice(0, 10));
    };

    const clearTestOutputs = () => {
        setTestOutputs([]);
    };

    return {
        testOutputs,
        addTestOutput,
        clearTestOutputs,
        setTestOutputs,
    };
}
