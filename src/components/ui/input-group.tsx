"use client";

import type * as React from "react";
import {
	type ChangeEvent,
	createContext,
	forwardRef,
	useCallback,
	useContext,
	useEffect,
	useRef,
} from "react";
import { Button } from "./button";
import "./input-group.css";

function classNames(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(" ");
}

// ============================================================================
// Context
// ============================================================================

type InputGroupContextValue = {
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

const InputGroupContext = createContext<InputGroupContextValue | null>(null);

export const useInputGroupContext = () => useContext(InputGroupContext);

// ============================================================================
// InputGroup
// ============================================================================

export type InputGroupProps = React.ComponentProps<"div">;

const InputGroupComponent = forwardRef<HTMLDivElement, InputGroupProps>(
	({ className, children, ...props }, ref) => {
		const textareaRef = useRef<HTMLTextAreaElement | null>(null);

		return (
			<InputGroupContext.Provider value={{ textareaRef }}>
				<div
					ref={ref}
					data-slot="input-group"
					className={classNames("input-group", className)}
					{...props}
				>
					{children}
				</div>
			</InputGroupContext.Provider>
		);
	}
);

InputGroupComponent.displayName = "InputGroup";

// ============================================================================
// InputGroupAddon
// ============================================================================

export type InputGroupAddonAlign = "inline-start" | "inline-end" | "block-start" | "block-end";

export type InputGroupAddonProps = React.ComponentProps<"div"> & {
	align?: InputGroupAddonAlign;
};

const InputGroupAddonComponent = forwardRef<HTMLDivElement, InputGroupAddonProps>(
	({ className, align = "inline-end", ...props }, ref) => {
		return (
			<div
				ref={ref}
				data-slot="input-group-addon"
				data-align={align}
				className={classNames("input-group-addon", className)}
				{...props}
			/>
		);
	}
);

InputGroupAddonComponent.displayName = "InputGroupAddon";

// ============================================================================
// InputGroupButton
// ============================================================================

export type InputGroupButtonProps = {
	variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
	size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
	className?: string;
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
	children?: React.ReactNode;
	onClick?: React.MouseEventHandler<HTMLButtonElement>;
	"aria-label"?: string;
};

const InputGroupButtonComponent = forwardRef<HTMLButtonElement, InputGroupButtonProps>(
	({ className, ...props }, _ref) => {
		return (
			<Button
				data-slot="input-group-button"
				className={classNames("input-group-button", className)}
				{...props}
			/>
		);
	}
);

InputGroupButtonComponent.displayName = "InputGroupButton";

// ============================================================================
// InputGroupTextarea
// ============================================================================

export type InputGroupTextareaProps = React.ComponentProps<"textarea"> & {
	autoResize?: boolean;
	maxHeight?: number;
};

const InputGroupTextareaComponent = forwardRef<HTMLTextAreaElement, InputGroupTextareaProps>(
	({ className, autoResize = true, maxHeight = 192, onChange, ...props }, ref) => {
		const context = useInputGroupContext();
		const internalRef = useRef<HTMLTextAreaElement | null>(null);

		// Merge refs
		const setRefs = useCallback(
			(node: HTMLTextAreaElement | null) => {
				internalRef.current = node;
				if (context?.textareaRef) {
					(context.textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
				}
				if (typeof ref === "function") {
					ref(node);
				} else if (ref) {
					ref.current = node;
				}
			},
			[ref, context?.textareaRef]
		);

		const adjustHeight = useCallback(() => {
			const textarea = internalRef.current;
			if (textarea && autoResize) {
				textarea.style.height = "auto";
				const newHeight = Math.min(textarea.scrollHeight, maxHeight);
				textarea.style.height = `${newHeight}px`;
			}
		}, [autoResize, maxHeight]);

		const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
			adjustHeight();
			onChange?.(e);
		};

		// Initial adjustment
		useEffect(() => {
			adjustHeight();
		}, [adjustHeight]);

		return (
			<textarea
				ref={setRefs}
				data-slot="input-group-textarea"
				className={classNames("input-group-textarea", className)}
				onChange={handleChange}
				rows={1}
				{...props}
			/>
		);
	}
);

InputGroupTextareaComponent.displayName = "InputGroupTextarea";

// ============================================================================
// InputGroupInput (for regular text input)
// ============================================================================

export type InputGroupInputProps = React.ComponentProps<"input">;

const InputGroupInputComponent = forwardRef<HTMLInputElement, InputGroupInputProps>(
	({ className, ...props }, ref) => {
		return (
			<input
				ref={ref}
				data-slot="input-group-input"
				className={classNames("input-group-input", className)}
				{...props}
			/>
		);
	}
);

InputGroupInputComponent.displayName = "InputGroupInput";

// Export named components
export const InputGroup = InputGroupComponent;
export const InputGroupAddon = InputGroupAddonComponent;
export const InputGroupButton = InputGroupButtonComponent;
export const InputGroupTextarea = InputGroupTextareaComponent;
export const InputGroupInput = InputGroupInputComponent;
