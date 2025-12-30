import { DurableObject } from "cloudflare:workers";

interface Env {
	RELAY_ROOM: DurableObjectNamespace;
}

/**
 * A Durable Object that acts as a simple WebSocket relay room.
 * It broadcasts messages from one peer to all other peers in the same room.
 */
export class RelayRoom extends DurableObject {
	// Hibernation: Worker sleeps when no messages are processing
	async fetch(request: Request) {
		if (request.headers.get("Upgrade") !== "websocket") {
			return new Response("Expected WebSocket", { status: 426 });
		}

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);

		// Accept the websocket connection
		this.ctx.acceptWebSocket(server);

		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		// Simple Relay Logic: Broadcast to all other sockets in this room
		// Cloudflare does NOT decrypt; it just relays encrypted blobs.
		const peers = this.ctx.getWebSockets();
		for (const peer of peers) {
			if (peer !== ws) {
				peer.send(message);
			}
		}
	}

	async webSocketClose(
		ws: WebSocket,
		code: number,
		reason: string,
		wasClean: boolean,
	) {
		// Optional: Notify others of disconnection
		const peers = this.ctx.getWebSockets();
		for (const peer of peers) {
			peer.send(JSON.stringify({ type: "SYSTEM_DISCONNECT" }));
		}
	}
}

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url);

		// Route: /v1/room/{sessionId}
		const match = /^\/v1\/room\/([a-zA-Z0-9-]+)$/.exec(url.pathname);

		if (match) {
			const sessionId = match[1];
			// Get the Durable Object stub for this session ID
			const id = env.RELAY_ROOM.idFromName(sessionId);
			const stub = env.RELAY_ROOM.get(id);

			return stub.fetch(request);
		}

		return new Response("Not Found", { status: 404 });
	},
};
