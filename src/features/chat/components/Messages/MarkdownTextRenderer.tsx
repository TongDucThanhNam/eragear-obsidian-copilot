import * as React from "react";
const { useRef, useEffect } = React;
import { Component, MarkdownRenderer, type App } from "obsidian";

interface MarkdownTextRendererProps {
	text: string;
	app: App;
}

function getCodeLanguage(codeEl: HTMLElement): string {
	const languageClass = Array.from(codeEl.classList).find((className) =>
		className.startsWith("language-"),
	);

	return languageClass?.replace("language-", "") || "text";
}

function enhanceCodeBlocks(containerEl: HTMLElement, component: Component): void {
	const codeBlocks = Array.from(containerEl.querySelectorAll("pre > code"));

	for (const codeEl of codeBlocks) {
		const preEl = codeEl.parentElement;
		if (!(preEl instanceof HTMLPreElement)) continue;
		if (preEl.closest(".eragear-code-block")) continue;

		const language = getCodeLanguage(codeEl as HTMLElement);
		const wrapperEl = document.createElement("div");
		wrapperEl.className = "eragear-code-block";

		const headerEl = document.createElement("div");
		headerEl.className = "eragear-code-block-header";

		const languageEl = document.createElement("span");
		languageEl.className = "eragear-code-block-language";
		languageEl.textContent = language;

		const copyButtonEl = document.createElement("button");
		copyButtonEl.className = "eragear-code-block-copy";
		copyButtonEl.type = "button";
		copyButtonEl.textContent = "Copy";
		copyButtonEl.setAttribute("aria-label", `Copy ${language} code`);

		headerEl.append(languageEl, copyButtonEl);

		preEl.parentNode?.insertBefore(wrapperEl, preEl);
		wrapperEl.append(headerEl, preEl);

		component.registerDomEvent(copyButtonEl, "click", () => {
			void navigator.clipboard.writeText(codeEl.textContent ?? "");
		});
	}
}

export function MarkdownTextRenderer({ text, app }: MarkdownTextRendererProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		el.empty?.();
		el.classList.add("markdown-rendered");
		let isCancelled = false;

		// Create a temporary component for the markdown renderer lifecycle
		const component = new Component();
		component.load();

		// Render markdown
		void MarkdownRenderer.render(app, text, el, "", component)
			.then(() => {
				if (!isCancelled) {
					enhanceCodeBlocks(el, component);
				}
			})
			.catch(() => undefined);

		return () => {
			isCancelled = true;
			component.unload();
		};
	}, [text, app]);

	return <div ref={containerRef} className="markdown-text-renderer" />;
}
