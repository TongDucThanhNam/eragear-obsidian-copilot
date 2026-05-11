import type React from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import "./collapsible.css";

function classNames(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(" ");
}

interface CollapsibleProps {
	children: React.ReactNode;
	className?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	defaultOpen?: boolean;
	disabled?: boolean;
}

interface CollapsibleRootProps extends CollapsibleProps {
	asChild?: never;
}

function CollapsibleRoot({
	className,
	children,
	open,
	onOpenChange,
	defaultOpen,
	disabled,
	...props
}: CollapsibleRootProps) {
	const collapsibleClass = classNames("collapsible", className);

	return (
		<Collapsible.Root
			className={collapsibleClass}
			open={open}
			onOpenChange={onOpenChange}
			defaultOpen={defaultOpen}
			disabled={disabled}
			{...props}
		>
			{children}
		</Collapsible.Root>
	);
}

interface CollapsibleTriggerProps {
	children: React.ReactNode;
	className?: string;
	asChild?: boolean;
}

function CollapsibleTrigger({
	className,
	children,
	asChild = true,
	...props
}: CollapsibleTriggerProps) {
	const triggerClass = classNames("collapsible-trigger", className);

	return (
		<Collapsible.Trigger className={triggerClass} {...props}>
			{children}
		</Collapsible.Trigger>
	);
}

interface CollapsiblePanelProps {
	children: React.ReactNode;
	className?: string;
	hidden?: boolean;
}

function CollapsiblePanel({ className, children, hidden, ...props }: CollapsiblePanelProps) {
	const panelClass = classNames("collapsible-panel", className);

	return (
		<Collapsible.Panel className={panelClass} hidden={hidden} {...props}>
			{children}
		</Collapsible.Panel>
	);
}

export { CollapsibleRoot, CollapsibleTrigger, CollapsiblePanel };
export type { CollapsibleProps, CollapsibleTriggerProps, CollapsiblePanelProps };
