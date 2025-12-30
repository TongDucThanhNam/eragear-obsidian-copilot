import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import "./badge.css";

function classNames(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(" ");
}

function Badge({
	className,
	variant = "default",
	render,
	...props
}: useRender.ComponentProps<"span"> & {
	variant?:
		| "default"
		| "secondary"
		| "destructive"
		| "outline"
		| "ghost"
		| "link";
}) {
	return useRender({
		defaultTagName: "span",
		props: mergeProps<"span">(
			{
				className: classNames(className),
				"data-slot": "badge",
				"data-variant": variant,
			},
			props,
		),
		render,
	});
}

function badgeVariants(
	variant:
		| "default"
		| "secondary"
		| "destructive"
		| "outline"
		| "ghost"
		| "link" = "default",
) {
	return `badge badge-${variant}`;
}

export { Badge, badgeVariants };
