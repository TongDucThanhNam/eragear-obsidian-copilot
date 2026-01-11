/**
 * ActionCard Component
 * Displays a card with title, description, icon, and content
 */

import type React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import type { ActionCardProps } from "../../types/components";
import "./action-card.css";

export const ActionCard: React.FC<ActionCardProps> = ({
	title,
	description,
	icon,
	variant = "default",
	children,
}) => {
	return (
		<Card className={`action-card action-card-${variant}`}>
			<CardHeader className="action-card-header">
				{icon && <span className="action-card-icon">{icon}</span>}
				<div className="action-card-title-group">
					<CardTitle className="action-card-title">{title}</CardTitle>
					{description && (
						<p className="action-card-description">{description}</p>
					)}
				</div>
			</CardHeader>
			<CardContent className="action-card-body">{children}</CardContent>
		</Card>
	);
};
