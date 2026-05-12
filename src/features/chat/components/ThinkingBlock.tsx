import React, { useId, useState } from "react";
import type { App } from "obsidian";
import { MarkdownTextRenderer } from "./Messages/MarkdownTextRenderer";
import { IconChevronDown } from "@/components/ui/Icons";

interface ThinkingBlockProps {
	content: string;
	app: App;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, app }) => {
	const [isOpen, setIsOpen] = useState(false);
	const contentId = useId();

	return (
		<div className="reasoning-block" data-open={isOpen ? "" : undefined}>
			<button
				aria-controls={contentId}
				aria-expanded={isOpen}
				aria-label={isOpen ? "Hide reasoning" : "Show reasoning"}
				className="reasoning-trigger"
				onClick={() => setIsOpen(!isOpen)}
				type="button"
			>
				<span className="reasoning-title">Reasoning</span>
				<span className="reasoning-state">{isOpen ? "Hide" : "Show"}</span>
				<span className="reasoning-icon" aria-hidden="true">
					<IconChevronDown />
				</span>
			</button>
			{isOpen && (
				<div className="reasoning-content" id={contentId}>
					<div className="reasoning-inner">
						<MarkdownTextRenderer text={content} app={app} />
					</div>
				</div>
			)}
		</div>
	);
};
