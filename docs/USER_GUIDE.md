# Eragear Copilot - User Guide

## Getting Started

### Installation
1. Open Obsidian
2. Go to Settings → Community Plugins
3. Search for "Eragear Copilot"
4. Click Install and Enable

### First Launch
After installation, you'll see a robot icon (🤖) in the left sidebar. Click it to open Eragear Copilot.

## Main Interface

### Sidebar Layout
The Eragear Copilot sidebar contains two main sections accessed via tabs:

```
┌─────────────────────────────┐
│ 💬 Chat  │  🧪 Test        │  ← Tab navigation
├─────────────────────────────┤
│                             │
│     [Content Area]          │
│                             │
│     (Chat or Test Panel)    │
│                             │
├─────────────────────────────┤
```

## Features

### 💬 Chat Panel

The Chat Panel is your interface for conversing with Eragear Copilot.

#### How to Use
1. Click the **💬 Chat** tab
2. Type your message in the text box at the bottom
3. Press **Enter** to send (or click the Send button)
4. Wait for the response from Copilot

#### Keyboard Shortcuts
- **Enter** - Send message
- **Shift + Enter** - Add a new line in your message

#### Message Format
- 👤 = Your message
- 🤖 = Copilot's response
- Time stamps shown for each message

#### Tips
- Be specific in your questions
- Ask about note content, structure, or suggestions
- Copilot learns from your vault context

### 🧪 Test Panel

The Test Panel lets you debug and test the core functionality. It has three sub-tabs:

#### 1. 🔍 Search Tab

**Purpose:** Search for notes by keyword

**How to Use:**
1. Click the **🔍 Search** tab
2. Enter a keyword in the search box (e.g., "Python", "Meeting")
3. Press **Enter** or click **Search**
4. View the results below

**Results Format:**
- **Bold text** = Note filename
- *Gray text* = Full note path
- Click a result to open it in Obsidian

**Search Behavior:**
- Searches note titles first (highest priority)
- Then searches tags
- Returns up to 10 results
- Instant results from cached metadata

#### 2. 📑 Structure Tab

**Purpose:** Extract the table of contents of the current note

**How to Use:**
1. Click the **📑 Structure** tab
2. Open/focus on a note in Obsidian editor
3. Click **Get Structure of Active File**
4. View the markdown outline below

**Output Format:**
```markdown
# Main Heading
## Sub Heading
### Sub-sub Heading
```

**Use Cases:**
- Get a quick overview of note structure
- Understand document organization
- Planning new sections

#### 3. 🏷️ Metadata Tab

**Purpose:** View tags and frontmatter of the current note

**How to Use:**
1. Click the **🏷️ Metadata** tab
2. Open/focus on a note in Obsidian editor
3. Click **Get Metadata of Active File**
4. View the metadata in JSON format below

**Output Format:**
```json
{
  "tags": ["#work", "#important", "#project"],
  "frontmatter": {
    "created": "2025-01-15",
    "author": "You"
  }
}
```

**Use Cases:**
- Check what tags are assigned
- View custom properties (frontmatter)
- Organize metadata information

## Settings

### Configuration Options

**API Endpoint**
- Default: `https://eragear.app`
- Change if using a custom server

**Debug Mode**
- Enable for detailed console logs
- Useful for troubleshooting

### Accessing Settings
1. Go to Obsidian Settings
2. Find "Eragear Copilot" in plugin list
3. Click the settings gear icon
4. Modify options as needed

## Keyboard Shortcuts

### Command Palette
Press **Ctrl+P** (Windows/Linux) or **Cmd+P** (Mac) and search for:
- "Open Copilot Sidebar" - Opens the sidebar

### Quick Access
- Click the **🤖** icon in the left sidebar
- Or use the command palette

## Sidebar Management

### Moving the Sidebar
1. Click the dots (⋮) in the sidebar header
2. Choose "Move to left" or "Move to right"
3. Sidebar relocates to new position

