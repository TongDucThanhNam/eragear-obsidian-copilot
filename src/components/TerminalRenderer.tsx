/**
 * TerminalRenderer - Displays terminal output with status indicators
 *
 * This component:
 * - Polls terminal output every 100ms
 * - Shows running/finished/cancelled status
 * - Displays scrollable output with monospace font
 * - Shows exit code when complete
 */

import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { AcpAdapter } from "../../../../adapters/acp/acp.adapter";

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

	console.log(
		`[TerminalRenderer] Component rendered for terminal ${terminalId}, adapter: ${!!acpAdapter}`,
	);

	useEffect(() => {
		console.log(
			`[TerminalRenderer] useEffect triggered for ${terminalId}, adapter: ${!!acpAdapter}`,
		);
		if (!terminalId || !acpAdapter) return;

		const pollOutput = async () => {
			try {
				const result = await acpAdapter.terminalOutput({
					terminalId,
					sessionId: "",
				});
				console.log(
					`[TerminalRenderer] Poll result for ${terminalId}:`,
					result,
				);
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

				console.log(
					`[TerminalRenderer] Polling error for terminal ${terminalId}: ${errorMessage}`,
				);

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
		<div
			className="terminal-renderer"
			style={{
				padding: "12px",
				marginTop: "4px",
				backgroundColor: "var(--background-secondary)",
				border: "1px solid var(--background-modifier-border)",
				borderRadius: "8px",
				fontSize: "12px",
				fontFamily: "var(--font-monospace)",
				userSelect: "text",
			}}
		>
			<div
				className="terminal-renderer-header"
				style={{
					fontWeight: "bold",
					marginBottom: "8px",
					display: "flex",
					alignItems: "center",
					gap: "8px",
					fontFamily: "var(--font-interface)",
				}}
			>
				🖥️ Terminal {terminalId.slice(0, 8)}
				{isRunning ? (
					<span style={{ fontSize: "10px", color: "var(--color-green)" }}>
						● RUNNING
					</span>
				) : isCancelled ? (
					<span style={{ fontSize: "10px", color: "var(--color-orange)" }}>
						● CANCELLED
					</span>
				) : (
					<span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
						● FINISHED
					</span>
				)}
			</div>

			<div
				className="terminal-renderer-output"
				style={{
					backgroundColor: "var(--background-primary)",
					padding: "8px",
					borderRadius: "4px",
					border: "1px solid var(--background-modifier-border)",
					minHeight: "50px",
					maxHeight: "300px",
					overflow: "auto",
					whiteSpace: "pre-wrap",
					wordBreak: "break-word",
				}}
			>
				{output || (isRunning ? "Waiting for output..." : "No output")}
			</div>

			{exitStatus && (
				<div
					className="terminal-renderer-exit"
					style={{
						marginTop: "8px",
						padding: "4px 8px",
						color: "white",
						borderRadius: "4px",
						fontSize: "11px",
						fontFamily: "var(--font-interface)",
						backgroundColor:
							exitStatus.exitCode === 0
								? "var(--color-green)"
								: "var(--color-red)",
						display: "inline-block",
					}}
				>
					Exit Code: {exitStatus.exitCode}
					{exitStatus.signal && ` | Signal: ${exitStatus.signal}`}
				</div>
			)}
		</div>
	);
};

export default TerminalRenderer;
