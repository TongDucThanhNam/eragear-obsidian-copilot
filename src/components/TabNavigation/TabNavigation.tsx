/**
 * TabNavigation Component
 * Renders tab buttons for switching between different views
 */

import type React from "react";
import type { TabNavigationProps } from "../../types/components";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const TabNavigation: React.FC<TabNavigationProps> = ({
	tabs,
	activeTab,
	onTabChange,
}) => {
	return (
		<Tabs value={activeTab} onValueChange={onTabChange}>
			<TabsList className="tab-navigation">
				{tabs.map((tab) => (
					<TabsTrigger
						key={tab.id}
						value={tab.id}
						title={tab.tooltip}
						aria-label={tab.label}
						className="tab-nav-trigger"
					>
						<span className="tab-nav-icon">{tab.icon}</span>
						<span className="tab-nav-label">{tab.label}</span>
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
};
