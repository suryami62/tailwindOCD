<div align="center">
  <h1>Tailwind OCD</h1>
  <p><strong>Because your <code>className</code> strings look like a cat walked across your keyboard.</strong></p>
  <p><em>Keep your Tailwind classes clean, consistent, and save your PR reviewers from quiet despair.</em></p>
</div>

---

`Tailwind OCD` forcibly brings Headwind-style class sorting directly to your workflow, seamlessly integrating with the official **Tailwind CSS IntelliSense** plugin. It automatically organizes your utility classes so you can pretend you're an organized developer.

## Why Tailwind OCD?

Let's be honest. Your `className="mt-4 bg-red-500 hover:text-white p-2 flex-col justify-center align-middle lg:p-4 opacity-50 block"` is a crime against humanity. Readability has left the chat, and your repository is a nightmare of "wait, did you put `mt-4` before or after `mb-4`?". 

Tailwind OCD restores ruthless, predictable order to this chaos. It enforces a standardized class order every single time you save. You're welcome.

## Features (That You Desperately Need)

- **One-Click Magic:** Run `Tailwind OCD: Sort Tailwind Classes in Current File` because doing it manually is a fool's errand.
- **Auto-sort on Save:** Enable `tailwindOCD.sortOnSave` (default: `true`) and let your coworkers think you actually write clean code on the first try.
- **Dynamic Class Support:** It hunts down messes even inside your `clsx`, `cn`, and `classnames` utility calls (fully customizable via `tailwindOCD.dynamicClassFunctions`).
- **Deep Clean:** Purges duplicate classes and resolves simple utility conflicts automatically (`tailwindOCD.cleanDuplicates`, `tailwindOCD.cleanConflicts`). Yes, we clean up after you.
- **Ignore Markers:** Actually proud of a specific, chaotic line of code? Just add a `tailwindocd-ignore` comment and we'll look the other way.
- **Built on Official Standards:** Powered by the **Tailwind CSS IntelliSense** sorting engine. Don't like the order? Take it up with the Tailwind team, not us.

## Requirements

You **must** have the official **Tailwind CSS IntelliSense** extension (`bradlc.vscode-tailwindcss`) installed. 

*Why?* Because rather than reinventing the wheel, we delegate to the smartest engine in the room. We just hold the whip.

## Building the Extension (VSIX)

Oh, you want to build it yourself instead of just downloading it? Have fun:

```bash
bun install
bun run package:vsix
```

## Continuous Integration

We use automated GitHub Actions because it's the future. Check out the workflow at [`.github/workflows/package-vsix.yml`](.github/workflows/package-vsix.yml) which automatically:

- Builds the extension
- Packages the VSIX
- Uploads the artifacts so you don't have to (hopefully)
