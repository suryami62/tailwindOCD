<div align="center">
  <img src="media/icon.png" alt="Tailwind OCD icon" width="128" height="128" />
  <h1>Tailwind OCD</h1>
  <p><strong>Because your <code>className</code> should read like code, not a panic attack.</strong></p>
  <p><em>Auto-sort Tailwind classes, clean duplicate/conflicting utilities, and reduce PR noise before your reviewer judges your life choices.</em></p>
</div>

---

<p align="justify"><code>Tailwind OCD</code> brings Headwind-style ordering into your workflow by delegating sorting to the official <strong>Tailwind CSS IntelliSense</strong> command. On top of that, it can remove duplicates and resolve simple class conflicts so your markup stays readable and less... emotionally charged.</p>

## Why Tailwind OCD?

<p align="justify">Let's be honest. This is not maintainable:</p>

```tsx
className="mt-4 bg-red-500 hover:text-white p-2 flex-col justify-center align-middle lg:p-4 opacity-50 block"
```

<p align="justify">It works, sure. So does writing SQL in one line. <code>Tailwind OCD</code> gives you deterministic ordering and cleaner utility strings so diffs are smaller, reviews are faster, and future-you is slightly less annoyed.</p>

## What It Actually Does

- Sorts classes in <code>class</code>, <code>className</code>, <code>ngClass</code>, and <code>class:list</code>.
- Scans quoted strings in utility calls like <code>clsx()</code>, <code>cn()</code>, and <code>classnames()</code> (configurable).
- Optionally removes duplicate utilities.
- Optionally removes simple conflicting utilities by keeping the last one in the same variant scope.
- Supports an ignore marker per line so you can opt out where needed.

## Commands

- **Tailwind OCD: Sort Tailwind Classes in Current File** — manual cleanup for the active editor.

## Configuration

- <code>tailwindOCD.sortOnSave</code> (default: <code>true</code>) — auto-sort on save.
- <code>tailwindOCD.dynamicClassFunctions</code> (default: <code>["clsx", "cn", "classnames"]</code>) — function names to scan.
- <code>tailwindOCD.cleanDuplicates</code> (default: <code>true</code>) — remove duplicate classes.
- <code>tailwindOCD.cleanConflicts</code> (default: <code>true</code>) — keep the last utility in simple conflict groups.
- <code>tailwindOCD.ignoreCommentMarker</code> (default: <code>tailwindocd-ignore</code>) — skip lines containing this marker.

## Requirements

<p align="justify">Install the official <strong>Tailwind CSS IntelliSense</strong> extension (<code>bradlc.vscode-tailwindcss</code>).</p>

<p align="justify"><em>Why?</em> Because this extension intentionally reuses the official sorter instead of inventing a new, potentially cursed class order.</p>

## Quick Start

```bash
bun install
bun run compile
```

Then in VS Code:
1. Open a project that uses Tailwind.
2. Run <strong>Tailwind OCD: Sort Tailwind Classes in Current File</strong>.
3. Save and enjoy cleaner diffs you can pretend happened naturally.

## Building the Extension (VSIX)

<p align="justify">Packaging your own VSIX is easy (emotionally recovering from old class strings is not):</p>

```bash
bun install
bun run package:vsix
```

## Continuous Integration

<p align="justify">CI is handled with GitHub Actions via <a href=".github/workflows/package-vsix.yml"><code>.github/workflows/package-vsix.yml</code></a>:</p>

- Builds the extension
- Packages the VSIX
- Uploads artifacts, so your release process involves fewer heroic manual steps
