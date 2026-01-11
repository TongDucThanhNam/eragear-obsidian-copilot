"use client";

import type * as React from "react";
import {
	type ChangeEvent,
	type ChangeEventHandler,
	Children,
	type ClipboardEventHandler,
	type ComponentProps,
	createContext,
	type FormEvent,
	type FormEventHandler,
	Fragment,
	type HTMLAttributes,
	type KeyboardEventHandler,
	type PropsWithChildren,
	type ReactNode,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "../ui/hover-card";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "../ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "../ui/command";
import {
	IconCornerDownLeft,
	IconMic,
	IconPlus,
	IconFileText,
	IconX,
	IconSquare,
} from "../ui/Icons";
import "./PromptInput.css";

// ============================================================================
// Utils
// ============================================================================

function classNames(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(" ");
}

function nanoid(size = 21): string {
	const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	let id = "";
	for (let i = 0; i < size; i++) {
		id += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return id;
}

// ============================================================================
// Types
// ============================================================================

export type FileUIPart = {
	type: "file";
	url: string;
	mediaType: string;
	filename?: string;
};

export type ChatStatus = "idle" | "submitted" | "streaming" | "error";

// ============================================================================
// Provider Context & Types
// ============================================================================

export type AttachmentsContext = {
	files: (FileUIPart & { id: string })[];
	add: (files: File[] | FileList) => void;
	remove: (id: string) => void;
	clear: () => void;
	openFileDialog: () => void;
	fileInputRef: RefObject<HTMLInputElement | null>;
};

export type TextInputContext = {
	value: string;
	setInput: (v: string) => void;
	clear: () => void;
};

export type PromptInputControllerProps = {
	textInput: TextInputContext;
	attachments: AttachmentsContext;
	__registerFileInput: (
		ref: RefObject<HTMLInputElement | null>,
		open: () => void
	) => void;
};

const PromptInputController = createContext<PromptInputControllerProps | null>(null);
const ProviderAttachmentsContext = createContext<AttachmentsContext | null>(null);

export const usePromptInputController = () => {
	const ctx = useContext(PromptInputController);
	if (!ctx) {
		throw new Error("Wrap your component inside <PromptInputProvider> to use usePromptInputController().");
	}
	return ctx;
};

const useOptionalPromptInputController = () => useContext(PromptInputController);

export const useProviderAttachments = () => {
	const ctx = useContext(ProviderAttachmentsContext);
	if (!ctx) {
		throw new Error("Wrap your component inside <PromptInputProvider> to use useProviderAttachments().");
	}
	return ctx;
};

const useOptionalProviderAttachments = () => useContext(ProviderAttachmentsContext);

// ============================================================================
// PromptInputProvider
// ============================================================================

export type PromptInputProviderProps = PropsWithChildren<{
	initialInput?: string;
}>;

export function PromptInputProvider({
	initialInput = "",
	children,
}: PromptInputProviderProps) {
	const [textInput, setTextInput] = useState(initialInput);
	const clearInput = useCallback(() => setTextInput(""), []);

	const [attachmentFiles, setAttachmentFiles] = useState<(FileUIPart & { id: string })[]>([]);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const openRef = useRef<() => void>(() => {});

	const add = useCallback((files: File[] | FileList) => {
		const incoming = Array.from(files);
		if (incoming.length === 0) return;

		setAttachmentFiles((prev) =>
			prev.concat(
				incoming.map((file) => ({
					id: nanoid(),
					type: "file" as const,
					url: URL.createObjectURL(file),
					mediaType: file.type,
					filename: file.name,
				}))
			)
		);
	}, []);

	const remove = useCallback((id: string) => {
		setAttachmentFiles((prev) => {
			const found = prev.find((f) => f.id === id);
			if (found?.url) URL.revokeObjectURL(found.url);
			return prev.filter((f) => f.id !== id);
		});
	}, []);

	const clear = useCallback(() => {
		setAttachmentFiles((prev) => {
			for (const f of prev) {
				if (f.url) URL.revokeObjectURL(f.url);
			}
			return [];
		});
	}, []);

	const attachmentsRef = useRef(attachmentFiles);
	attachmentsRef.current = attachmentFiles;

	useEffect(() => {
		return () => {
			for (const f of attachmentsRef.current) {
				if (f.url) URL.revokeObjectURL(f.url);
			}
		};
	}, []);

	const openFileDialog = useCallback(() => {
		openRef.current?.();
	}, []);

	const attachments = useMemo<AttachmentsContext>(
		() => ({
			files: attachmentFiles,
			add,
			remove,
			clear,
			openFileDialog,
			fileInputRef,
		}),
		[attachmentFiles, add, remove, clear, openFileDialog]
	);

	const __registerFileInput = useCallback(
		(ref: RefObject<HTMLInputElement | null>, open: () => void) => {
			fileInputRef.current = ref.current;
			openRef.current = open;
		},
		[]
	);

	const controller = useMemo<PromptInputControllerProps>(
		() => ({
			textInput: {
				value: textInput,
				setInput: setTextInput,
				clear: clearInput,
			},
			attachments,
			__registerFileInput,
		}),
		[textInput, clearInput, attachments, __registerFileInput]
	);

	return (
		<PromptInputController.Provider value={controller}>
			<ProviderAttachmentsContext.Provider value={attachments}>
				{children}
			</ProviderAttachmentsContext.Provider>
		</PromptInputController.Provider>
	);
}

// ============================================================================
// Component Context & Hooks
// ============================================================================

const LocalAttachmentsContext = createContext<AttachmentsContext | null>(null);

export const usePromptInputAttachments = () => {
	const provider = useOptionalProviderAttachments();
	const local = useContext(LocalAttachmentsContext);
	const context = provider ?? local;
	if (!context) {
		throw new Error("usePromptInputAttachments must be used within a PromptInput or PromptInputProvider");
	}
	return context;
};

// ============================================================================
// PromptInputAttachment
// ============================================================================

export type PromptInputAttachmentProps = HTMLAttributes<HTMLDivElement> & {
	data: FileUIPart & { id: string };
	className?: string;
};

export function PromptInputAttachment({
	data,
	className,
	...props
}: PromptInputAttachmentProps) {
	const attachments = usePromptInputAttachments();
	const filename = data.filename || "";
	const mediaType = data.mediaType?.startsWith("image/") && data.url ? "image" : "file";
	const isImage = mediaType === "image";
	const attachmentLabel = filename || (isImage ? "Image" : "Attachment");

	return (
		<PromptInputHoverCard>
			<HoverCardTrigger>
				<div
					className={classNames("prompt-input-attachment", className)}
					key={data.id}
					{...props}
				>
					<div className="prompt-input-attachment-icon">
						{isImage ? (
							<img
								alt={filename || "attachment"}
								className="prompt-input-attachment-preview"
								src={data.url}
							/>
						) : (
							<IconFileText />
						)}
						<button
							type="button"
							aria-label="Remove attachment"
							className="prompt-input-attachment-remove"
							onClick={(e: React.MouseEvent) => {
								e.stopPropagation();
								attachments.remove(data.id);
							}}
						>
							<IconX />
						</button>
					</div>
					<span className="prompt-input-attachment-label">{attachmentLabel}</span>
				</div>
			</HoverCardTrigger>
			<PromptInputHoverCardContent className="prompt-input-attachment-hover">
				{isImage && (
					<div className="prompt-input-attachment-hover-preview">
						<img
							alt={filename || "attachment preview"}
							src={data.url}
						/>
					</div>
				)}
				<div className="prompt-input-attachment-hover-info">
					<h4>{filename || (isImage ? "Image" : "Attachment")}</h4>
					{data.mediaType && <p>{data.mediaType}</p>}
				</div>
			</PromptInputHoverCardContent>
		</PromptInputHoverCard>
	);
}

// ============================================================================
// PromptInputAttachments
// ============================================================================

export type PromptInputAttachmentsProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
	children: (attachment: FileUIPart & { id: string }) => ReactNode;
};

export function PromptInputAttachments({
	children,
	className,
	...props
}: PromptInputAttachmentsProps) {
	const attachments = usePromptInputAttachments();

	if (!attachments.files.length) return null;

	return (
		<div className={classNames("prompt-input-attachments", className)} {...props}>
			{attachments.files.map((file) => (
				<Fragment key={file.id}>{children(file)}</Fragment>
			))}
		</div>
	);
}

// ============================================================================
// PromptInput
// ============================================================================

export type PromptInputMessage = {
	text: string;
	files: FileUIPart[];
};

export type PromptInputProps = Omit<HTMLAttributes<HTMLFormElement>, "onSubmit" | "onError"> & {
	accept?: string;
	multiple?: boolean;
	globalDrop?: boolean;
	syncHiddenInput?: boolean;
	maxFiles?: number;
	maxFileSize?: number;
	onError?: (err: { code: "max_files" | "max_file_size" | "accept"; message: string }) => void;
	onSubmit: (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export const PromptInput = ({
	className,
	accept,
	multiple,
	globalDrop,
	syncHiddenInput,
	maxFiles,
	maxFileSize,
	onError,
	onSubmit,
	children,
	...props
}: PromptInputProps) => {
	const controller = useOptionalPromptInputController();
	const usingProvider = !!controller;

	const inputRef = useRef<HTMLInputElement | null>(null);
	const formRef = useRef<HTMLFormElement | null>(null);

	const [items, setItems] = useState<(FileUIPart & { id: string })[]>([]);
	const files = usingProvider ? controller.attachments.files : items;

	const filesRef = useRef(files);
	filesRef.current = files;

	const openFileDialogLocal = useCallback(() => {
		inputRef.current?.click();
	}, []);

	const matchesAccept = useCallback(
		(f: File) => {
			if (!accept || accept.trim() === "") return true;
			const patterns = accept.split(",").map((s) => s.trim()).filter(Boolean);
			return patterns.some((pattern) => {
				if (pattern.endsWith("/*")) {
					const prefix = pattern.slice(0, -1);
					return f.type.startsWith(prefix);
				}
				return f.type === pattern;
			});
		},
		[accept]
	);

	const addLocal = useCallback(
		(fileList: File[] | FileList) => {
			const incoming = Array.from(fileList);
			const accepted = incoming.filter((f) => matchesAccept(f));
			if (incoming.length && accepted.length === 0) {
				onError?.({ code: "accept", message: "No files match the accepted types." });
				return;
			}
			const withinSize = (f: File) => (maxFileSize ? f.size <= maxFileSize : true);
			const sized = accepted.filter(withinSize);
			if (accepted.length > 0 && sized.length === 0) {
				onError?.({ code: "max_file_size", message: "All files exceed the maximum size." });
				return;
			}

			setItems((prev) => {
				const capacity = typeof maxFiles === "number" ? Math.max(0, maxFiles - prev.length) : undefined;
				const capped = typeof capacity === "number" ? sized.slice(0, capacity) : sized;
				if (typeof capacity === "number" && sized.length > capacity) {
					onError?.({ code: "max_files", message: "Too many files. Some were not added." });
				}
				const next: (FileUIPart & { id: string })[] = [];
				for (const file of capped) {
					next.push({
						id: nanoid(),
						type: "file",
						url: URL.createObjectURL(file),
						mediaType: file.type,
						filename: file.name,
					});
				}
				return prev.concat(next);
			});
		},
		[matchesAccept, maxFiles, maxFileSize, onError]
	);

	const removeLocal = useCallback(
		(id: string) =>
			setItems((prev) => {
				const found = prev.find((file) => file.id === id);
				if (found?.url) URL.revokeObjectURL(found.url);
				return prev.filter((file) => file.id !== id);
			}),
		[]
	);

	const clearLocal = useCallback(
		() =>
			setItems((prev) => {
				for (const file of prev) {
					if (file.url) URL.revokeObjectURL(file.url);
				}
				return [];
			}),
		[]
	);

	const add = usingProvider ? controller.attachments.add : addLocal;
	const remove = usingProvider ? controller.attachments.remove : removeLocal;
	const clear = usingProvider ? controller.attachments.clear : clearLocal;
	const openFileDialog = usingProvider ? controller.attachments.openFileDialog : openFileDialogLocal;

	useEffect(() => {
		if (!usingProvider) return;
		controller.__registerFileInput(inputRef, () => inputRef.current?.click());
	}, [usingProvider, controller]);

	useEffect(() => {
		if (syncHiddenInput && inputRef.current && files.length === 0) {
			inputRef.current.value = "";
		}
	}, [files, syncHiddenInput]);

	// Form drop handlers
	useEffect(() => {
		const form = formRef.current;
		if (!form) return;
		if (globalDrop) return;

		const onDragOver = (e: DragEvent) => {
			if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
		};
		const onDrop = (e: DragEvent) => {
			if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
			if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
				add(e.dataTransfer.files);
			}
		};
		form.addEventListener("dragover", onDragOver);
		form.addEventListener("drop", onDrop);
		return () => {
			form.removeEventListener("dragover", onDragOver);
			form.removeEventListener("drop", onDrop);
		};
	}, [add, globalDrop]);

	// Global drop handlers
	useEffect(() => {
		if (!globalDrop) return;

		const onDragOver = (e: DragEvent) => {
			if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
		};
		const onDrop = (e: DragEvent) => {
			if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
			if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
				add(e.dataTransfer.files);
			}
		};
		document.addEventListener("dragover", onDragOver);
		document.addEventListener("drop", onDrop);
		return () => {
			document.removeEventListener("dragover", onDragOver);
			document.removeEventListener("drop", onDrop);
		};
	}, [add, globalDrop]);

	// Cleanup on unmount
	useEffect(
		() => () => {
			if (!usingProvider) {
				for (const f of filesRef.current) {
					if (f.url) URL.revokeObjectURL(f.url);
				}
			}
		},
		[usingProvider]
	);

	const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
		if (event.currentTarget.files) {
			add(event.currentTarget.files);
		}
		event.currentTarget.value = "";
	};

	const convertBlobUrlToDataUrl = async (url: string): Promise<string | null> => {
		try {
			const response = await fetch(url);
			const blob = await response.blob();
			return new Promise((resolve) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.onerror = () => resolve(null);
				reader.readAsDataURL(blob);
			});
		} catch {
			return null;
		}
	};

	const ctx = useMemo<AttachmentsContext>(
		() => ({
			files: files.map((item) => ({ ...item, id: item.id })),
			add,
			remove,
			clear,
			openFileDialog,
			fileInputRef: inputRef,
		}),
		[files, add, remove, clear, openFileDialog]
	);

	const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
		event.preventDefault();

		const form = event.currentTarget;
		const text = usingProvider
			? controller.textInput.value
			: (() => {
					const formData = new FormData(form);
					return (formData.get("message") as string) || "";
				})();

		if (!usingProvider) form.reset();

		Promise.all(
			files.map(async ({ id: _id, ...item }) => {
				if (item.url && item.url.startsWith("blob:")) {
					const dataUrl = await convertBlobUrlToDataUrl(item.url);
					return { ...item, url: dataUrl ?? item.url };
				}
				return item;
			})
		)
			.then((convertedFiles: FileUIPart[]) => {
				try {
					const result = onSubmit({ text, files: convertedFiles }, event);
					if (result instanceof Promise) {
						result
							.then(() => {
								clear();
								if (usingProvider) controller.textInput.clear();
							})
							.catch(() => {});
					} else {
						clear();
						if (usingProvider) controller.textInput.clear();
					}
				} catch {
					// Don't clear on error
				}
			})
			.catch(() => {});
	};

	const inner = (
		<>
			<input
				accept={accept}
				aria-label="Upload files"
				className="hidden"
				multiple={multiple}
				onChange={handleChange}
				ref={inputRef}
				title="Upload files"
				type="file"
			/>
			<form
				className={classNames("prompt-input", className)}
				onSubmit={handleSubmit}
				ref={formRef}
				{...props}
			>
				<InputGroup className="prompt-input-group" data-orientation="vertical">{children}</InputGroup>
			</form>
		</>
	);

	return usingProvider ? inner : (
		<LocalAttachmentsContext.Provider value={ctx}>{inner}</LocalAttachmentsContext.Provider>
	);
};

