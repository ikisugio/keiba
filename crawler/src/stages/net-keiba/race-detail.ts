import type { ScrapingStage } from '@/schema'

interface RaceData {
  raceId: string
  raceName: string
  date: string
  // TODO: 必要なフィールドを追加
}

const stage = {
  name: 'raceDetail',
  extractor: {
    kind: 'data',
    fn: (html: string): RaceData => {
      // TODO: HTMLからレースデータを抽出
      // 例: cheerio でパース
      return {
        raceId: '',
        raceName: '',
        date: '',
      }
    },
  },
} as const satisfies ScrapingStage

export default stage
