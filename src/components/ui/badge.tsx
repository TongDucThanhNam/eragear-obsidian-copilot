import React from "react";
import "./badge.css";

function classNames(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(" ");
}

type BadgeVariant =
	| "default"
	| "secondary"
	| "destructive"
	| "outline"
	| "ghost"
	| "link";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	variant?: BadgeVariant;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
	({ className, variant = "default", ...props }, ref) => (
		<span
			ref={ref}
			data-slot="badge"
			data-variant={variant}
			className={classNames(className)}
			{...props}
		/>
	),
);

Badge.displayName = "Badge";

function badgeVariants(variant: BadgeVariant = "default") {
	return `badge badge-${variant}`;
}

export { Badge, badgeVariants };
export type { BadgeProps, BadgeVariant };
