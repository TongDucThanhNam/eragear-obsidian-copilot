import { useState } from "react";
import {
	BUILTIN_CHAT_MODELS,
	type ChatModelConfig,
	type ProviderType,
} from "../../../settings";

interface ChatModelsTableProps {
	chatModels: ChatModelConfig[];
	onUpdate: (models: ChatModelConfig[]) => Promise<void>;
}

// Icons
const IconEdit = () => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		aria-hidden="true"
	>
		<title>Edit</title>
		<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
		<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
	</svg>
);

const IconTrash = () => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		aria-hidden="true"
	>
		<title>Delete</title>
		<polyline points="3 6 5 6 21 6" />
		<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
	</svg>
);

const IconPlus = () => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		aria-hidden="true"
	>
		<title>Add</title>
		<line x1="12" y1="5" x2="12" y2="19" />
		<line x1="5" y1="12" x2="19" y2="12" />
	</svg>
);

const IconRefresh = () => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		aria-hidden="true"
	>
		<title>Refresh</title>
		<polyline points="23 4 23 10 17 10" />
		<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
	</svg>
);

const providerLabels: Record<ProviderType, string> = {
	openai: "OpenAI",
	gemini: "Gemini",
	deepseek: "DeepSeek",
	openrouter: "OpenRouter",
	anthropic: "Anthropic",
	acp: "ACP Agent",
};

const providerColors: Record<ProviderType, string> = {
	openai: "#10a37f",
	gemini: "#4285f4",
	deepseek: "#0066ff",
	openrouter: "#6366f1",
	anthropic: "#d97757",
	acp: "#8b5cf6",
};

interface EditModalProps {
	model: ChatModelConfig | null;
	isNew: boolean;
	onSave: (model: ChatModelConfig) => void;
	onCancel: () => void;
}

