export interface AgentConfig {
	id: string;
	displayName: string;
	command: string;
	args?: string[];
	workingDirectory?: string;
	env?: Record<string, string>;
}