// ============================================================================
// PromptInputBody
// ============================================================================

export type PromptInputBodyProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputBody = ({ className, ...props }: PromptInputBodyProps) => (
	<div className={classNames("prompt-input-body", className)} {...props} />
);

// ============================================================================
// PromptInputTextarea
// ============================================================================

export type PromptInputTextareaProps = ComponentProps<typeof InputGroupTextarea>;

export const PromptInputTextarea = ({
	onChange,
	className,
	placeholder = "What would you like to know?",
	...props
}: PromptInputTextareaProps) => {
	const controller = useOptionalPromptInputController();
	const attachments = usePromptInputAttachments();
	const [isComposing, setIsComposing] = useState(false);

	const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
		if (e.key === "Enter") {
			if (isComposing || e.nativeEvent.isComposing) return;
			if (e.shiftKey) return;
			e.preventDefault();

			const form = e.currentTarget.form;
			const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
			if (submitButton?.disabled) return;

			form?.requestSubmit();
		}

		if (e.key === "Backspace" && e.currentTarget.value === "" && attachments.files.length > 0) {
			e.preventDefault();
			const lastAttachment = attachments.files.at(-1);
			if (lastAttachment) attachments.remove(lastAttachment.id);
		}
	};

	const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = (event) => {
		const items = event.clipboardData?.items;
		if (!items) return;

		const files: File[] = [];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item?.kind === "file") {
				const file = item.getAsFile();
				if (file) files.push(file);
			}
		}

		if (files.length > 0) {
			event.preventDefault();
			attachments.add(files);
		}
	};

	const controlledProps = controller
		? {
				value: controller.textInput.value,
				onChange: (e: ChangeEvent<HTMLTextAreaElement>) => {
					controller.textInput.setInput(e.currentTarget.value);
					onChange?.(e);
				},
			}
		: { onChange };

	return (
		<InputGroupTextarea
			className={classNames("prompt-input-textarea", className)}
			name="message"
			onCompositionEnd={() => setIsComposing(false)}
			onCompositionStart={() => setIsComposing(true)}
			onKeyDown={handleKeyDown}
			onPaste={handlePaste}
			placeholder={placeholder}
			{...props}
			{...controlledProps}
		/>
	);
};

