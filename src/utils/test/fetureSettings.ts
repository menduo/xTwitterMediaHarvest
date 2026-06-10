import type { FeatureSettings } from '#schema'
import { faker } from '@faker-js/faker/locale/en'

export const generateFeatureSettings = (): FeatureSettings => ({
  autoRevealNsfw: faker.datatype.boolean(),
  hoverTriggerDownload: faker.datatype.boolean(),
  hoverTriggerDownloadDelayMs: faker.number.int({ min: 100, max: 1000 }),
  allowRedownloadExistingTweet: faker.datatype.boolean(),
  redownloadExistingTweetDelayDays: faker.number.int({ min: 0, max: 30 }),
  includeVideoThumbnail: faker.datatype.boolean(),
  keyboardShortcut: faker.datatype.boolean(),
})
