import type { ScrapingStage } from '@/schema'

export const calendar = {
  name: 'calendar',
  nextUrlRule: {
    kind: 'generate',
    execute: () => {
      // TODO: 日付範囲からURL生成
      // 日付範囲の切り替えが js 処理なので playwright で fetch
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
