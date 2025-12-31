"use client";

import type * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { useCallback, useState } from "react";
import "./hover-card.css";

function classNames(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(" ");
}

// ============================================================================
// HoverCard - Uses Popover with hover behavior implemented via React state
// ============================================================================

export type HoverCardProps = {
	children: React.ReactNode;
	openDelay?: number;
	closeDelay?: number;
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
};

export function HoverCard({
	children,
	openDelay: _openDelay = 200,
	closeDelay: _closeDelay = 150,
	defaultOpen = false,
	open: controlledOpen,
	onOpenChange,
}: HoverCardProps) {
	const [internalOpen, setInternalOpen] = useState(defaultOpen);
	const isControlled = controlledOpen !== undefined;
	const isOpen = isControlled ? controlledOpen : internalOpen;

	const handleOpenChange = useCallback(
		(newOpen: boolean) => {
			if (!isControlled) {
				setInternalOpen(newOpen);
			}
			onOpenChange?.(newOpen);
		},
		[isControlled, onOpenChange]
	);

	return (
		<PopoverPrimitive.Root
			data-slot="hover-card"
			open={isOpen}
			onOpenChange={handleOpenChange}
		>
			{children}
		</PopoverPrimitive.Root>
	);
}

// ============================================================================
// HoverCardTrigger
// ============================================================================

export type HoverCardTriggerProps = PopoverPrimitive.Trigger.Props;

export function HoverCardTrigger({ ...props }: HoverCardTriggerProps) {
	return <PopoverPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

// ============================================================================
// HoverCardContent
// ============================================================================

export type HoverCardContentProps = Omit<PopoverPrimitive.Popup.Props, 'className'> &
	Pick<
		PopoverPrimitive.Positioner.Props,
		"align" | "alignOffset" | "side" | "sideOffset"
	> & {
		className?: string;
	};

export function HoverCardContent({
	className,
	align = "center",
	alignOffset = 0,
	side = "bottom",
	sideOffset = 4,
	...props
}: HoverCardContentProps) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Positioner
				align={align}
				alignOffset={alignOffset}
				side={side}
				sideOffset={sideOffset}
				className="isolate z-50"
			>
				<PopoverPrimitive.Popup
					data-slot="hover-card-content"
					className={classNames("hover-card-content", className)}
					{...props}
				/>
			</PopoverPrimitive.Positioner>
		</PopoverPrimitive.Portal>
	);
}
