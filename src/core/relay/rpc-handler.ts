import { App, TFile } from "obsidian";

export interface JsonRpcRequest {
	jsonrpc: "2.0";
	method: string;
	params?: any;
	id?: string | number;
}

export interface JsonRpcResponse {
	jsonrpc: "2.0";
	result?: any;
	error?: {
		code: number;
		message: string;
		data?: any;
	};
	id: string | number | null;
}

export class RpcHandler {
	constructor(private app: App) {}

	async handle(request: JsonRpcRequest): Promise<JsonRpcResponse> {
		try {
			let result: any;

			switch (request.method) {
				case "vault/read":
					result = await this.handleVaultRead(request.params);
					break;
				case "vault/append":
					result = await this.handleVaultAppend(request.params);
					break;
				case "ping":
					result = "pong";
					break;
				default:
					return {
						jsonrpc: "2.0",
						error: { code: -32601, message: "Method not found" },
						id: request.id ?? null,
					};
			}

			return {
				jsonrpc: "2.0",
				result,
				id: request.id ?? null,
			};
		} catch (e: any) {
			console.error("[RpcHandler] Error", e);
			return {
				jsonrpc: "2.0",
				error: { code: -32000, message: e.message || "Internal error" },
				id: request.id ?? null,
			};
		}
	}

	private async handleVaultRead(params: { path: string }) {
		if (!params || !params.path) throw new Error("Missing path param");

		const file = this.app.vault.getAbstractFileByPath(params.path);
		if (!file) throw new Error("File not found");
		if (!(file instanceof TFile)) throw new Error("Not a file");

		const content = await this.app.vault.read(file);
		return { content };
	}

	private async handleVaultAppend(params: { path: string; text: string }) {
		// TODO: Add Human Verification / User Approval here
		if (!params || !params.path || !params.text)
			throw new Error("Missing params");

		const file = this.app.vault.getAbstractFileByPath(params.path);
		if (!file) {
			// Create if not exists? For now, fail or create.
			// Let's create for now as a utility
			await this.app.vault.create(params.path, params.text);
			return { success: true, created: true };
		}

		if (!(file instanceof TFile)) throw new Error("Not a file");

		await this.app.vault.append(file, params.text);
		return { success: true, appended: true };
	}
}
