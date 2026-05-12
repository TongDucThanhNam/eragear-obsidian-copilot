/**
 * Test Panel Constants
 */

import type { Tab } from "@/features/test-panel/types";
import {
	IconBrain,
	IconFolder,
	IconInfo,
	IconSearch,
	IconWrench,
} from "@/components/ui/Icons";

export const TABS: Tab[] = [
	{
		id: "search",
		icon: <IconSearch />,
		label: "Search",
		tooltip: "Search notes and files",
	},
	{ id: "ops", icon: <IconWrench />, label: "Utils", tooltip: "Note operations" },
	{ id: "info", icon: <IconInfo />, label: "Info", tooltip: "Metadata and information" },
	{
		id: "files",
		icon: <IconFolder />,
		label: "Files",
		tooltip: "File and folder organization",
	},
	{ id: "labs", icon: <IconBrain />, label: "Labs", tooltip: "Advanced features" },
];
