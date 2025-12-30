# AcpAdapter Design Improvements

## Current Issues & Recommendations

### 1. **Memory Leak: Event Listeners**
**Issue**: Stream listeners not cleaned up on disconnect
```typescript
// Current
stdout.on("data", (chunk) => controller.enqueue(chunk));
// On disconnect, listeners still attached → memory leak
```

**Fix**:
```typescript
private streamListeners: Array<() => void> = [];

// Store cleanup functions
const dataListener = (chunk) => controller.enqueue(chunk);
stdout.on("data", dataListener);
this.streamListeners.push(() => stdout.removeListener("data", dataListener));

// In disconnect()
for (const cleanup of this.streamListeners) cleanup();
this.streamListeners = [];
```

---

### 2. **Callback Subscription Without Unsubscribe**
**Issue**: No way to remove callbacks → memory leak in long-running sessions
```typescript
// Current
onSessionUpdate(callback: (update: SessionUpdate) => void): void {
  this.sessionUpdateCallbacks.push(callback);
  // No unsubscribe method!
}
```

**Fix**: Add subscription management
```typescript
private sessionUpdateSubscriptions = new Map<string, (update: SessionUpdate) => void>();
private subscriptionId = 0;

onSessionUpdate(callback: (update: SessionUpdate) => void): string {
  const id = String(this.subscriptionId++);
  this.sessionUpdateSubscriptions.set(id, callback);
  return id;
}

offSessionUpdate(subscriptionId: string): void {
  this.sessionUpdateSubscriptions.delete(subscriptionId);
}
```

---

### 3. **Connection State Not Properly Tracked**
**Issue**: Only `isInitializedFlag` - doesn't capture full lifecycle
```typescript
// Current
private isInitializedFlag = false;

// Doesn't distinguish: initializing, ready, disconnecting, errored
```

**Fix**: Use state enum
```typescript
enum ConnectionState {
  DISCONNECTED = "disconnected",
  INITIALIZING = "initializing",
  READY = "ready",
  ERROR = "error",
  CLOSING = "closing",
}

private connectionState: ConnectionState = ConnectionState.DISCONNECTED;

isInitialized(): boolean {
  return this.connectionState === ConnectionState.READY;
}
```

---

### 4. **Stream Error Handling Incomplete**
**Issue**: `stdin.on("error")` called before null-check
```typescript
// Current
if (!stdin || !stdout)
  throw new Error("Failed to open stdin/stdout for agent");

// But this is BEFORE:
stdin.on("error", (err) => {...}); // ❌ Can crash if stdin is null
```

**Fix**: Check before attaching listeners
```typescript
if (!stdin || !stdout) {
  throw new Error("Failed to open stdin/stdout for agent");
}

stdin.on("error", (err) => {
  console.error("[AcpAdapter] stdin error:", err);
  this.handleConnectionError(err);
});
```

---

### 5. **WritableStream Backpressure Ignored**
**Issue**: Doesn't handle when buffer is full
```typescript
// Current
const input = new WritableStream<Uint8Array>({
  write(chunk) {
    stdin.write(chunk); // ❌ Ignores backpressure
  },
});
```

**Fix**: Handle backpressure
```typescript
const input = new WritableStream<Uint8Array>({
  write(chunk) {
    return new Promise<void>((resolve, reject) => {
      stdin.write(chunk, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },
});
```

---

### 6. **Type Safety: Multiple `as any` Casts**
**Issue**: Bypasses TypeScript checks
```typescript
// Current
const update = params.update as any;
content: AcpTypeConverter.toToolCallContent(update.content),
```

**Fix**: Create proper type definitions
```typescript
interface AcpSessionUpdate {
  sessionUpdate: string;
  content?: { type: string; text?: string };
  toolCallId?: string;
  title?: string;
  status?: string;
  // ... other fields
}

const update = params.update as AcpSessionUpdate;
```

---

### 7. **Method Naming: `sendMessage` vs ACP Semantics**
**Issue**: `sendMessage()` calls `prompt()` - semantic mismatch
```typescript
// Current - confusing naming
async sendMessage(sessionId: string, message: string): Promise<void> {
  await this.connection.prompt({...});
}
```

**Fix**: Use ACP terminology
```typescript
async sendPrompt(
  sessionId: string,
  prompt: string,
  context?: PromptContext,
): Promise<void> {
  await this.connection.prompt({
    sessionId,
    prompt: [{ type: "text", text: prompt }],
    // Add context if provided
  });
}
```

---

### 8. **Missing Implementations**
**Current TODOs**:
- `authenticate()` - stub returning `true`
- `respondToPermission()` - not implemented
- `setSessionModel()` - not implemented

**Recommendation**: Implement or document why not needed

---

### 9. **Unhandled Session Notification Types**
**Issue**: `sessionUpdate()` has `// Add other cases` comment
Missing handlers for:
- `session_end`
- `permission_requested`
- `error`
- `output`

**Fix**: Comprehensive switch coverage
```typescript
switch (update.sessionUpdate) {
  case "permission_requested":
    parsedUpdate = {
      type: "permission_requested",
      requestId: update.requestId,
      options: update.options,
    };
    break;
  // ... etc
}
```

---

### 10. **Connection Closure Not Awaited**
**Issue**: `disconnect()` doesn't wait for connection to close
```typescript
// Current
async disconnect(): Promise<void> {
  if (this.agentProcess) {
    this.agentProcess.kill();
  }
  // ❌ Not waiting for streams to finish
}
```

**Fix**: Properly close streams
```typescript
async disconnect(): Promise<void> {
  try {
    if (this.connection) {
      // Wait for connection to close gracefully
      await Promise.race([
        this.connection.closed,
        new Promise(resolve => setTimeout(resolve, 5000)) // 5s timeout
      ]);
    }
  } catch (e) {
    console.error("[AcpAdapter] Error closing connection:", e);
  }
  
  if (this.agentProcess) {
    this.agentProcess.kill("SIGTERM");
    // Give process time to shutdown
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!this.agentProcess.killed) {
      this.agentProcess.kill("SIGKILL");
    }
  }
  
  this.cleanup();
}
```

---

## Summary of Improvements

| Issue | Severity | Type | Effort |
|-------|----------|------|--------|
| Memory leak - listeners | 🔴 High | Bug | Medium |
| No callback unsubscribe | 🔴 High | Bug | Small |
| Stream backpressure | 🟡 Medium | Bug | Small |
| State management | 🟡 Medium | Design | Small |
| Type safety | 🟡 Medium | Quality | Medium |
| Method naming | 🟢 Low | Style | Trivial |
| Missing implementations | 🟡 Medium | Incomplete | Medium |
| Error handling consistency | 🟡 Medium | Quality | Small |

---

## Recommended Action Plan
1. ✅ Add state enum
2. ✅ Implement callback subscription management
3. ✅ Add stream listener cleanup
4. ✅ Implement backpressure handling
5. ✅ Complete notification switch cases
6. ✅ Improve error handling & connection lifecycle
7. ⚠️ Complete stub methods or document why not needed
