/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { ICache } from '#domain/repositories/cache'
import type {
  ISettingsRepository,
  ISettingsVORepository,
} from '#domain/repositories/settings'
import { makeTweetMarkdownFilename } from '#domain/services/makeTweetMarkdownFilename'
import type { AsyncUseCase } from '#domain/useCases/base'
import type { DownloadFileUseCase } from '#domain/useCases/downloadFile'
import { DownloadConfig } from '#domain/valueObjects/downloadConfig'
import type { FilenameSetting } from '#domain/valueObjects/filenameSetting'
import { TweetWithContent } from '#domain/valueObjects/tweetWithContent'
import ConflictAction from '#enums/ConflictAction'
import type { DownloadSettings } from '#schema'

type SaveTweetContentCommand = {
  tweetId: string
  screenName: string
  content: string
  createdAt?: Date
}

type InfraProvider = {
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

    return result === undefined
  }
}
