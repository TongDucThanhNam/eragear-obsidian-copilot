/**
 * UI Components Index
 *
 * Exports all UI components for easy importing.
 * Feature components should import from this file, not from @base-ui/react/*.
 */

export { Button, type ButtonProps } from "./button";
export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "./dropdown-menu";
export {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverPopup,
	PopoverPortal,
	PopoverPositioner,
	PopoverTitle,
	PopoverTrigger,
	PopoverViewport,
} from "./popover";
export { PortalProvider, usePortalContainer } from "./portal-provider";
