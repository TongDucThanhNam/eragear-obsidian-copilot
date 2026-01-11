/**
 * Test Panel Constants
 */

import type { Tab } from "@/types/components";
import { MagnifyingGlass, Wrench, Info, Folders, Lightning } from "@phosphor-icons/react";

export const TABS: Tab[] = [
	{
		id: "search",
		icon: <MagnifyingGlass />,
		label: "Search",
		tooltip: "Search notes and files",
	},
	{ id: "ops", icon: <Wrench />, label: "Utils", tooltip: "Note operations" },
	{ id: "info", icon: <Info />, label: "Info", tooltip: "Metadata & Information" },
	{
		id: "files",
		icon: <Folders />,
		label: "Files",
		tooltip: "File & Folder organization",
	},
	{ id: "labs", icon: <Lightning />, label: "Labs", tooltip: "Advanced features" },
];
