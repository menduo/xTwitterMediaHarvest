/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {
  DownloadHistory,
  DownloadHistoryId,
} from '#domain/entities/downloadHistory'
import { tweetToDownloadHistory } from '#domain/factories/tweetToDownloadHistory'
import type { ICache } from '#domain/repositories/cache'
import type { IDownloadHistoryRepository } from '#domain/repositories/downloadHistory'
import type {
  ISettingsRepository,
  ISettingsVORepository,
} from '#domain/repositories/settings'
import { makeTweetMarkdownFilename } from '#domain/services/makeTweetMarkdownFilename'
import type { AsyncUseCase } from '#domain/useCases/base'
import type { DownloadFileUseCase } from '#domain/useCases/downloadFile'
import { DownloadConfig } from '#domain/valueObjects/downloadConfig'
import { DownloadHistoryTweetUser } from '#domain/valueObjects/downloadHistoryTweetUser'
import type { FilenameSetting } from '#domain/valueObjects/filenameSetting'
import { TweetWithContent } from '#domain/valueObjects/tweetWithContent'
import ConflictAction from '#enums/ConflictAction'
import MediaType from '#enums/mediaType'
import type { DownloadSettings } from '#schema'

type SaveTweetContentCommand = {
  tweetId: string
  screenName: string
  content: string
  createdAt?: Date
}

type InfraProvider = {
  downloadHistoryRepo: IDownloadHistoryRepository
  filenameSettingRepo: ISettingsVORepository<FilenameSetting>
  downloadSettingsRepo: ISettingsRepository<DownloadSettings>
  tweetCacheRepo: ICache<TweetWithContent>
  browserDownloadFile: DownloadFileUseCase
}

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

const createMarkdownDataUrl = (content: string) =>
  `data:text/markdown;base64,${bytesToBase64(new TextEncoder().encode(content))}`

const createMarkdownDownloadUrl = (content: string) => {
  if (typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(
      new Blob([content], { type: 'text/markdown;charset=utf-8' })
    )
  }

  return createMarkdownDataUrl(content)
}

export class SaveTweetContent implements AsyncUseCase<
  SaveTweetContentCommand,
  boolean
> {
  constructor(readonly infra: InfraProvider) {}

  async process(command: SaveTweetContentCommand): Promise<boolean> {
    const content = command.content.trim()
    if (content.length === 0) return false

    const [filenameSetting, downloadSettings, cacheResult] = await Promise.all([
      this.infra.filenameSettingRepo.get(),
      this.infra.downloadSettingsRepo.get(),
      this.infra.tweetCacheRepo.get(command.tweetId),
    ])

    const cachedTweet = cacheResult.value
    const createdAt =
      cachedTweet?.tweet.mapBy(props => props.createdAt) ?? command.createdAt
    const userId = cachedTweet?.tweet.user.mapBy(props => props.userId)
    const filename = makeTweetMarkdownFilename(filenameSetting, {
      tweetId: command.tweetId,
      screenName: command.screenName,
      createdAt,
      userId,
    })

    const result = await this.infra.browserDownloadFile.process({
      target: new DownloadConfig({
        url: createMarkdownDownloadUrl(content),
        filename,
        saveAs: downloadSettings.askWhereToSave,
        conflictAction: ConflictAction.Overwrite,
      }),
    })

    if (result !== undefined) return false

    await this.saveDownloadHistory(
      createDownloadHistory(command, cachedTweet ?? undefined)
    )

    return true
  }

  private async saveDownloadHistory(downloadHistory: DownloadHistory) {
    const saveHistoryError =
      await this.infra.downloadHistoryRepo.save(downloadHistory)
    if (saveHistoryError) {
      // eslint-disable-next-line no-console
      console.error(saveHistoryError)
    }
  }
}

const createDownloadHistory = (
  command: SaveTweetContentCommand,
  cachedTweet?: TweetWithContent
) => {
  if (cachedTweet) {
    return tweetToDownloadHistory(cachedTweet.tweet)
  }

  return new DownloadHistory(new DownloadHistoryId(command.tweetId), {
    mediaType: MediaType.Mixed,
    downloadTime: new Date(),
    hashtags: [],
    tweetTime: command.createdAt ?? new Date(),
    tweetUser: new DownloadHistoryTweetUser({
      userId: '',
      displayName: command.screenName,
      screenName: command.screenName,
    }),
  })
}
