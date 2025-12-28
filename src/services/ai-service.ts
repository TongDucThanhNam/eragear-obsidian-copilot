import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Notice } from "obsidian";
import { AIProviderType, type MyPluginSettings } from "../settings";

export class AIService {
	private settings: MyPluginSettings;

	constructor(settings: MyPluginSettings) {
		this.settings = settings;
	}

	async streamChat(messages: any[]) {
		let model;

		switch (this.settings.provider) {
			case AIProviderType.BYOK_OPENAI:
				if (!this.settings.openaiApiKey) {
					new Notice(
						"Missing OpenAI API Key. Please configure it in settings.",
					);
					throw new Error("Missing OpenAI API Key");
				}
				const openai = createOpenAI({
					apiKey: this.settings.openaiApiKey,
				});
				model = openai("gpt-4o");
				break;

			case AIProviderType.BYOK_GEMINI:
				if (!this.settings.geminiApiKey) {
					new Notice(
						"Missing Gemini API Key. Please configure it in settings.",
					);
					throw new Error("Missing Gemini API Key");
				}
				const google = createGoogleGenerativeAI({
					apiKey: this.settings.geminiApiKey,
				});
				model = google("gemini-1.5-flash");
				break;

			case AIProviderType.ERAGEAR_CLOUD:
				new Notice(
					"Eragear Cloud is not implemented yet. Please switch to BYOK.",
				);
				throw new Error("Feature not available");

			default:
				throw new Error("Invalid Provider");
		}

		try {
			const result = await streamText({
				model: model,
				messages: messages,
			});
			return result;
		} catch (error) {
			console.error("AI Error:", error);
			new Notice("AI Generation Failed. Check console for details.");
			throw error;
		}
	}
}
