import type { LearningAgentTask } from "@/agent/agent-task";

export interface AgentWritePlanValidation {
	allowed: string[];
	rejected: string[];
	isValid: boolean;
}

export function validateAgentWritePlan(
	task: Pick<LearningAgentTask, "allowedWriteZones">,
	paths: string[],
): AgentWritePlanValidation {
	const allowed: string[] = [];
	const rejected: string[] = [];

	for (const path of paths) {
		if (isPathAllowed(path, task.allowedWriteZones)) {
			allowed.push(normalizeVaultPath(path));
		} else {
			rejected.push(normalizeVaultPath(path));
		}
	}

	return {
		allowed,
		rejected,
		isValid: rejected.length === 0,
	};
}

export function isPathAllowed(path: string, allowedWriteZones: string[]): boolean {
	const normalizedPath = normalizeVaultPath(path);
	if (!normalizedPath || normalizedPath.includes("../")) return false;

	return allowedWriteZones.some((zone) => {
		const normalizedZone = normalizeVaultPath(zone);
		if (!normalizedZone || normalizedZone.includes("../")) return false;
		if (normalizedPath === normalizedZone) return true;
		return normalizedPath.startsWith(`${normalizedZone}/`);
	});
}

function normalizeVaultPath(path: string): string {
	return path
		.replace(/\\/g, "/")
		.replace(/^\/+/, "")
		.replace(/\/+/g, "/")
		.replace(/\/$/, "");
}
