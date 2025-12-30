import type React from "react";
import { Dialog } from "@base-ui/react/dialog";
import type { PermissionRequest } from "../../../../domain/models/session-update";

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
		<Dialog.Root open={true} onOpenChange={(open) => !open && onDismiss?.()}>
			<Dialog.Portal>
				<Dialog.Backdrop className="permission-dialog-backdrop" />
				<Dialog.Viewport className="permission-dialog-viewport">
					<Dialog.Popup className="permission-dialog-popup">
						<Dialog.Title className="permission-dialog-title">
							<span style={{ fontSize: "1.4rem" }}>🔐</span>
							{title}
						</Dialog.Title>

						{description && (
							<Dialog.Description className="permission-dialog-description">
								{description}
							</Dialog.Description>
						)}

						<div className="permission-options">
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
									<button
										key={option.id}
										type="button"
										onClick={() => onRespond(option.id)}
										className={`test-btn ${isAllow ? "test-btn-primary" : "test-btn-secondary"} ${isDeny ? "test-btn-danger" : ""}`}
										style={{
											width: "100%",
											justifyContent: "center",
											fontWeight: option.isDefault ? 700 : 500,
										}}
									>
										{option.label}
									</button>
								);
							})}
						</div>

						{onDismiss && (
							<Dialog.Close
								className="test-btn test-btn-small"
								style={{
									border: "none",
									background: "none",
									color: "var(--text-muted)",
									marginTop: "4px",
								}}
							>
								Cancel
							</Dialog.Close>
						)}
					</Dialog.Popup>
				</Dialog.Viewport>
			</Dialog.Portal>
		</Dialog.Root>
	);
};

export default PermissionDialog;
