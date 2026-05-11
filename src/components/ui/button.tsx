import React from "react";
import "./button-new.css";

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
	return classNames(
		"cui-button",
		`cui-button-variant-${variant}`,
		`cui-button-size-${size}`,
		className,
	);
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	className?: string;
	children?: React.ReactNode;
	title?: string;
	asChild?: boolean;
	render?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant = "default",
			size = "default",
			children,
			title,
			asChild,
			render,
			...props
		},
		ref,
	) => {
		const buttonClass = buttonVariants({ variant, size, className });

		if (asChild && React.isValidElement(render)) {
			return React.cloneElement(render as React.ReactElement<any>, {
				...props,
				className: classNames(
					buttonClass,
					(render as React.ReactElement<any>).props.className,
				),
				ref,
			});
		}

		return (
			<button
				data-slot="button"
				className={buttonClass}
				title={title}
				ref={ref}
				{...props}
			>
				{children}
			</button>
		);
	},
);

Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
