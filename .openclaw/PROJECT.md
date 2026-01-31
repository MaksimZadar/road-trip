# OpenClaw Project Context

## Project: Road Trip Planner - Family Edition
Type: SvelteKit full-stack application
Purpose: Self-hosted family trip planning with route visualization

## Development Workflow

### 1. Branch Management
- Every new feature must have its own branch
- Branch naming: `feature/feature-name` or `fix/bug-description`
- Base branch: `main` or current working branch

### 2. Todo List Management
- Plan new features by listing them in `.openclaw/TODOS.md`
- Each todo should be a checkbox item: `- [ ] Task description`
- Update todos as you work - mark completed items: `- [x] Task description`
- Push updated todos with each implementation
- Include completed todos in PR description for easy code review (copy from TODOS.md)

### 3. Commit & Push Process
- Implement the feature/fix
- Update `.openclaw/TODOS.md` to mark items complete
- Commit changes (follow conventional commit format)
- Push to remote branch
- Create pull request with todo list in description for easy review

### Example Workflow:
```bash
git checkout -b feature/add-map-markers
# Edit .openclaw/TODOS.md to add new tasks
# Example todo items:
# - [ ] Add marker component
# - [ ] Connect markers to trip stops
# - [ ] Add marker click handlers

# Implement markers functionality
# Update .openclaw/TODOS.md to mark completed:
# - [x] Add marker component
# - [x] Connect markers to trip stops
# - [x] Add marker click handlers

# Commit and push
git add .
git commit -m "feat: add map markers for stops"
git push origin feature/add-map-markers

# Create PR with description like:
# "## Map Markers
# This PR adds interactive markers to the trip map.
# 
# Todos completed:
# - [x] Add marker component
# - [x] Connect markers to trip stops  
# - [x] Add marker click handlers"
```

## Git Commit Conventions
All commits must follow **Conventional Commits** format:
- Format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Current Development
Branch: social-login
Status: Family-focused version, removing auth complexity