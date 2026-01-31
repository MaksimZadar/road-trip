# Agent Instructions: Svelte & SvelteKit

You have access to the Svelte MCP server for comprehensive Svelte 5 and SvelteKit documentation.

## Session Context Management

### Persistent Context Storage

- **Location**: `.context/SESSION_SUMMARY.md` (gitignored)
- **Purpose**: Maintains session continuity across machines and time
- **Update Frequency**: Auto-generated at end of each session

### /end-session Command

**To use**: Simply type `/end-session` in chat before you finish working. This is not a shell command - it's a trigger for me to:

1. Generate a comprehensive session summary in `.context/SESSION_SUMMARY.md`
2. Sync any active todos from built-in tools to `.context/TODOS.md`
3. Include the following sections:
   - **Architecture State**: Current stack, patterns, key decisions
   - **Current Work**: Active feature, progress, completion %
   - **Blockers**: Any issues preventing progress
   - **Next Steps**: Prioritized list of what to do next
   - **Recent Decisions**: Important choices made this session
   - **Files Modified**: Key files touched (with line numbers if significant)
   - **Open Questions**: Anything needing clarification

### Context Recovery

**At the start of each session:**

1. **ALWAYS** Check if `.context/SESSION_SUMMARY.md` exists
2. If it does, read it first to understand current state
3. If it doesn't, treat as fresh session

## Feature Branch Workflow

### Creating New Features

When user wants to start a new feature:

1. Create branch: `feature/description` (kebab-case, descriptive)
2. Example: `feature/user-authentication`, `fix/api-timeout`

### Conventional Commits

ALWAYS use conventional commit format: `type(scope): description`

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons, etc)
- `refactor`: Code change that neither fixes bug nor adds feature
- `test`: Adding or correcting tests
- `chore`: Build process, dependencies, etc
- `ci`: CI/CD changes (GitHub Actions, pipelines)

**Examples**:

- `feat(auth): add login form with validation`
- `fix(api): handle null response in user endpoint`
- `docs(readme): update setup instructions`
- `ci(deploy): add staging deployment workflow`

## Task Tracking

### Dual System Approach

1. **Built-in Tools**: Use for ephemeral, in-session tasks
2. **Persistent Storage**: `.context/TODOS.md` for cross-session persistence

### Workflow

- **During Session**: Use built-in todo tools for immediate tasks
- **On /end-session**: Sync all incomplete todos to `.context/TODOS.md`
- **New Session**: Load todos from `.context/TODOS.md` into built-in tools

### Todo Format

```markdown
# Current Tasks

## Active Feature: [Feature Name]

### In Progress

- [ ] Task 1
- [ ] Task 2

### Blocked

- [ ] Task 3 - Waiting on API changes

### Completed (Last Session)

- [x] Task 4
```

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

1. **Always** start Svelte tasks with `list-sections`.
2. **Always** validate Svelte components with `svelte-autofixer`.
3. **Always** fetch documentation in batches to minimize tool calls.
4. **Always** read `.context/SESSION_SUMMARY.md` at session start if it exists.
5. **Always** run `/end-session` (tell me in chat) before ending to preserve context.

## Tooling

1. Use pnpm instead of npm

## Cross-Machine Sync

The `.context/` directory is gitignored by default. To sync across machines:

**Option 1: Periodic Commits**

- When you want to save state, manually commit `.context/`
- Push and pull as needed

**Option 2: Cloud Sync**

- Place `.context/` in a cloud-synced folder (Dropbox, etc.)
- Symlink to project: `ln -s ~/Dropbox/project-context ./.context`

**Option 3: Manual Copy**

- Copy `.context/` to USB/drive when switching machines
- Simple but requires manual effort
