import { describe, it, expect, beforeEach } from 'bun:test'
import { addTodo, listTodos, completeTodo, deleteTodo } from '../src/store.ts'
import { unlink } from 'fs/promises'
import { join } from 'path'

const DB_PATH = join(import.meta.dir, '..', 'todos.json')

async function cleanup() {
  try {
    await unlink(DB_PATH)
  } catch {
    // file may not exist
  }
}

describe('todo store', () => {
  beforeEach(async () => {
    await cleanup()
  })

  it('adds a todo', async () => {
    const todo = await addTodo('Buy milk')
    expect(todo.title).toBe('Buy milk')
    expect(todo.completed).toBe(false)
    expect(todo.id).toBe(1)
  })

  it('lists todos', async () => {
    await addTodo('Task 1')
    await addTodo('Task 2')
    const todos = await listTodos()
    expect(todos.length).toBe(2)
    expect(todos[0]?.title).toBe('Task 1')
    expect(todos[1]?.title).toBe('Task 2')
  })

  it('completes a todo', async () => {
    const todo = await addTodo('Do laundry')
    const completed = await completeTodo(todo.id)
    expect(completed?.completed).toBe(true)
  })

  it('returns null when completing a non-existent todo', async () => {
    const result = await completeTodo(999)
    expect(result).toBeNull()
  })

  it('deletes a todo', async () => {
    const todo = await addTodo('Clean house')
    const deleted = await deleteTodo(todo.id)
    expect(deleted).toBe(true)
    const todos = await listTodos()
    expect(todos.length).toBe(0)
  })

  it('returns false when deleting a non-existent todo', async () => {
    const result = await deleteTodo(999)
    expect(result).toBe(false)
  })

  it('assigns incremental IDs', async () => {
    const t1 = await addTodo('First')
    const t2 = await addTodo('Second')
    expect(t2.id).toBe(t1.id + 1)
  })
})
