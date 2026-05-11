import { LockKeyIcon } from "@phosphor-icons/react";
import type React from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogBackdrop,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogPortal,
	DialogTitle,
	DialogViewport,
} from "@/components/ui/dialog";
import type { PermissionRequest } from "@/core/models/session-update";
import "./PermissionDialog.css";

export interface PermissionDialogProps {
	request: PermissionRequest;
	onRespond: (optionId: string) => void;
	onDismiss?: () => void;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
	request,
	onRespond,
	onDismiss,
}) => {
	const { title, description, options } = request;

	return (
		<Dialog open={true} onOpenChange={(open) => !open && onDismiss?.()}>
			<DialogPortal>
				<DialogBackdrop />
				<DialogViewport>
					<DialogContent className="permission-dialog">
						<DialogTitle>
							<LockKeyIcon size={22} weight="duotone" aria-hidden="true" />
							{title}
						</DialogTitle>

						{description && (
							<DialogDescription>{description}</DialogDescription>
						)}

						<div className="permission-dialog-options">
							{options.map((option) => {
								const isAllow =
									option.id.toLowerCase().includes("allow") ||
									option.id.toLowerCase().includes("yes") ||
									option.id.toLowerCase().includes("approve");
								const isDeny =
									option.id.toLowerCase().includes("deny") ||
									option.id.toLowerCase().includes("reject") ||
									option.id.toLowerCase().includes("no") ||
									option.id.toLowerCase().includes("cancel");

								return (
									<Button
										type="button"
										key={option.id}
										onClick={() => onRespond(option.id)}
										variant={
											isDeny ? "destructive" : isAllow ? "default" : "secondary"
										}
										className="permission-dialog-option"
										data-default={option.isDefault ? "true" : undefined}
										aria-label={option.label}
									>
										{option.label}
									</Button>
								);
							})}
						</div>

						{onDismiss && (
							<DialogClose
								render={
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="permission-dialog-dismiss"
										aria-label="Cancel and dismiss dialog"
									/>
								}
							>
								Cancel
							</DialogClose>
						)}
					</DialogContent>
				</DialogViewport>
			</DialogPortal>
		</Dialog>
	);
};

export default PermissionDialog;
