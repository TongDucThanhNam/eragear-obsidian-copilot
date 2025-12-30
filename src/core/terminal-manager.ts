/**
 * TerminalManager - Manages terminal process spawning and output capture
 *
 * This manager handles:
 * - Process spawning with proper shell wrapping
 * - stdout/stderr capture and buffering
 * - Process lifecycle (exit, kill, cleanup)
 * - Output byte limiting to prevent memory issues
 */

import type * as acp from "@agentclientprotocol/sdk";
import { type ChildProcess, type SpawnOptions, spawn } from "child_process";
import { Platform } from "obsidian";

/**
 * Internal representation of a terminal process
 */
interface TerminalProcess {
	id: string;
	process: ChildProcess;
	output: string;
	exitStatus: { exitCode: number | null; signal: string | null } | null;
	outputByteLimit?: number;
	waitPromises: Array<
		(exitStatus: { exitCode: number | null; signal: string | null }) => void
	>;
	cleanupTimeout?: number;
}

/**
 * TerminalManager class
 */
export class TerminalManager {
	private terminals = new Map<string, TerminalProcess>();

	constructor() {
		console.log("[TerminalManager] Initialized");
	}

	/**
	 * Create a new terminal and execute a command
	 */
	createTerminal(params: acp.CreateTerminalRequest): string {
		const terminalId = crypto.randomUUID();

		// Check current platform
		if (!Platform.isDesktopApp) {
			throw new Error("Terminal is only available on desktop");
		}

		// Set up environment variables
		const env = { ...process.env };
		if (params.env) {
			for (const envVar of params.env) {
				env[envVar.name] = envVar.value;
			}
		}

		// Handle command parsing
		let command = params.command;
		let args = params.args || [];

		// If no args provided and command contains shell syntax, use shell to execute
		if (!params.args) {
			// Check for shell syntax (pipes, redirects, logical operators, etc.)
			const hasShellSyntax = /[|&;<>()$`\\"]/.test(params.command);

			if (hasShellSyntax) {
				// Use shell to execute the command
				const shell =
					Platform.isMacOS || Platform.isLinux ? "/bin/sh" : "cmd.exe";
				const shellFlag = Platform.isMacOS || Platform.isLinux ? "-c" : "/c";
				command = shell;
				args = [shellFlag, params.command];
			} else if (params.command.includes(" ")) {
				// Simple command with arguments, split by space
				const parts = params.command
					.split(" ")
					.filter((part) => part.length > 0);
				command = parts[0] ?? params.command;
				args = parts.slice(1);
			}
		}

		// On macOS and Linux, wrap the command in a login shell to inherit the user's environment
		if (Platform.isMacOS || Platform.isLinux) {
			const shell = Platform.isMacOS ? "/bin/zsh" : "/bin/bash";
			const commandString = [command, ...args]
				.map((arg) => "'" + arg.replace(/'/g, "'\\''") + "'")
				.join(" ");
			command = shell;
			args = ["-l", "-c", commandString];
		}

		console.log(`[Terminal ${terminalId}] Creating terminal:`, {
			command,
			args,
			cwd: params.cwd,
		});

		// Spawn the process
		const spawnOptions: SpawnOptions = {
			cwd: params.cwd || undefined,
			env,
			stdio: ["pipe", "pipe", "pipe"],
		};
		const childProcess = spawn(command, args, spawnOptions);

		const terminal: TerminalProcess = {
			id: terminalId,
			process: childProcess,
			output: "",
			exitStatus: null,
			outputByteLimit: params.outputByteLimit ?? undefined,
			waitPromises: [],
		};

		// Handle spawn errors
		childProcess.on("error", (error) => {
			console.log(`[Terminal ${terminalId}] Process error:`, error.message);
			// Set exit status to indicate failure
			const exitStatus = { exitCode: 127, signal: null }; // 127 = command not found
			terminal.exitStatus = exitStatus;
			// Resolve all waiting promises
			for (const resolve of terminal.waitPromises) {
				resolve(exitStatus);
			}
			terminal.waitPromises = [];
		});

		// Capture stdout and stderr
		childProcess.stdout?.on("data", (data: Buffer) => {
			const output = data.toString();
			console.log(`[Terminal ${terminalId}] stdout:`, output.slice(0, 100));
			this.appendOutput(terminal, output);
		});

		childProcess.stderr?.on("data", (data: Buffer) => {
			const output = data.toString();
			console.log(`[Terminal ${terminalId}] stderr:`, output.slice(0, 100));
			this.appendOutput(terminal, output);
		});

		// Handle process exit
		childProcess.on("exit", (code, signal) => {
			console.log(
				`[Terminal ${terminalId}] Process exited with code: ${code}, signal: ${signal}`,
			);
			const exitStatus = { exitCode: code, signal };
			terminal.exitStatus = exitStatus;
			// Resolve all waiting promises
			for (const resolve of terminal.waitPromises) {
				resolve(exitStatus);
			}
			terminal.waitPromises = [];
		});

		this.terminals.set(terminalId, terminal);
		return terminalId;
	}

	/**
	 * Append output to terminal buffer, respecting byte limit
	 */
	private appendOutput(terminal: TerminalProcess, data: string): void {
		terminal.output += data;

		// Apply output byte limit if specified
		if (
			terminal.outputByteLimit &&
			Buffer.byteLength(terminal.output, "utf8") > terminal.outputByteLimit
		) {
			// Truncate from the beginning, ensuring we stay at character boundaries
			const bytes = Buffer.from(terminal.output, "utf8");
			const truncatedBytes = bytes.subarray(
				bytes.length - terminal.outputByteLimit,
			);
			terminal.output = truncatedBytes.toString("utf8");
		}
	}

	/**
	 * Get terminal output and status
	 */
	getOutput(terminalId: string): {
		output: string;
		truncated: boolean;
		exitStatus: { exitCode: number | null; signal: string | null } | null;
	} | null {
		const terminal = this.terminals.get(terminalId);
		if (!terminal) return null;

		return {
			output: terminal.output,
			truncated: terminal.outputByteLimit
				? Buffer.byteLength(terminal.output, "utf8") >= terminal.outputByteLimit
				: false,
			exitStatus: terminal.exitStatus,
		};
	}

	/**
	 * Wait for terminal to exit
	 */
	waitForExit(
		terminalId: string,
	): Promise<{ exitCode: number | null; signal: string | null }> {
		const terminal = this.terminals.get(terminalId);
		if (!terminal) {
			return Promise.reject(new Error(`Terminal ${terminalId} not found`));
		}

		if (terminal.exitStatus) {
			return Promise.resolve(terminal.exitStatus);
		}

		return new Promise((resolve) => {
			terminal.waitPromises.push(resolve);
		});
	}

	/**
	 * Kill a running terminal
	 */
	killTerminal(terminalId: string): boolean {
		const terminal = this.terminals.get(terminalId);
		if (!terminal) return false;

		if (!terminal.exitStatus) {
			terminal.process.kill("SIGTERM");
		}
		return true;
	}

	/**
	 * Release terminal resources with grace period
	 */
	releaseTerminal(terminalId: string): boolean {
		const terminal = this.terminals.get(terminalId);
		if (!terminal) return false;

		console.log(`[Terminal ${terminalId}] Releasing terminal`);
		if (!terminal.exitStatus) {
			terminal.process.kill("SIGTERM");
		}

		// Schedule cleanup after 30 seconds to allow UI to poll final output
		terminal.cleanupTimeout = window.setTimeout(() => {
			console.log(
				`[Terminal ${terminalId}] Cleaning up terminal after grace period`,
			);
			this.terminals.delete(terminalId);
		}, 30000);

		return true;
	}

	/**
	 * Kill all running terminals
	 */
	killAllTerminals(): void {
		console.log(
			`[TerminalManager] Killing ${this.terminals.size} running terminals...`,
		);
		this.terminals.forEach((terminal, terminalId) => {
			// Clear cleanup timeout if scheduled
			if (terminal.cleanupTimeout) {
				window.clearTimeout(terminal.cleanupTimeout);
			}
			if (!terminal.exitStatus) {
				console.log(`[TerminalManager] Killing terminal ${terminalId}`);
				this.killTerminal(terminalId);
			}
		});
		// Clear all terminals
		this.terminals.clear();
	}
}
