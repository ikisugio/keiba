import type { ScrapingStage } from '@/schema'

const stage = {
  name: 'calendar',
  fetchMode: 'dynamic',
  nextUrlRule: {
    kind: 'generate',
    execute: () => {
      // TODO: 日付範囲からURL生成
      const urls: string[] = []
      return urls
    },
  },
  extractor: {
    kind: 'urls',
    fn: (html: string) => {
      // TODO: HTMLから開催日URLを抽出
      return []
    },
  },
} as const satisfies ScrapingStage

export default stage
