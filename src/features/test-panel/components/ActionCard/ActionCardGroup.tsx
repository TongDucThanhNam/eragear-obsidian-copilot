/**
 * ActionCardGroup Component
 * Groups multiple ActionCards together with a title
 */

import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActionCardGroupProps } from "@/features/test-panel/types";
import "./action-card.css";

export const ActionCardGroup: React.FC<ActionCardGroupProps> = ({
	title,
	children,
}) => {
	return (
		<Card className="action-card-group">
			<CardHeader className="action-card-group-header">
				<CardTitle className="action-card-group-title">{title}</CardTitle>
			</CardHeader>

			<CardContent className="action-card-group-content">{children}</CardContent>
		</Card>
	);
};
