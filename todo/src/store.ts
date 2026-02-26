import { join } from 'path'
import type { Todo } from './types.ts'

const DB_PATH = join(import.meta.dir, '..', 'todos.json')

export async function loadTodos(): Promise<Todo[]> {
  try {
    const file = Bun.file(DB_PATH)
    if (!(await file.exists())) return []
    return (await file.json()) as Todo[]
  } catch {
    return []
  }
}

export async function saveTodos(todos: Todo[]): Promise<void> {
  await Bun.write(DB_PATH, JSON.stringify(todos, null, 2))
}

export async function addTodo(title: string): Promise<Todo> {
  const todos = await loadTodos()
  const newTodo: Todo = {
    id: todos.length > 0 ? Math.max(...todos.map((t) => t.id)) + 1 : 1,
    title,
    completed: false,
    createdAt: new Date().toISOString(),
  }
  todos.push(newTodo)
  await saveTodos(todos)
  return newTodo
}

export async function listTodos(): Promise<Todo[]> {
  return loadTodos()
}

export async function completeTodo(id: number): Promise<Todo | null> {
  const todos = await loadTodos()
  const todo = todos.find((t) => t.id === id)
  if (!todo) return null
  todo.completed = true
  await saveTodos(todos)
  return todo
}

export async function deleteTodo(id: number): Promise<boolean> {
  const todos = await loadTodos()
  const index = todos.findIndex((t) => t.id === id)
  if (index === -1) return false
  todos.splice(index, 1)
  await saveTodos(todos)
  return true
}
