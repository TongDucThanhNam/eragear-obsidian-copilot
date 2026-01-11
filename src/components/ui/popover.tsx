import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import type * as React from "react";
import "./popover.css";

function classNames(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(" ");
}

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
	return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverPortal({ ...props }: PopoverPrimitive.Portal.Props) {
	return <PopoverPrimitive.Portal data-slot="popover-portal" {...props} />;
}

function PopoverPositioner({
	className,
	...props
}: Omit<PopoverPrimitive.Positioner.Props, 'className'> & { className?: string }) {
	return <PopoverPrimitive.Positioner data-slot="popover-positioner" className={classNames(className)} {...props} />;
}

function PopoverPopup({
	className,
	...props
}: Omit<PopoverPrimitive.Popup.Props, 'className'> & { className?: string }) {
	return <PopoverPrimitive.Popup data-slot="popover-popup" className={classNames(className)} {...props} />;
}

function PopoverViewport({
	className,
	...props
}: Omit<PopoverPrimitive.Viewport.Props, 'className'> & { className?: string }) {
	return <PopoverPrimitive.Viewport data-slot="popover-viewport" className={classNames(className)} {...props} />;
}

function PopoverContent({
	className,
	align = "center",
	alignOffset = 0,
	side = "bottom",
	sideOffset = 4,
	anchor,
	...props
}: Omit<PopoverPrimitive.Popup.Props, 'className'> &
	Pick<
		PopoverPrimitive.Positioner.Props,
		"align" | "alignOffset" | "side" | "sideOffset" | "anchor"
	> & { className?: string }) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Positioner
				align={align}
				alignOffset={alignOffset}
				side={side}
				sideOffset={sideOffset}
				anchor={anchor}
				className="isolate z-50"
			>
				<PopoverPrimitive.Popup
					data-slot="popover-content"
					className={classNames(className)}
					{...props}
				/>
			</PopoverPrimitive.Positioner>
		</PopoverPrimitive.Portal>
	);
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="popover-header"
			className={classNames(className)}
			{...props}
		/>
	);
}

function PopoverTitle({ className, ...props }: Omit<PopoverPrimitive.Title.Props, 'className'> & { className?: string }) {
	return (
		<PopoverPrimitive.Title
			data-slot="popover-title"
			className={classNames(className)}
			{...props}
		/>
	);
}

function PopoverDescription({
	className,
	...props
}: Omit<PopoverPrimitive.Description.Props, 'className'> & { className?: string }) {
	return (
		<PopoverPrimitive.Description
			data-slot="popover-description"
			className={classNames(className)}
			{...props}
		/>
	);
}

export {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader, PopoverPopup, PopoverPortal,
    PopoverPositioner, PopoverTitle,
    PopoverTrigger,
    PopoverViewport
};