// ============================================================================
// PromptInputHeader
// ============================================================================

export type PromptInputHeaderProps = Omit<ComponentProps<typeof InputGroupAddon>, "align">;

export const PromptInputHeader = ({ className, ...props }: PromptInputHeaderProps) => (
	<InputGroupAddon align="block-start" className={classNames("prompt-input-header", className)} {...props} />
);

// ============================================================================
// PromptInputFooter
// ============================================================================

export type PromptInputFooterProps = Omit<ComponentProps<typeof InputGroupAddon>, "align">;

export const PromptInputFooter = ({ className, ...props }: PromptInputFooterProps) => (
	<InputGroupAddon align="block-end" className={classNames("prompt-input-footer", className)} {...props} />
);

// ============================================================================
// PromptInputTools
// ============================================================================

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputTools = ({ className, ...props }: PromptInputToolsProps) => (
	<div className={classNames("prompt-input-tools", className)} {...props} />
);

// ============================================================================
// PromptInputButton
// ============================================================================

export type PromptInputButtonProps = ComponentProps<typeof InputGroupButton>;

export const PromptInputButton = ({
	variant = "ghost",
	className,
	size,
	...props
}: PromptInputButtonProps) => {
	const newSize = size ?? (Children.count(props.children) > 1 ? "sm" : "icon-sm");

	return (
		<InputGroupButton
			className={classNames("prompt-input-button", className)}
			size={newSize}
			type="button"
			variant={variant}
			{...props}
		/>
	);
};

