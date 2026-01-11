import React, { useState } from "react";
import type { App } from "obsidian";
import { MarkdownTextRenderer } from "./Messages/MarkdownTextRenderer";
import { IconChevronDown } from "../ui/Icons";

interface ThinkingBlockProps {
	content: string;
	app: App;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, app }) => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="reasoning-block">
			<button
				className=""
				onClick={() => setIsOpen(!isOpen)}
				type="button"
			>
				<span className="">Show reasoning</span>
				<div
					className={`reasoning-icon transform transition-transform ${isOpen ? "rotate-180" : ""}`}
				>
					<IconChevronDown />
				</div>
			</button>
			<div
				className={`reasoning-content overflow-hidden transition-[max-height] duration-150 ease-out ${isOpen ? "open" : ""}`}
				style={{ maxHeight: isOpen ? "1000px" : "0px" }}
			>
				<div className="reasoning-inner ml-2 border-l-2 border-l-slate-200 px-2 pb-1 dark:border-l-slate-700">
					<div className="text-muted-foreground prose prose-sm dark:prose-invert">
						<MarkdownTextRenderer text={content} app={app} />
					</div>
				</div>
			</div>
		</div>
	);
};
