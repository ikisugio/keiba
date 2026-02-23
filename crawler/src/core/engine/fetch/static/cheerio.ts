import { Effect } from 'effect'
import type { FetchHtml } from '../schema'

export const fetchHtml: FetchHtml = (url: string) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return await response.text()
    },
    catch: (error) => new Error(`Failed to fetch ${url}: ${error}`),
  })