// ============================================================================
// PromptInputActionMenu
// ============================================================================

export type PromptInputActionMenuProps = ComponentProps<typeof DropdownMenu>;
export const PromptInputActionMenu = (props: PromptInputActionMenuProps) => (
	<DropdownMenu {...props} />
);

export type PromptInputActionMenuTriggerProps = PromptInputButtonProps;

export const PromptInputActionMenuTrigger = ({
	className,
	children,
	...props
}: PromptInputActionMenuTriggerProps) => (
	<DropdownMenuTrigger>
		<PromptInputButton className={className} {...props}>
			{children ?? <IconPlus />}
		</PromptInputButton>
	</DropdownMenuTrigger>
);

export type PromptInputActionMenuContentProps = Omit<ComponentProps<typeof DropdownMenuContent>, 'className'> & { className?: string };
export const PromptInputActionMenuContent = ({ className, ...props }: PromptInputActionMenuContentProps) => (
	<DropdownMenuContent align="start" className={className} {...props} />
);

export type PromptInputActionMenuItemProps = Omit<ComponentProps<typeof DropdownMenuItem>, 'className'> & { className?: string };
export const PromptInputActionMenuItem = ({ className, ...props }: PromptInputActionMenuItemProps) => (
	<DropdownMenuItem className={className} {...props} />
);

