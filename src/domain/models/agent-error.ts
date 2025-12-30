export class AgentError extends Error {
	constructor(
		message: string,
		public code?: number | string,
		public data?: unknown,
	) {
		super(message);
		this.name = "AgentError";
	}
}
