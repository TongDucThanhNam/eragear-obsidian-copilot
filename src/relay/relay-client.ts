import { App, Notice } from "obsidian";
import * as CryptoUtils from "./crypto-utils";
import { RpcHandler, type JsonRpcRequest } from "./rpc-handler";

const RECONNECT_DELAY = 5000;

export class RelayClient {
	private ws: WebSocket | null = null;
	private sessionId: string | null = null;
	private key: CryptoKey | null = null;
	private keyRaw: string | null = null;
	private isConnected = false;
	private rpcHandler: RpcHandler;
	private relayUrl: string;

	constructor(app: App, relayUrl: string) {
		this.rpcHandler = new RpcHandler(app);
		this.relayUrl = relayUrl;
	}

	async connect(): Promise<{ sessionId: string; key: string }> {
		if (this.isConnected && this.sessionId && this.keyRaw) {
			return { sessionId: this.sessionId, key: this.keyRaw };
		}

		// 1. Generate Session & Key
		this.sessionId = CryptoUtils.generateSessionId();
		const keyData = await CryptoUtils.generateKey();
		this.key = keyData.key;
		this.keyRaw = keyData.raw;

		this.connectWs();

		return { sessionId: this.sessionId, key: this.keyRaw };
	}

	public disconnect() {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.isConnected = false;
		this.sessionId = null;
		this.key = null;
		this.keyRaw = null;
	}

	private connectWs() {
		if (!this.sessionId) return;

		// Ensure Url ends with slash if needed, but relayUrl usually base
		const wsUrl = `${this.relayUrl}/v1/room/${this.sessionId}`;
		console.log("[RelayClient] Connecting to", wsUrl);

		try {
			this.ws = new WebSocket(wsUrl);

			this.ws.onopen = () => {
				console.log("[RelayClient] Connected");
				this.isConnected = true;
				new Notice("Eragear Relay Connected");
			};

			this.ws.onmessage = async (event) => {
				try {
					const text = event.data;
					if (typeof text !== "string") return;

					// 1. Parse encrypted payload
					const payload = JSON.parse(text);
					if (!payload.iv || !payload.data) return; // Ignore non-encrypted (system) msgs

					// 2. Decrypt
					if (!this.key) return;
					const decryptedJson = await CryptoUtils.decrypt(payload, this.key);

					// 3. Parse JSON-RPC
					const request = JSON.parse(decryptedJson) as JsonRpcRequest;
					console.log("[RelayClient] Received RPC", request.method);

					// 4. Handle
					const response = await this.rpcHandler.handle(request);

					// 5. Encrypt Response
					const responseJson = JSON.stringify(response);
					const encryptedResponse = await CryptoUtils.encrypt(
						responseJson,
						this.key,
					);

					// 6. Send back
					if (this.ws && this.ws.readyState === WebSocket.OPEN) {
						this.ws.send(JSON.stringify(encryptedResponse));
					}
				} catch (e) {
					console.error("[RelayClient] Error processing message", e);
				}
			};

			this.ws.onclose = () => {
				console.log("[RelayClient] Disconnected");
				this.isConnected = false;
				// Reconnect logic?
				// For now simple reconnect if session is supposed to be active
				if (this.sessionId) {
					setTimeout(() => this.connectWs(), RECONNECT_DELAY);
				}
			};

			this.ws.onerror = (err) => {
				console.error("[RelayClient] WebSocket Error", err);
			};
		} catch (e) {
			console.error("[RelayClient] Connection failed", e);
		}
	}

	public getConnectionInfo() {
		return {
			isConnected: this.isConnected,
			sessionId: this.sessionId,
			key: this.keyRaw,
		};
	}
}