export type PromptInputActionAddAttachmentsProps = ComponentProps<typeof DropdownMenuItem> & {
	label?: string;
};

export const PromptInputActionAddAttachments = ({
	label = "Add photos or files",
	...props
}: PromptInputActionAddAttachmentsProps) => {
	const attachments = usePromptInputAttachments();

	return (
		<DropdownMenuItem
			{...props}
			onSelect={() => {
				attachments.openFileDialog();
			}}
		>
			<IconFileText /> {label}
		</DropdownMenuItem>
	);
};

// ============================================================================
// PromptInputSubmit
// ============================================================================

export type PromptInputSubmitProps = ComponentProps<typeof InputGroupButton> & {
	status?: ChatStatus;
};

export const PromptInputSubmit = ({
	className,
	variant = "default",
	size = "icon-sm",
	status,
	children,
	...props
}: PromptInputSubmitProps) => {
	let Icon = <IconCornerDownLeft />;

	if (status === "submitted") {
		Icon = <span className="prompt-input-submit-loading" />;
	} else if (status === "streaming") {
		Icon = <IconSquare />;
	} else if (status === "error") {
		Icon = <IconX />;
	}

	return (
		<InputGroupButton
			aria-label="Submit"
			className={classNames("prompt-input-submit", className)}
			size={size}
			type="submit"
			variant={variant}
			{...props}
		>
			{children ?? Icon}
		</InputGroupButton>
	);
};

