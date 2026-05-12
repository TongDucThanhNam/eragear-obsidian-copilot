/**
 * TerminalRenderer - Displays terminal output with status indicators
 *
 * This component:
 * - Polls terminal output every 100ms
 * - Shows running/finished/cancelled status
 * - Displays scrollable output with monospace font
 * - Shows exit code when complete
 */

import { AcpAdapter } from "@/infra/acp/acp.adapter";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface TerminalRendererProps {
	terminalId: string;
	acpAdapter: AcpAdapter | null;
}

interface ExitStatus {
	exitCode: number | null;
	signal: string | null;
}

export const TerminalRenderer: React.FC<TerminalRendererProps> = ({
	terminalId,
	acpAdapter,
}) => {
	const [output, setOutput] = useState("");
	const [exitStatus, setExitStatus] = useState<ExitStatus | null>(null);
	const [isRunning, setIsRunning] = useState(true);
	const [isCancelled, setIsCancelled] = useState(false);
	const intervalRef = useRef<number | null>(null);

	useEffect(() => {
		if (!terminalId || !acpAdapter) return;

		const pollOutput = async () => {
			try {
				const result = await acpAdapter.terminalOutput({
					terminalId,
					sessionId: "",
				});
				setOutput(result.output);
				if (result.exitStatus) {
					setExitStatus({
						exitCode: result.exitStatus.exitCode ?? null,
						signal: result.exitStatus.signal ?? null,
					});
					setIsRunning(false);
					if (intervalRef.current) {
						window.clearInterval(intervalRef.current);
						intervalRef.current = null;
					}
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				// If terminal not found and no exit status was captured, it was likely cancelled
				if (errorMessage.includes("not found") && !exitStatus) {
					setIsCancelled(true);
				}

				setIsRunning(false);
				if (intervalRef.current) {
					window.clearInterval(intervalRef.current);
					intervalRef.current = null;
				}
			}
		};

		// Start polling immediately
		void pollOutput();

		// Set up polling interval with shorter interval to catch fast commands
		intervalRef.current = window.setInterval(() => {
			void pollOutput();
		}, 100);

		return () => {
			if (intervalRef.current) {
				window.clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [terminalId, acpAdapter]);

	// Separate effect to stop polling when no longer running
	useEffect(() => {
		if (!isRunning && intervalRef.current) {
			window.clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, [isRunning]);

	return (
		<div className="terminal-renderer">
			<div className="terminal-renderer-header">
				<span>Terminal {terminalId.slice(0, 8)}</span>
				{isRunning ? (
					<span className="terminal-renderer-status is-running">
						Running
					</span>
				) : isCancelled ? (
					<span className="terminal-renderer-status is-cancelled">
						Cancelled
					</span>
				) : (
					<span className="terminal-renderer-status is-finished">
						Finished
					</span>
				)}
			</div>

			<div className="terminal-renderer-output">
				{output || (isRunning ? "Waiting for output..." : "No output")}
			</div>

			{exitStatus && (
				<div
					className="terminal-renderer-exit"
					data-status={exitStatus.exitCode === 0 ? "complete" : "failed"}
				>
					Exit Code: {exitStatus.exitCode}
					{exitStatus.signal && ` | Signal: ${exitStatus.signal}`}
				</div>
			)}
		</div>
	);
};

export default TerminalRenderer;
