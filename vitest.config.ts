import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			obsidian: fileURLToPath(
				new URL("./src/test/mocks/obsidian.ts", import.meta.url),
			),
		},
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
});
