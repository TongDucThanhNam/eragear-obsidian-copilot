/**
 * ActionCardGroup Component
 * Groups multiple ActionCards together with a title
 */

import type React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardAction, CardDescription

 } from "../ui/card";
import type { ActionCardGroupProps } from "../../types";
import "./action-card.css";

export const ActionCardGroup: React.FC<ActionCardGroupProps> = ({
	title,
	children,
}) => {
	return (
		<Card className="">
			<CardHeader className="">
				<CardTitle className="">{title}</CardTitle>
			</CardHeader>

			<CardContent className="">{children}</CardContent>
		</Card>
	);
};
