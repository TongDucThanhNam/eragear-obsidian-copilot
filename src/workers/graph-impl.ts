import { MultiGraph } from "graphology";
import pagerank from "graphology-metrics/centrality/pagerank";

/**
 * Graph Builder Implementation
 * Uses Graphology to manage the vault graph structure.
 */
export class GraphBuilder {
	private graph: MultiGraph;

	constructor() {
		this.graph = new MultiGraph();
	}

	/**
	 * Build the graph from nodes and edges
	 */
	public build(
		nodes: Array<{ path: string; tags: string[] }>,
		edges: Array<{ source: string; target: string; weight?: number }>,
	) {
		this.graph.clear();

		// Add nodes
		nodes.forEach((node) => {
			if (!this.graph.hasNode(node.path)) {
				this.graph.addNode(node.path, { tags: node.tags });
			}
		});

		// Add edges
		edges.forEach((edge) => {
			if (this.graph.hasNode(edge.source) && this.graph.hasNode(edge.target)) {
				this.graph.addEdge(edge.source, edge.target, {
					weight: edge.weight || 1.0,
				});
			}
		});

		console.log(
			`[GraphWorker] Built graph with ${this.graph.order} nodes and ${this.graph.size} edges.`,
		);
	}

	/**
	 * Update a single node and its edges (Partial Update)
	 */
	public updateNode(
		node: { path: string; tags: string[] },
		edges: Array<{ source: string; target: string; weight?: number }>,
	) {
		// Remove existing edges from this node
		if (this.graph.hasNode(node.path)) {
			this.graph.dropNode(node.path);
		}

		// Re-add node
		this.graph.addNode(node.path, { tags: node.tags });

		// Add new edges
		edges.forEach((edge) => {
			if (this.graph.hasNode(edge.source) && this.graph.hasNode(edge.target)) {
				this.graph.addEdge(edge.source, edge.target, {
					weight: edge.weight || 1.0,
				});
			}
		});
	}

	/**
	 * Compute PageRank for all nodes
	 */
	public computePageRank(
		options: {
			damping?: number;
			tolerance?: number;
			maxIterations?: number;
		} = {},
	) {
		const scores = pagerank(this.graph, {
			alpha: options.damping || 0.85,
			tolerance: options.tolerance || 1e-4,
			maxIterations: options.maxIterations || 100,
			getEdgeWeight: "weight",
		});
		return scores;
	}

	/**
	 * Spreading Activation Algorithm
	 * Propagates energy from startNode to neighbors.
	 */
	public spreadingActivation(
		startNode: string,
		options: { decay?: number; initial?: number; threshold?: number } = {},
	) {
		const decay = options.decay || 0.5;
		const initial = options.initial || 1.0;
		const threshold = options.threshold || 0.01;

		const activation = new Map<string, number>();
		const queue: Array<{ node: string; energy: number }> = [];

		if (!this.graph.hasNode(startNode)) return [];

		queue.push({ node: startNode, energy: initial });
		activation.set(startNode, initial);

		// BFS-like propagation
		// Note: This is a simplified version. A full version might handle cycles and multi-hops more carefully.
		// For now, we limit depth implicitly by energy decay.

		while (queue.length > 0) {
			const current = queue.shift();
			if (!current) continue;

			if (current.energy < threshold) continue;

			const neighbors = this.graph.neighbors(current.node);
			if (neighbors.length === 0) continue;

			// Divide energy among neighbors (Fan-out)?
			// Or just decay it?
			// "Standard" simple SA: E_output = E_input * decay * weight
			// Let's use simple decay for now.

			const outputEnergy = current.energy * decay;

			neighbors.forEach((neighbor) => {
				const existing = activation.get(neighbor) || 0;
				// If we haven't processed this node with higher energy, process it
				// To avoid infinite loops in cyclic graphs, we can check if update is significant
				// But for simple "hops", we can just do 2-3 iterations.
				// Let's implement a fixed depth approach for robustness if decay is slow.

				// Better approach for SA:
				// Accumulate energy.
				// But simplified: Just spread to neighbors.

				if (outputEnergy > threshold && outputEnergy > existing) {
					activation.set(neighbor, outputEnergy);
					queue.push({ node: neighbor, energy: outputEnergy });
				}
			});
		}

		// Convert to array and sort
		return Array.from(activation.entries())
			.filter(([node]) => node !== startNode) // Exclude start node
			.map(([path, score]) => ({ path, score }))
			.sort((a, b) => b.score - a.score);
	}

	public getSize() {
		return { nodes: this.graph.order, edges: this.graph.size };
	}
}
