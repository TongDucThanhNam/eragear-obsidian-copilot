/**
 * Services Module Exports
 *
 * All external service communication is centralized here.
 * This isolates the Infrastructure/External Comms layer from
 * Core Domain Logic and UI layers.
 */

export type { CloudflareServiceConfig } from "./cloudflare-api";
export { CloudflareService, createCloudflareService } from "./cloudflare-api";