const EditModal: React.FC<EditModalProps> = ({
	model,
	isNew,
	onSave,
	onCancel,
}) => {
	const [formData, setFormData] = useState<ChatModelConfig>(
		model || {
			id: `custom-${Date.now()}`,
			name: "",
			provider: "openai",
			type: "api",
			model: "",
			enabled: true,
			isBuiltIn: false,
		},
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave(formData);
	};

	return (
		<div className="eragear-modal-overlay" onClick={onCancel}>
			<div
				className="eragear-modal"
				onClick={(e) => e.stopPropagation()}
				style={{
					background: "var(--background-primary)",
					borderRadius: "8px",
					padding: "20px",
					maxWidth: "500px",
					width: "100%",
					border: "1px solid var(--background-modifier-border)",
				}}
			>
				<h3 style={{ marginTop: 0 }}>
					{isNew ? "Add New Model/Agent" : "Edit Model/Agent"}
				</h3>
				<form onSubmit={handleSubmit}>
					<div style={{ marginBottom: "12px" }}>
						<label style={{ display: "block", marginBottom: "4px" }}>
							Type
						</label>
						<select
							value={formData.type}
							onChange={(e) =>
								setFormData({
									...formData,
									type: e.target.value as "api" | "agent",
									provider: e.target.value === "agent" ? "acp" : "openai",
								})
							}
							style={{ width: "100%" }}
						>
							<option value="api">API Model</option>
							<option value="agent">ACP Agent</option>
						</select>
					</div>

					<div style={{ marginBottom: "12px" }}>
						<label style={{ display: "block", marginBottom: "4px" }}>
							Name
						</label>
						<input
							type="text"
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							placeholder="My Custom Model"
							style={{ width: "100%" }}
							required
						/>
					</div>

					{formData.type === "api" && (
						<>
							<div style={{ marginBottom: "12px" }}>
								<label style={{ display: "block", marginBottom: "4px" }}>
									Provider
								</label>
								<select
									value={formData.provider}
									onChange={(e) =>
										setFormData({
											...formData,
											provider: e.target.value as ProviderType,
										})
									}
									style={{ width: "100%" }}
								>
									<option value="openai">OpenAI</option>
									<option value="gemini">Google Gemini</option>
									<option value="deepseek">DeepSeek</option>
									<option value="openrouter">OpenRouter</option>
									<option value="anthropic">Anthropic</option>
								</select>
							</div>

							<div style={{ marginBottom: "12px" }}>
								<label style={{ display: "block", marginBottom: "4px" }}>
									Model ID
								</label>
								<input
									type="text"
									value={formData.model || ""}
									onChange={(e) =>
										setFormData({ ...formData, model: e.target.value })
									}
									placeholder="gpt-4o"
									style={{ width: "100%" }}
								/>
							</div>

							<div style={{ marginBottom: "12px" }}>
								<label style={{ display: "block", marginBottom: "4px" }}>
									API Key (optional, overrides global)
								</label>
								<input
									type="password"
									value={formData.apiKey || ""}
									onChange={(e) =>
										setFormData({ ...formData, apiKey: e.target.value })
									}
									placeholder="sk-..."
									style={{ width: "100%" }}
								/>
							</div>

							<div style={{ marginBottom: "12px" }}>
								<label style={{ display: "block", marginBottom: "4px" }}>
									Base URL (optional)
								</label>
								<input
									type="text"
									value={formData.baseUrl || ""}
									onChange={(e) =>
										setFormData({ ...formData, baseUrl: e.target.value })
									}
									placeholder="https://api.openai.com/v1"
									style={{ width: "100%" }}
								/>
							</div>
						</>
					)}

					{formData.type === "agent" && (
						<>
							<div style={{ marginBottom: "12px" }}>
								<label style={{ display: "block", marginBottom: "4px" }}>
									Command
								</label>
								<input
									type="text"
									value={formData.command || ""}
									onChange={(e) =>
										setFormData({ ...formData, command: e.target.value })
									}
									placeholder="claude"
									style={{ width: "100%" }}
									required
								/>
							</div>

							<div style={{ marginBottom: "12px" }}>
								<label style={{ display: "block", marginBottom: "4px" }}>
									Arguments
								</label>
								<input
									type="text"
									value={formData.args || ""}
									onChange={(e) =>
										setFormData({ ...formData, args: e.target.value })
									}
									placeholder="--acp"
									style={{ width: "100%" }}
								/>
							</div>

							<div style={{ marginBottom: "12px" }}>
								<label style={{ display: "block", marginBottom: "4px" }}>
									Working Directory
								</label>
								<input
									type="text"
									value={formData.workingDir || ""}
									onChange={(e) =>
										setFormData({ ...formData, workingDir: e.target.value })
									}
									placeholder="/path/to/project"
									style={{ width: "100%" }}
								/>
							</div>

							<div style={{ marginBottom: "12px" }}>
								<label style={{ display: "block", marginBottom: "4px" }}>
									Node.js Path (optional)
								</label>
								<input
									type="text"
									value={formData.nodePath || ""}
									onChange={(e) =>
										setFormData({ ...formData, nodePath: e.target.value })
									}
									placeholder="/usr/local/bin/node"
									style={{ width: "100%" }}
								/>
							</div>
						</>
					)}

					<div
						style={{
							display: "flex",
							gap: "8px",
							justifyContent: "flex-end",
							marginTop: "16px",
						}}
					>
						<button type="button" onClick={onCancel}>
							Cancel
						</button>
						<button type="submit" className="mod-cta">
							{isNew ? "Add" : "Save"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export const ChatModelsTable: React.FC<ChatModelsTableProps> = ({
	chatModels,
	onUpdate,
}) => {
	const [editingModel, setEditingModel] = useState<ChatModelConfig | null>(
		null,
	);
	const [isAddingNew, setIsAddingNew] = useState(false);

	const handleToggleEnabled = async (id: string) => {
		const updated = chatModels.map((m) =>
			m.id === id ? { ...m, enabled: !m.enabled } : m,
		);
		await onUpdate(updated);
	};

	const handleToggleCORS = async (id: string) => {
		const updated = chatModels.map((m) =>
			m.id === id ? { ...m, useCORS: !m.useCORS } : m,
		);
		await onUpdate(updated);
	};

	const handleDelete = async (id: string) => {
		const model = chatModels.find((m) => m.id === id);
		if (model?.isBuiltIn) {
			// For built-in, just disable instead of delete
			await handleToggleEnabled(id);
			return;
		}
		const updated = chatModels.filter((m) => m.id !== id);
		await onUpdate(updated);
	};

	const handleSaveEdit = async (model: ChatModelConfig) => {
		let updated: ChatModelConfig[];
		if (isAddingNew) {
			updated = [...chatModels, model];
		} else {
			updated = chatModels.map((m) => (m.id === model.id ? model : m));
		}
		await onUpdate(updated);
		setEditingModel(null);
		setIsAddingNew(false);
	};

	const handleRefreshBuiltIns = async () => {
		// Merge built-in models with user models
		const userModels = chatModels.filter((m) => !m.isBuiltIn);
		const existingBuiltInIds = chatModels
			.filter((m) => m.isBuiltIn)
			.map((m) => m.id);

		// Keep user's enabled state for existing built-ins
		const refreshedBuiltIns = BUILTIN_CHAT_MODELS.map((builtIn) => {
			const existing = chatModels.find((m) => m.id === builtIn.id);
			if (existing) {
				return { ...builtIn, enabled: existing.enabled };
			}
			return builtIn;
		});

		await onUpdate([...refreshedBuiltIns, ...userModels]);
	};

	// Separate API models and agents
	const apiModels = chatModels.filter((m) => m.type === "api");
	const agents = chatModels.filter((m) => m.type === "agent");

	return (
		<div className="eragear-chat-models">
			{/* Header */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "16px",
				}}
			>
				<h3 style={{ margin: 0 }}>Chat Models & Agents</h3>
				<div style={{ display: "flex", gap: "8px" }}>
					<button
						onClick={handleRefreshBuiltIns}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
						title="Refresh built-in models"
					>
						<IconRefresh /> Refresh Built-ins
					</button>
					<button
						onClick={() => {
							setIsAddingNew(true);
							setEditingModel(null);
						}}
						className="mod-cta"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<IconPlus /> Add Model
					</button>
				</div>
			</div>

			{/* API Models Table */}
			<div style={{ marginBottom: "24px" }}>
				<h4 style={{ marginBottom: "8px", color: "var(--text-muted)" }}>
					API Models
				</h4>
				<div
					style={{
						border: "1px dashed var(--background-modifier-border)",
						borderRadius: "8px",
						overflow: "hidden",
					}}
				>
					<table
						style={{
							width: "100%",
							borderCollapse: "collapse",
							fontSize: "0.9rem",
						}}
					>
						<thead>
							<tr
								style={{
									background: "var(--background-secondary)",
									borderBottom: "1px solid var(--background-modifier-border)",
								}}
							>
								<th style={{ padding: "10px", textAlign: "left" }}>Model</th>
								<th style={{ padding: "10px", textAlign: "left" }}>Provider</th>
								<th style={{ padding: "10px", textAlign: "center" }}>
									Capabilities
								</th>
								<th style={{ padding: "10px", textAlign: "center" }}>Enable</th>
								<th style={{ padding: "10px", textAlign: "center" }}>CORS</th>
								<th style={{ padding: "10px", textAlign: "center" }}>
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{apiModels.map((model) => (
								<tr
									key={model.id}
									style={{
										borderBottom: "1px solid var(--background-modifier-border)",
										opacity: model.enabled ? 1 : 0.5,
									}}
								>
									<td style={{ padding: "10px" }}>
										<div>
											<strong>{model.name}</strong>
											{model.isBuiltIn && (
												<span
													style={{
														fontSize: "0.7rem",
														background: "var(--background-modifier-border)",
														padding: "2px 4px",
														borderRadius: "4px",
														marginLeft: "6px",
													}}
												>
													Built-in
												</span>
											)}
										</div>
										<div
											style={{
												fontSize: "0.8rem",
												color: "var(--text-muted)",
											}}
										>
											{model.model}
										</div>
									</td>
									<td style={{ padding: "10px" }}>
										<span
											style={{
												background: providerColors[model.provider],
												color: "white",
												padding: "2px 8px",
												borderRadius: "12px",
												fontSize: "0.75rem",
											}}
										>
											{providerLabels[model.provider]}
										</span>
									</td>
									<td style={{ padding: "10px", textAlign: "center" }}>
										<div
											style={{
												display: "flex",
												gap: "4px",
												justifyContent: "center",
											}}
										>
											{model.capabilities?.streaming && (
												<span title="Streaming">⚡</span>
											)}
											{model.capabilities?.vision && (
												<span title="Vision">👁️</span>
											)}
											{model.capabilities?.functionCalling && (
												<span title="Function Calling">🔧</span>
											)}
										</div>
									</td>
									<td style={{ padding: "10px", textAlign: "center" }}>
										<input
											type="checkbox"
											checked={model.enabled}
											onChange={() => handleToggleEnabled(model.id)}
										/>
									</td>
									<td style={{ padding: "10px", textAlign: "center" }}>
										<input
											type="checkbox"
											checked={model.useCORS || false}
											onChange={() => handleToggleCORS(model.id)}
										/>
									</td>
									<td style={{ padding: "10px", textAlign: "center" }}>
										<div
											style={{
												display: "flex",
												gap: "4px",
												justifyContent: "center",
											}}
										>
											<button
												onClick={() => {
													setEditingModel(model);
													setIsAddingNew(false);
												}}
												style={{ padding: "4px 8px" }}
												title="Edit"
											>
												<IconEdit />
											</button>
											{!model.isBuiltIn && (
												<button
													onClick={() => handleDelete(model.id)}
													style={{
														padding: "4px 8px",
														color: "var(--text-error)",
													}}
													title="Delete"
												>
													<IconTrash />
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Agents Table */}
			<div>
				<h4 style={{ marginBottom: "8px", color: "var(--text-muted)" }}>
					ACP Agents
				</h4>
				<div
					style={{
						border: "1px dashed var(--background-modifier-border)",
						borderRadius: "8px",
						overflow: "hidden",
					}}
				>
					<table
						style={{
							width: "100%",
							borderCollapse: "collapse",
							fontSize: "0.9rem",
						}}
					>
						<thead>
							<tr
								style={{
									background: "var(--background-secondary)",
									borderBottom: "1px solid var(--background-modifier-border)",
								}}
							>
								<th style={{ padding: "10px", textAlign: "left" }}>Agent</th>
								<th style={{ padding: "10px", textAlign: "left" }}>Command</th>
								<th style={{ padding: "10px", textAlign: "center" }}>Enable</th>
								<th style={{ padding: "10px", textAlign: "center" }}>
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{agents.map((agent) => (
								<tr
									key={agent.id}
									style={{
										borderBottom: "1px solid var(--background-modifier-border)",
										opacity: agent.enabled ? 1 : 0.5,
									}}
								>
									<td style={{ padding: "10px" }}>
										<div>
											<strong>{agent.name}</strong>
											{agent.isBuiltIn && (
												<span
													style={{
														fontSize: "0.7rem",
														background: "var(--background-modifier-border)",
														padding: "2px 4px",
														borderRadius: "4px",
														marginLeft: "6px",
													}}
												>
													Built-in
												</span>
											)}
										</div>
									</td>
									<td style={{ padding: "10px" }}>
										<code
											style={{
												background: "var(--background-secondary)",
												padding: "2px 6px",
												borderRadius: "4px",
												fontSize: "0.85rem",
											}}
										>
											{agent.command} {agent.args}
										</code>
									</td>
									<td style={{ padding: "10px", textAlign: "center" }}>
										<input
											type="checkbox"
											checked={agent.enabled}
											onChange={() => handleToggleEnabled(agent.id)}
										/>
									</td>
									<td style={{ padding: "10px", textAlign: "center" }}>
										<div
											style={{
												display: "flex",
												gap: "4px",
												justifyContent: "center",
											}}
										>
											<button
												onClick={() => {
													setEditingModel(agent);
													setIsAddingNew(false);
												}}
												style={{ padding: "4px 8px" }}
												title="Edit"
											>
												<IconEdit />
											</button>
											{!agent.isBuiltIn && (
												<button
													onClick={() => handleDelete(agent.id)}
													style={{
														padding: "4px 8px",
														color: "var(--text-error)",
													}}
													title="Delete"
												>
													<IconTrash />
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Edit Modal */}
			{(editingModel || isAddingNew) && (
				<EditModal
					model={editingModel}
					isNew={isAddingNew}
					onSave={handleSaveEdit}
					onCancel={() => {
						setEditingModel(null);
						setIsAddingNew(false);
					}}
				/>
			)}
		</div>
	);
};
