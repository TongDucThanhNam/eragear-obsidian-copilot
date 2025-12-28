/**
 * Test Panel Constants
 */

import type { Tab } from "../../types";

export const TABS: Tab[] = [
	{
		id: "search",
		icon: "🔍",
		label: "Search",
		tooltip: "Search notes and files",
	},
	{ id: "ops", icon: "🛠️", label: "Utils", tooltip: "Note operations" },
	{ id: "info", icon: "ℹ️", label: "Info", tooltip: "Metadata & Information" },
	{
		id: "files",
		icon: "🗂️",
		label: "Files",
		tooltip: "File & Folder organization",
	},
	{ id: "labs", icon: "⚡", label: "Labs", tooltip: "Advanced features" },
	{ id: "chat", icon: "💬", label: "Chat", tooltip: "AI Chat & Copilot" },
];
