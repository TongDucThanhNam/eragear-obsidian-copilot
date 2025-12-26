/**
 * ActionCard Component
 * Displays a card with title, description, icon, and content
 */

import type React from "react";
import type { ActionCardProps } from "../../types";

export const ActionCard: React.FC<ActionCardProps> = ({
	title,
	description,
	icon,
	variant = "default",
	children,
}) => {
	return (
		<div className={`action-card action-card-${variant}`}>
			<div className="action-card-header">
				{icon && <span className="action-card-icon">{icon}</span>}
				<div className="action-card-title-group">
					<h4 className="action-card-title">{title}</h4>
					{description && (
						<p className="action-card-description">{description}</p>
					)}
				</div>
			</div>
			<div className="action-card-body">{children}</div>
		</div>
	);
};
