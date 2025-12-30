import type {
	WorkerMessage,
	WorkerResponse,
	BuildGraphPayload,
	ComputePageRankPayload,
	SpreadingActivationPayload,
} from "../core/types";
import { GraphBuilder } from "./graph-impl";

const graphBuilder = new GraphBuilder();

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
	const { id, type, payload } = event.data;

	try {
		let responsePayload: unknown;
		let success = true;

		switch (type) {
			case "BUILD_GRAPH": {
				const { nodes, edges } = payload as BuildGraphPayload;
				graphBuilder.build(nodes, edges);
				responsePayload = {
					order: graphBuilder.getSize().nodes,
					size: graphBuilder.getSize().edges,
				};
				break;
			}

			case "COMPUTE_PAGERANK": {
				const opts = payload as ComputePageRankPayload;
				const scores = graphBuilder.computePageRank(opts);
				responsePayload = { scores };
				break;
			}

			case "SPREADING_ACTIVATION": {
				const { startNode, ...opts } = payload as SpreadingActivationPayload;
				const activatedNodes = graphBuilder.spreadingActivation(
					startNode,
					opts,
				);
				responsePayload = { activatedNodes };
				break;
			}

			case "WORKER_READY": {
				responsePayload = { status: "ready" };
				break;
			}

			default:
				success = false;
				throw new Error(`Unknown message type: ${type}`);
		}

		self.postMessage({
			id,
			success,
			data: responsePayload,
		} as WorkerResponse);
	} catch (error) {
		self.postMessage({
			id,
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		} as WorkerResponse);
	}
};

// Notify main thread that worker is ready
self.postMessage({
	id: "__INIT__",
	success: true,
	data: { status: "Worker initialized" },
} as WorkerResponse);

export default null as unknown as Blob;
