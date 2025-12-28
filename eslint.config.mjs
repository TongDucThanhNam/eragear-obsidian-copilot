import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		ignores: [
			"main.js",
			"dist/",
			"node_modules/",
			"coverage/",
			"**/*.d.ts",
			"esbuild.config.mjs",
			"version-bump.mjs",
		],
	},
	{ files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
	{ languageOptions: { globals: globals.browser } },
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ argsIgnorePattern: "^_" },
			],
			"no-undef": "off", // TypeScript handles this
			"@typescript-eslint/ban-ts-comment": "warn",
		},
	},
];
