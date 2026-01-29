# Agent Instructions: Svelte & SvelteKit

You have access to the Svelte MCP server for comprehensive Svelte 5 and SvelteKit documentation.

## Svelte MCP Tools

### 1. Discovery & Documentation

- **list-sections**: Run this **FIRST** for any Svelte/SvelteKit query to discover relevant documentation.
- **get-documentation**: After listing sections, analyze the `use_cases` and fetch **ALL** relevant documentation sections at once.

### 2. Code Quality & Validation

- **svelte-autofixer**: You **MUST** run this on any Svelte code before presenting it to the user. Iterate until no issues remain.
- **playground-link**: Offer a playground link only after code is finalized and **ONLY** if the code was not written directly to the project files.

## Documentation Searching

For general library or framework documentation outside of Svelte, use the `context7` tools.

## Workflow Requirements

1.  **Always** start Svelte tasks with `list-sections`.
2.  **Always** validate Svelte components with `svelte-autofixer`.
3.  **Always** fetch documentation in batches to minimize tool calls.

## Tooling

1. Use pnpm instead of npm
