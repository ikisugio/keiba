import {
  netKeibaCalendarStage,
  netKeibaRaceDetailStage,
  netKeibaRaceListStage,
} from './stages'
import type { ScrapingStage } from './schema'

export const STAGES = [
  netKeibaCalendarStage,
  netKeibaRaceListStage,
  netKeibaRaceDetailStage,
] as const satisfies ScrapingStage[]