// ============================================================================
// PromptInputSpeechButton
// ============================================================================

interface SpeechRecognition extends EventTarget {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	start(): void;
	stop(): void;
	onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
	onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
	onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
	onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null;
}

interface SpeechRecognitionEvent extends Event {
	results: SpeechRecognitionResultList;
	resultIndex: number;
}

type SpeechRecognitionResultList = {
	readonly length: number;
	item(index: number): SpeechRecognitionResult;
	[index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
	readonly length: number;
	item(index: number): SpeechRecognitionAlternative;
	[index: number]: SpeechRecognitionAlternative;
	isFinal: boolean;
};

type SpeechRecognitionAlternative = {
	transcript: string;
	confidence: number;
};

interface SpeechRecognitionErrorEvent extends Event {
	error: string;
}

declare global {
	interface Window {
		SpeechRecognition: { new (): SpeechRecognition };
		webkitSpeechRecognition: { new (): SpeechRecognition };
	}
}

export type PromptInputSpeechButtonProps = ComponentProps<typeof PromptInputButton> & {
	textareaRef?: RefObject<HTMLTextAreaElement | null>;
	onTranscriptionChange?: (text: string) => void;
};

export const PromptInputSpeechButton = ({
	className,
	textareaRef,
	onTranscriptionChange,
	...props
}: PromptInputSpeechButtonProps) => {
	const [isListening, setIsListening] = useState(false);
	const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
	const recognitionRef = useRef<SpeechRecognition | null>(null);

	useEffect(() => {
		if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
			const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
			const speechRecognition = new SpeechRecognitionCtor();

			speechRecognition.continuous = true;
			speechRecognition.interimResults = true;
			speechRecognition.lang = "en-US";

			speechRecognition.onstart = () => setIsListening(true);
			speechRecognition.onend = () => setIsListening(false);

			speechRecognition.onresult = (event) => {
				let finalTranscript = "";
				for (let i = event.resultIndex; i < event.results.length; i++) {
					const result = event.results[i];
					if (result?.isFinal) {
						finalTranscript += result[0]?.transcript ?? "";
					}
				}

				if (finalTranscript && textareaRef?.current) {
					const textarea = textareaRef.current;
					const currentValue = textarea.value;
					const newValue = currentValue + (currentValue ? " " : "") + finalTranscript;
					textarea.value = newValue;
					textarea.dispatchEvent(new Event("input", { bubbles: true }));
					onTranscriptionChange?.(newValue);
				}
			};

			speechRecognition.onerror = (event) => {
				console.error("Speech recognition error:", event.error);
				setIsListening(false);
			};

			recognitionRef.current = speechRecognition;
			setRecognition(speechRecognition);
		}

		return () => {
			if (recognitionRef.current) recognitionRef.current.stop();
		};
	}, [textareaRef, onTranscriptionChange]);

	const toggleListening = useCallback(() => {
		if (!recognition) return;
		if (isListening) recognition.stop();
		else recognition.start();
	}, [recognition, isListening]);

	return (
		<PromptInputButton
			className={classNames("prompt-input-speech", isListening && "listening", className)}
			disabled={!recognition}
			onClick={toggleListening}
			{...props}
		>
			<IconMic />
		</PromptInputButton>
	);
};

