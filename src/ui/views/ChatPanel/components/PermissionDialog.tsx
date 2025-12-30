import type React from "react";
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
		<div
			className="permission-dialog-overlay"
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: "rgba(0, 0, 0, 0.5)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1000,
			}}
		>
			<div
				className="permission-dialog"
				style={{
					backgroundColor: "var(--background-primary)",
					borderRadius: "8px",
					padding: "20px",
					maxWidth: "400px",
					width: "90%",
					boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
					border: "1px solid var(--background-modifier-border)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "10px",
						marginBottom: "12px",
					}}
				>
					<span style={{ fontSize: "1.5rem" }}>🔐</span>
					<h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
						{title}
					</h3>
				</div>
				{description && (
					<p
						style={{
							margin: "0 0 16px 0",
							fontSize: "0.9rem",
							color: "var(--text-muted)",
						}}
					>
						{description}
					</p>
				)}
				<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
					{options.map((option) => {
						const isAllow = option.id.includes("allow");
						const isDeny =
							option.id.includes("deny") || option.id.includes("reject");
						return (
							<button
								key={option.id}
								type="button"
								onClick={() => onRespond(option.id)}
								style={{
									padding: "10px 16px",
									borderRadius: "6px",
									border: "1px solid var(--background-modifier-border)",
									backgroundColor: isAllow
										? "var(--interactive-accent)"
										: isDeny
											? "var(--background-secondary)"
											: "var(--background-secondary)",
									color: isAllow ? "white" : "var(--text-normal)",
									fontSize: "0.9rem",
									fontWeight: option.isDefault ? 600 : 400,
									cursor: "pointer",
								}}
							>
								{option.label}
							</button>
						);
					})}
				</div>
				{onDismiss && (
					<button
						type="button"
						onClick={onDismiss}
						style={{
							marginTop: "12px",
							padding: "8px",
							width: "100%",
							background: "none",
							border: "none",
							color: "var(--text-muted)",
							cursor: "pointer",
							fontSize: "0.85rem",
						}}
					>
						Cancel
					</button>
				)}
			</div>
		</div>
	);
};

export default PermissionDialog;
