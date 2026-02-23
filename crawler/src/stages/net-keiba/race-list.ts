import type { ScrapingStage } from '@/schema'

const stage = {
  name: 'raceList',
  fetchMode: 'static',
  extractor: {
    kind: 'urls',
    fn: (html: string) => {
      // TODO: HTMLからレースURLを抽出
      const raceUrls: string[] = []
      return raceUrls
    },
  },
} as const satisfies ScrapingStage

export default stage
