/**
 * TabNavigation Component
 * Renders tab buttons for switching between different views
 */

import type React from "react";
import type { TabNavigationProps } from "../../types";

export const TabNavigation: React.FC<TabNavigationProps> = ({
	tabs,
	activeTab,
	onTabChange,
}) => {
	return (
		<div className="tab-navigation">
			{tabs.map((tab) => (
				<button
					key={tab.id}
					type="button"
					className={`tab-nav-btn ${activeTab === tab.id ? "active" : ""}`}
					onClick={() => onTabChange(tab.id)}
					title={tab.tooltip}
					aria-label={tab.label}
					aria-pressed={activeTab === tab.id}
				>
					<span className="tab-nav-icon">{tab.icon}</span>
					<span className="tab-nav-label">{tab.label}</span>
				</button>
			))}
		</div>
	);
};
