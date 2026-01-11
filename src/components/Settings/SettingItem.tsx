import React, { ReactNode } from "react";

interface SettingItemProps {
	name: string;
	description?: string;
	children?: ReactNode;
	className?: string;
}

export const SettingItem: React.FC<SettingItemProps> = ({
	name,
	description,
	children,
	className = "",
}) => {
	return (
		<div className={`setting-item ${className}`}>
			<div className="setting-item-info">
				<div className="setting-item-name">{name}</div>
				{description && (
					<div className="setting-item-description">{description}</div>
				)}
			</div>
			<div className="setting-item-control">{children}</div>
		</div>
	);
};
