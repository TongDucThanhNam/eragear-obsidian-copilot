# PromptInput Component System

A composable, context-aware input system for chat interfaces. Inspired by modern AI chat UIs, this system provides a flexible way to build rich input experiences with attachments, speech recognition, and more.

## Quick Start

```tsx
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputButton,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputHeader,
} from "./components";
import { IconPlus } from "./components/Icons";

function MyChat() {
  const handleSubmit = (message) => {
    console.log("Message:", message.text);
    console.log("Files:", message.files);
    // Send to your API
  };

  return (
    <PromptInput onSubmit={handleSubmit} accept="image/*" multiple>
      {/* Attachments appear in header */}
      <PromptInputHeader>
        <PromptInputAttachments>
          {(file) => <PromptInputAttachment data={file} />}
        </PromptInputAttachments>
      </PromptInputHeader>

      {/* Main textarea */}
      <PromptInputTextarea placeholder="Ask anything..." />

      {/* Footer with tools and submit */}
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger>
              <IconPlus />
            </PromptInputActionMenuTrigger>
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
        </PromptInputTools>

        <PromptInputSubmit status="idle" />
      </PromptInputFooter>
    </PromptInput>
  );
}
```

## With Provider (Controlled State)

```tsx
import {
  PromptInputProvider,
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  usePromptInputController,
} from "./components";

function MyControlledChat() {
  return (
    <PromptInputProvider initialInput="">
      <ChatInput />
      <CurrentInputDisplay />
    </PromptInputProvider>
  );
}

function ChatInput() {
  const handleSubmit = (message) => {
    console.log("Sending:", message);
  };

  return (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea />
      <PromptInputFooter>
        <PromptInputSubmit />
      </PromptInputFooter>
    </PromptInput>
  );
}

function CurrentInputDisplay() {
  const { textInput } = usePromptInputController();
  return <p>You're typing: {textInput.value}</p>;
}
```

## Components Overview

### Core Components

| Component | Description |
|-----------|-------------|
| `PromptInput` | Main form wrapper with file handling |
| `PromptInputProvider` | Context provider for controlled state |
| `PromptInputTextarea` | Auto-resizing textarea |
| `PromptInputHeader` | Top section (for attachments) |
| `PromptInputFooter` | Bottom section (for tools and submit) |

### Attachment Components

| Component | Description |
|-----------|-------------|
| `PromptInputAttachments` | Container for attachment list |
| `PromptInputAttachment` | Individual attachment with preview |
| `PromptInputActionAddAttachments` | Menu item to add files |

### Action Components

| Component | Description |
|-----------|-------------|
| `PromptInputButton` | Styled button for tools |
| `PromptInputActionMenu` | Dropdown menu for actions |
| `PromptInputActionMenuTrigger` | Menu trigger button |
| `PromptInputActionMenuContent` | Menu content |
| `PromptInputActionMenuItem` | Menu item |
| `PromptInputSubmit` | Submit button with status states |
| `PromptInputSpeechButton` | Voice input button |

### Select Components

| Component | Description |
|-----------|-------------|
| `PromptInputSelect` | Model/mode selector |
| `PromptInputSelectTrigger` | Select trigger |
| `PromptInputSelectContent` | Select content |
| `PromptInputSelectItem` | Select option |
| `PromptInputSelectValue` | Selected value display |

### Command Components

| Component | Description |
|-----------|-------------|
| `PromptInputCommand` | Command palette wrapper |
| `PromptInputCommandInput` | Command search input |
| `PromptInputCommandList` | Command list |
| `PromptInputCommandGroup` | Command group |
| `PromptInputCommandItem` | Command item |
| `PromptInputCommandEmpty` | Empty state |

## Props

### PromptInput Props

```tsx
interface PromptInputProps {
  onSubmit: (message: PromptInputMessage, event: FormEvent) => void | Promise<void>;
  accept?: string;           // File types: "image/*", ".pdf", etc.
  multiple?: boolean;        // Allow multiple files
  globalDrop?: boolean;      // Accept drops anywhere on document
  maxFiles?: number;         // Maximum number of files
  maxFileSize?: number;      // Maximum file size in bytes
  onError?: (err: { code: string; message: string }) => void;
}
```

### PromptInputSubmit Props

```tsx
interface PromptInputSubmitProps {
  status?: "idle" | "submitted" | "streaming" | "error";
  // ... ButtonProps
}
```

## Hooks

### usePromptInputController

Access the text input and attachments from anywhere inside a `PromptInputProvider`.

```tsx
const { textInput, attachments } = usePromptInputController();

// Text input
textInput.value;        // Current value
textInput.setInput(v);  // Set value
textInput.clear();      // Clear value

// Attachments
attachments.files;         // File array
attachments.add(files);    // Add files
attachments.remove(id);    // Remove by id
attachments.clear();       // Clear all
attachments.openFileDialog();  // Open file picker
```

### usePromptInputAttachments

Access attachments context (works inside PromptInput or PromptInputProvider).

```tsx
const attachments = usePromptInputAttachments();
```

## Types

```tsx
interface FileUIPart {
  type: "file";
  url: string;
  mediaType: string;
  filename?: string;
}

interface PromptInputMessage {
  text: string;
  files: FileUIPart[];
}

type ChatStatus = "idle" | "submitted" | "streaming" | "error";
```
