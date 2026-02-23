import { Effect } from 'effect'
import { fetchStaticHtml, fetchDynamicHtml } from './fetch'
import type { Execute, ScrapingStageTyped } from '@/schema'
import { DEFAULT_FETCH_MODE } from './config'

// 1. URLを取得する処理
const getUrls = (stage: ScrapingStageTyped, currentUrls: string[]) =>
  Effect.gen(function*() {
    if (stage.urls) {
      return stage.urls
    } else if (stage.nextUrlRule) {
      const result = stage.nextUrlRule.execute()
      return yield* Effect.promise(() => Promise.resolve(result))
    }
    return currentUrls
  })

// 2. HTMLをフェッチする処理
const fetchHtml = (url: string, fetchMode: string | undefined) => {
  const fetchFn =
    fetchMode === DEFAULT_FETCH_MODE ? fetchStaticHtml : fetchDynamicHtml
  return fetchFn(url)
}

// 3. URLs抽出の処理
const processUrlsExtraction = (
  urls: string[],
  stage: ScrapingStageTyped,
  extractor: { kind: 'urls'; fn: (html: string) => string[] },
) =>
  Effect.gen(function*() {
    const urlResults: string[] = []
    for (const url of urls) {
      const html = yield* fetchHtml(url, stage.fetchMode)
      const extracted = extractor.fn(html)
      urlResults.push(...extracted)
    }
    return urlResults
  })

// 4. Data抽出の処理
const processDataExtraction = (
  urls: string[],
  stage: ScrapingStageTyped,
  extractor: { kind: 'data'; fn: (html: string) => unknown },
) =>
  Effect.gen(function*() {
    const dataResults: unknown[] = []
    for (const url of urls) {
      const html = yield* fetchHtml(url, stage.fetchMode)
      const extracted = extractor.fn(html)
      dataResults.push(extracted)
    }
    return dataResults
  })

// 5. 単一ステージの処理
const processStage = (stage: ScrapingStageTyped, currentUrls: string[]) =>
  Effect.gen(function*() {
    console.log(`Processing stage: ${stage.name}`)

    // 1. URLを取得
    const urlsToProcess = yield* getUrls(stage, currentUrls)

    // 2. 各URLを処理
    if (stage.extractor.kind === 'urls') {
      const urls = yield* processUrlsExtraction(
        urlsToProcess,
        stage,
        stage.extractor,
      )
      return { type: 'urls' as const, urls }
    } else {
      const data = yield* processDataExtraction(
        urlsToProcess,
        stage,
        stage.extractor,
      )
      return { type: 'data' as const, data }
    }
  })

// 6. オーケストレーション
export const execute: Execute = (stages) =>
  Effect.gen(function*() {
    let currentUrls: string[] = []

    for (const stage of stages) {
      const result = yield* processStage(stage, currentUrls)

      if (result.type === 'data') {
        return result.data
      }

      currentUrls = result.urls
    }

    throw new Error('Pipeline ended without extracting data')
  })
