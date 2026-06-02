/*
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
import {
  makeTwitterArticleMarkdown,
  makeTwitterArticleTodoMarkdown,
} from '#domain/services/makeTwitterArticleMarkdown'
import type { AsyncUseCase } from '#domain/useCases/base'
import type { DownloadFileUseCase } from '#domain/useCases/downloadFile'
import { DownloadConfig } from '#domain/valueObjects/downloadConfig'
import { DownloadHistoryTweetUser } from '#domain/valueObjects/downloadHistoryTweetUser'
import type { FilenameSetting } from '#domain/valueObjects/filenameSetting'
import { TweetWithContent } from '#domain/valueObjects/tweetWithContent'
import { TwitterArticle } from '#domain/valueObjects/twitterArticle'
import ConflictAction from '#enums/ConflictAction'
import MediaType from '#enums/mediaType'
import type { DownloadSettings } from '#schema'
import { posix as path } from 'path'

type SaveTwitterArticleCommand = {
  tweetId: string
  screenName: string
  createdAt?: Date
}

type InfraProvider = {
  downloadHistoryRepo: IDownloadHistoryRepository
  filenameSettingRepo: ISettingsVORepository<FilenameSetting>
  downloadSettingsRepo: ISettingsRepository<DownloadSettings>
  tweetCacheRepo: ICache<TweetWithContent>
  twitterArticleCache: ICache<TwitterArticle>
  browserDownloadFile: DownloadFileUseCase
}

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

const createMarkdownDownloadUrl = (content: string) => {
  if (typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(
      new Blob([content], { type: 'text/markdown;charset=utf-8' })
    )
  }

  return `data:text/markdown;base64,${bytesToBase64(
    new TextEncoder().encode(content)
  )}`
}

export class SaveTwitterArticle implements AsyncUseCase<
  SaveTwitterArticleCommand,
  boolean
> {
  constructor(readonly infra: InfraProvider) {}

  async process(command: SaveTwitterArticleCommand): Promise<boolean> {
    const articleResult = await this.infra.twitterArticleCache.get(
      command.tweetId
    )
    const article = articleResult.value
    if (!article) return false

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
    const assetDownloadDir = filename.replace(/\.md$/, '')
    const assetMarkdownDir = path.basename(assetDownloadDir)
    const failedImageUrls = await this.downloadImages(
      article,
      assetDownloadDir,
      downloadSettings
    )
    const markdown = makeTwitterArticleMarkdown(article, {
      assetDir: assetMarkdownDir,
      failedImageUrls,
    })
    const markdownSaved = await this.downloadMarkdown(
      markdown,
      filename,
      downloadSettings
    )
    if (!markdownSaved) return false

    if (failedImageUrls.length > 0) {
      await this.downloadTodo(
        article,
        failedImageUrls,
        filename,
        downloadSettings
      )
    }

    await this.saveDownloadHistory(
      createDownloadHistory(command, cachedTweet ?? undefined, article)
    )
    return true
  }

  private async downloadImages(
    article: TwitterArticle,
    assetDownloadDir: string,
    downloadSettings: DownloadSettings
  ) {
    const failedImageUrls: string[] = []
    for (const image of article.images) {
      const error = await this.infra.browserDownloadFile.process({
        target: new DownloadConfig({
          url: image.url,
          filename: path.join(assetDownloadDir, image.filename),
          saveAs: downloadSettings.askWhereToSave,
          conflictAction: ConflictAction.Overwrite,
        }),
      })
      if (error) failedImageUrls.push(image.url)
    }
    return failedImageUrls
  }

  private async downloadMarkdown(
    content: string,
    filename: string,
    downloadSettings: DownloadSettings
  ) {
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

  private async downloadTodo(
    article: TwitterArticle,
    failedImageUrls: string[],
    filename: string,
    downloadSettings: DownloadSettings
  ) {
    const todoFilename = filename.replace(/\.md$/, '-todo.md')
    const todo = makeTwitterArticleTodoMarkdown(article, failedImageUrls)
    const result = await this.infra.browserDownloadFile.process({
      target: new DownloadConfig({
        url: createMarkdownDownloadUrl(todo),
        filename: todoFilename,
        saveAs: downloadSettings.askWhereToSave,
        conflictAction: ConflictAction.Overwrite,
      }),
    })
    if (result) {
      // eslint-disable-next-line no-console
      console.error(result)
    }
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
  command: SaveTwitterArticleCommand,
  cachedTweet: TweetWithContent | undefined,
  article: TwitterArticle
) => {
  if (cachedTweet) return tweetToDownloadHistory(cachedTweet.tweet)

  const articleProps = article.mapBy(props => props)
  return new DownloadHistory(new DownloadHistoryId(command.tweetId), {
    mediaType: MediaType.Mixed,
    downloadTime: new Date(),
    hashtags: [],
    tweetTime:
      command.createdAt ??
      (articleProps.createdAt ? new Date(articleProps.createdAt) : new Date()),
    tweetUser: new DownloadHistoryTweetUser({
      userId: '',
      displayName: command.screenName,
      screenName: command.screenName,
    }),
  })
}
