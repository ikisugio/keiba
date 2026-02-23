import { type Effect } from 'effect'

export type FetchHtml = (url: string) => Effect.Effect<string, Error>
