import { addTodo, listTodos, completeTodo, deleteTodo } from './store.ts'
import type { Todo } from './types.ts'

function formatTodo(todo: Todo): string {
  const status = todo.completed ? '✓' : '○'
  return `[${status}] #${todo.id} ${todo.title}`
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case 'add': {
      const title = args.slice(1).join(' ')
      if (!title) {
        console.error('Usage: todo add <title>')
        process.exit(1)
      }
      const todo = await addTodo(title)
      console.log(`Added: ${formatTodo(todo)}`)
      break
    }

    case 'list': {
      const todos = await listTodos()
      if (todos.length === 0) {
        console.log('No todos yet. Add one with: todo add <title>')
      } else {
        todos.forEach((t) => console.log(formatTodo(t)))
      }
      break
    }

    case 'complete': {
      const id = Number(args[1])
      if (isNaN(id) || id <= 0) {
        console.error('Usage: todo complete <id>')
        process.exit(1)
      }
      const todo = await completeTodo(id)
      if (!todo) {
        console.error(`Todo #${id} not found`)
        process.exit(1)
      }
      console.log(`Completed: ${formatTodo(todo)}`)
      break
    }

    case 'delete': {
      const id = Number(args[1])
      if (isNaN(id) || id <= 0) {
        console.error('Usage: todo delete <id>')
        process.exit(1)
      }
      const deleted = await deleteTodo(id)
      if (!deleted) {
        console.error(`Todo #${id} not found`)
        process.exit(1)
      }
      console.log(`Deleted todo #${id}`)
      break
    }

    default: {
      console.log('Todo App')
      console.log('Commands:')
      console.log('  add <title>     Add a new todo')
      console.log('  list            List all todos')
      console.log('  complete <id>   Mark a todo as complete')
      console.log('  delete <id>     Delete a todo')
      break
    }
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