// ============================================================================
// PromptInputSelect
// ============================================================================

export type PromptInputSelectProps = ComponentProps<typeof Select>;
export const PromptInputSelect = (props: PromptInputSelectProps) => <Select {...props} />;

export type PromptInputSelectTriggerProps = Omit<ComponentProps<typeof SelectTrigger>, 'className'> & { className?: string };
export const PromptInputSelectTrigger = ({ className, ...props }: PromptInputSelectTriggerProps) => (
	<SelectTrigger className={classNames("prompt-input-select-trigger", className) || undefined} {...props} />
);

export type PromptInputSelectContentProps = Omit<ComponentProps<typeof SelectContent>, 'className'> & { className?: string };
export const PromptInputSelectContent = ({ className, ...props }: PromptInputSelectContentProps) => (
	<SelectContent className={className} {...props} />
);

export type PromptInputSelectItemProps = Omit<ComponentProps<typeof SelectItem>, 'className'> & { className?: string };
export const PromptInputSelectItem = ({ className, ...props }: PromptInputSelectItemProps) => (
	<SelectItem className={className} {...props} />
);

export type PromptInputSelectValueProps = Omit<ComponentProps<typeof SelectValue>, 'className'> & { className?: string };
export const PromptInputSelectValue = ({ className, ...props }: PromptInputSelectValueProps) => (
	<SelectValue className={className} {...props} />
);

// ============================================================================
// PromptInputHoverCard
// ============================================================================

export type PromptInputHoverCardProps = ComponentProps<typeof HoverCard>;
export const PromptInputHoverCard = ({ openDelay = 0, closeDelay = 0, ...props }: PromptInputHoverCardProps) => (
	<HoverCard closeDelay={closeDelay} openDelay={openDelay} {...props} />
);

export type PromptInputHoverCardTriggerProps = ComponentProps<typeof HoverCardTrigger>;
export const PromptInputHoverCardTrigger = (props: PromptInputHoverCardTriggerProps) => (
	<HoverCardTrigger {...props} />
);

export type PromptInputHoverCardContentProps = ComponentProps<typeof HoverCardContent>;
export const PromptInputHoverCardContent = ({ align = "start", ...props }: PromptInputHoverCardContentProps) => (
	<HoverCardContent align={align} {...props} />
);

// ============================================================================
// PromptInputCommand
// ============================================================================

export type PromptInputCommandProps = ComponentProps<typeof Command>;
export const PromptInputCommand = ({ className, ...props }: PromptInputCommandProps) => (
	<Command className={classNames(className)} {...props} />
);

export type PromptInputCommandInputProps = ComponentProps<typeof CommandInput>;
export const PromptInputCommandInput = ({ className, ...props }: PromptInputCommandInputProps) => (
	<CommandInput className={classNames(className)} {...props} />
);

export type PromptInputCommandListProps = ComponentProps<typeof CommandList>;
export const PromptInputCommandList = ({ className, ...props }: PromptInputCommandListProps) => (
	<CommandList className={classNames(className)} {...props} />
);

export type PromptInputCommandEmptyProps = ComponentProps<typeof CommandEmpty>;
export const PromptInputCommandEmpty = ({ className, ...props }: PromptInputCommandEmptyProps) => (
	<CommandEmpty className={classNames(className)} {...props} />
);

export type PromptInputCommandGroupProps = ComponentProps<typeof CommandGroup>;
export const PromptInputCommandGroup = ({ className, ...props }: PromptInputCommandGroupProps) => (
	<CommandGroup className={classNames(className)} {...props} />
);

export type PromptInputCommandItemProps = ComponentProps<typeof CommandItem>;
export const PromptInputCommandItem = ({ className, ...props }: PromptInputCommandItemProps) => (
	<CommandItem className={classNames(className)} {...props} />
);

export type PromptInputCommandSeparatorProps = ComponentProps<typeof CommandSeparator>;
export const PromptInputCommandSeparator = ({ className, ...props }: PromptInputCommandSeparatorProps) => (
	<CommandSeparator className={classNames(className)} {...props} />
);
