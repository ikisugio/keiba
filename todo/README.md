# Todo App

A simple CLI todo application built with Bun and TypeScript.

## Usage

```sh
# Add a todo
bun src/index.ts add Buy groceries

# List all todos
bun src/index.ts list

# Mark a todo as complete
bun src/index.ts complete 1

# Delete a todo
bun src/index.ts delete 1
```

## Development

```sh
# Run tests
bun test
```

Todos are persisted in `todos.json` in the project root.
