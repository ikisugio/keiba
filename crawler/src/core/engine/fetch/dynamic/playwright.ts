import { Effect } from 'effect'
import { chromium, type Browser } from 'playwright'
import type { FetchHtml } from '../schema'

let browser: Browser | null = null

export const fetchHtml: FetchHtml = (url: string) =>
  Effect.tryPromise({
    try: async () => {
      if (!browser) {
        browser = await chromium.launch({ headless: true })
      }
      const page = await browser.newPage()
      try {
        await page.goto(url, { waitUntil: 'networkidle' })
        return await page.content()
      } finally {
        await page.close()
      }
    },
    catch: (error) => new Error(`Failed to fetch ${url}: ${error}`),
  })
