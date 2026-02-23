import type { ScrapingStage } from '@/schema'

export const raceList = {
  name: 'raceList',
  extractor: {
    kind: 'urls',
    fn: (html: string) => {
      // TODO: HTMLからレースURLを抽出
      // 例: cheerio でパース
      const raceUrls: string[] = []
      return raceUrls
    },
  },
} as const satisfies ScrapingStage
