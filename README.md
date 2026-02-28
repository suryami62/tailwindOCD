# Tailwind OCD

Keep your Tailwind classes clean, consistent, and drama-free.

`Tailwind OCD` brings Headwind-style class sorting to your workflow by calling the built-in **Tailwind CSS IntelliSense** command: `tailwindCSS.sortSelection`.

## Why Tailwind OCD?

When class strings grow wild, readability drops and reviews get noisy. This extension helps you stay focused by keeping class order predictable—every time.

## Features

- **Command:** `Tailwind OCD: Sort Tailwind Classes in Current File`
- **Auto-sort on save:** `tailwindOCD.sortOnSave` (default: `true`)
- **Powered by Tailwind CSS IntelliSense** sorting engine for reliable ordering

## Requirements

This extension depends on **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`).

Without it, sorting cannot run because Tailwind OCD delegates sorting to IntelliSense's built-in command integration.

## Build VSIX

```bash
bun install
bun run package:vsix
```

## CI

GitHub Actions workflow is available at [.github/workflows/package-vsix.yml](.github/workflows/package-vsix.yml) to:

- build the extension
- package the VSIX
- upload artifacts
