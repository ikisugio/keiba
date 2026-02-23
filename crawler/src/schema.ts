import { Schema, Effect } from 'effect'

const isFunction = (u: unknown): u is Function => typeof u === 'function'

export const FunctionSchema = Schema.declare(isFunction, {
  identifier: 'Function',
  description: 'A function',
})

export const FetchModeSchema = Schema.Literal('static', 'dynamic')

export type FetchMode = Schema.Schema.Type<typeof FetchModeSchema>

export const NextUrlRuleSchema = Schema.mutable(
  Schema.Struct({
    kind: Schema.Literal('generate', 'crawl'),
    execute: FunctionSchema,
  }),
)

export type NextUrlRule = Schema.Schema.Type<typeof NextUrlRuleSchema>

export const ExtractorSchema = Schema.Union(
  Schema.mutable(
    Schema.Struct({
      kind: Schema.Literal('urls'),
      fn: FunctionSchema,
    }),
  ),
  Schema.mutable(
    Schema.Struct({
      kind: Schema.Literal('data'),
      fn: FunctionSchema,
    }),
  ),
)

export type Extractor = Schema.Schema.Type<typeof ExtractorSchema>

export const ScrapingStageSchema = Schema.mutable(
  Schema.Struct({
    name: Schema.String,
    urls: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
    fetchMode: Schema.optional(FetchModeSchema),
    nextUrlRule: Schema.optional(NextUrlRuleSchema),
    extractor: ExtractorSchema,
  }),
)

export interface ScrapingStage
  extends Schema.Schema.Type<typeof ScrapingStageSchema> { }

export type ScrapingStageTyped = {
  name: string
  urls?: string[]
  fetchMode?: FetchMode
  nextUrlRule?: {
    kind: 'generate' | 'crawl'
    execute: () => string[] | Promise<string[]>
  }
} & (
    | { extractor: { kind: 'urls'; fn: (html: string) => string[] } }
    | { extractor: { kind: 'data'; fn: (html: string) => unknown } }
  )

export type Execute = (
  stages: ScrapingStageTyped[],
) => Effect.Effect<unknown[], Error, never>