### Closing the Sidebar
- Click the **X** in the sidebar header
- Or click the 🤖 icon again

### Resizing
- Drag the edge of the sidebar to resize
- Works on both left and right sides

## Tips & Tricks

### Best Practices

**For Search:**
- Use specific keywords from your notes
- Try different variations
- Check note filenames match your search

**For Structure:**
- Good for quickly reviewing long notes
- Helps understand document organization
- Useful before adding new content

**For Metadata:**
- Verify tags are applied correctly
- Check frontmatter values
- Useful for organization review

### Workflow Integration

1. **During Writing:**
   - Use Chat panel for suggestions
   - Check Structure while planning

2. **During Organization:**
   - Use Search to find related notes
   - Check Metadata to verify organization

3. **During Collaboration:**
   - Share Search results with team
   - Export Structure for documentation

## Troubleshooting

### Common Issues

**"No active file" error**
- ✅ Solution: Open or focus a note in the editor first
- The sidebar needs an active note to extract structure/metadata

**Search returns no results**
- ✅ Check spelling of search term
- ✅ Ensure notes with that content exist
- ✅ Try searching by tag instead

**Chat shows placeholder responses**
- ✅ This is normal - AI integration coming soon
- ✅ Test panel features work normally

**Sidebar not visible**
- ✅ Click the 🤖 icon in the left ribbon
- ✅ Or use Command Palette: "Open Copilot Sidebar"

### Performance

**Large Vaults (1000+ notes)**
- Search is optimized but might be slightly slower
- Metadata operations remain fast
- Refresh by closing and reopening sidebar

**Memory Usage**
- Sidebar uses Obsidian's caching system
- Minimal memory footprint
- Safe to keep open while editing

## Getting Help

### Reporting Issues
1. Note the exact steps to reproduce
2. Check browser console for errors (Ctrl+Shift+I)
3. Report via GitHub issues with:
   - Obsidian version
   - Plugin version
   - Steps to reproduce
   - Error messages (if any)

### Feature Requests
- Suggest features on GitHub
- Describe your use case
- Explain how it would improve your workflow

## Keyboard Reference

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Open Command Palette | Ctrl+P | Cmd+P |
| Search in Command Palette | Ctrl+P then type | Cmd+P then type |
| Toggle Sidebar | Click 🤖 icon | Click 🤖 icon |
| Send Message | Enter | Enter |
| New Line in Chat | Shift+Enter | Shift+Enter |
| Submit Search | Enter | Enter |

## Advanced Usage

### Filtering Search Results
Search uses smart ranking:
1. **Title matches** → ranked highest
2. **Tag matches** → ranked medium
3. **Future:** Content matches

### Exporting Results

**Search Results:**
- Copy filename from result
- Paste into notes or documents

**Structure:**
- Select and copy the markdown outline
- Paste into notes as template

**Metadata:**
- Copy JSON from output
- Use for documentation or analysis

## FAQ

**Q: Can I use this offline?**
A: Yes! The Test panel works entirely offline. Chat will work better with API connection.

**Q: Is my vault data sent to the cloud?**
A: Only if you enable API integration. Local testing functions never leave your machine.

**Q: Can I customize the interface?**
A: Currently limited to settings. More customization coming soon.

**Q: Will this affect Obsidian performance?**
A: No, the plugin is designed to be lightweight and uses Obsidian's efficient caching.

**Q: Can I use this on mobile?**
A: Obsidian mobile support is limited. Plugin works best on desktop.

## What's Next?

### Coming Soon
- ✅ Real AI integration with Eragear API
- ✅ Advanced search with filters
- ✅ Note relationship visualization
- ✅ Custom prompt templates

### Roadmap
- Phase 3: Enhanced features and AI integration
- Phase 4: Community release and optimization

---

**Version:** 1.0.0  
**Last Updated:** December 26, 2025  
**Status:** Beta
