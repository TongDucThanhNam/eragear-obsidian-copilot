import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type * as React from "react";
import "./dialog.css";
import { usePortalContainer } from "./portal-provider";

function classNames(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(" ");
}

function Dialog(props: DialogPrimitive.Root.Props) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(props: Omit<DialogPrimitive.Portal.Props, "container">) {
	const portalContainer = usePortalContainer();

	return (
		<DialogPrimitive.Portal
			data-slot="dialog-portal"
			container={portalContainer}
			{...props}
		/>
	);
}

function DialogBackdrop({
	className,
	...props
}: Omit<DialogPrimitive.Backdrop.Props, "className"> & {
	className?: string;
}) {
	return (
		<DialogPrimitive.Backdrop
			data-slot="dialog-backdrop"
			className={classNames("cui-dialog-backdrop", className)}
			{...props}
		/>
	);
}

function DialogViewport({
	className,
	...props
}: Omit<DialogPrimitive.Viewport.Props, "className"> & {
	className?: string;
}) {
	return (
		<DialogPrimitive.Viewport
			data-slot="dialog-viewport"
			className={classNames("cui-dialog-viewport", className)}
			{...props}
		/>
	);
}

function DialogContent({
	className,
	...props
}: Omit<DialogPrimitive.Popup.Props, "className"> & {
	className?: string;
}) {
	return (
		<DialogPrimitive.Popup
			data-slot="dialog-content"
			className={classNames("cui-dialog-content", className)}
			{...props}
		/>
	);
}

function DialogTitle({
	className,
	...props
}: Omit<DialogPrimitive.Title.Props, "className"> & {
	className?: string;
}) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={classNames("cui-dialog-title", className)}
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: Omit<DialogPrimitive.Description.Props, "className"> & {
	className?: string;
}) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={classNames("cui-dialog-description", className)}
			{...props}
		/>
	);
}

function DialogClose(props: DialogPrimitive.Close.Props) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export {
	Dialog,
	DialogBackdrop,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
	DialogViewport,
};

export type DialogContentProps = React.ComponentProps<typeof DialogContent>;
