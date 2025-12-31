/**
 * ActionCardGroup Component
 * Groups multiple ActionCards together with a title
 */

import type React from "react";
import type { ActionCardGroupProps } from "../../types";

export const ActionCardGroup: React.FC<ActionCardGroupProps> = ({
	title,
	children,
}) => {
	return (
		<div className="action-card-group">
			<h3 className="action-card-group-title">{title}</h3>
			<div className="action-card-group-items">{children}</div>
		</div>
	);
};
