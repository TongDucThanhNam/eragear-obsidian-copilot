import type React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import "./button.css";

function classNames(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(" ");
}

type ButtonVariant =
	| "default"
	| "outline"
	| "secondary"
	| "ghost"
	| "destructive"
	| "link";
type ButtonSize =
	| "default"
	| "xs"
	| "sm"
	| "lg"
	| "icon"
	| "icon-xs"
	| "icon-sm"
	| "icon-lg";

const buttonVariants = (config?: {
	variant?: ButtonVariant;
	size?: ButtonSize;
	className?: string;
}): string => {
	const {
		variant = "default",
		size = "default",
		className = "",
	} = config || {};
	return classNames("button", `${variant}`, `size-${size}`, className);
};

interface ButtonProps extends React.ComponentProps<typeof ButtonPrimitive> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	className?: string;
	children?: React.ReactNode;
	title?: string;
	onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

function Button({
	className,
	variant = "default",
	size = "default",
	children,
	title,
	...props
}: ButtonProps) {
	const buttonClass = buttonVariants({ variant, size, className });

	return (
		<button data-slot="button" className={buttonClass} title={title} {...props}>
			{children}
		</button>
	);
}

export { Button, buttonVariants };
export type { ButtonProps };