/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { ICache } from '#domain/repositories/cache'
import type { IDownloadHistoryRepository } from '#domain/repositories/downloadHistory'
import type {
  ISettingsRepository,
  ISettingsVORepository,
} from '#domain/repositories/settings'
import type { DownloadFileUseCase } from '#domain/useCases/downloadFile'
import type { FilenameSetting } from '#domain/valueObjects/filenameSetting'
import type { TweetWithContent } from '#domain/valueObjects/tweetWithContent'
import type { TwitterArticle } from '#domain/valueObjects/twitterArticle'
import { SaveTwitterArticleMessage } from '#libs/webExtMessage'
import type { DownloadSettings } from '#schema'
import { SaveTwitterArticle } from '../../applicationUseCases/saveTwitterArticle'
import { type MessageContextHandler, makeErrorResponse } from '../messageRouter'

type InfraProvider = {
  downloadHistoryRepo: IDownloadHistoryRepository
  filenameSettingRepo: ISettingsVORepository<FilenameSetting>
  downloadSettingsRepo: ISettingsRepository<DownloadSettings>
  tweetCacheRepo: ICache<TweetWithContent>
  twitterArticleCache: ICache<TwitterArticle>
  browserDownloadFile: DownloadFileUseCase
}

const saveTwitterArticleHandler =
  (infra: InfraProvider): MessageContextHandler =>
  async ctx => {
    const { value: message, error } = SaveTwitterArticleMessage.validate(
      ctx.message
    )
    if (error) return ctx.response(makeErrorResponse(error.message))

    try {
      const useCase = new SaveTwitterArticle(infra)
      const isOk = await useCase.process({
        tweetId: message.payload.tweetId,
        screenName: message.payload.screenName,
        createdAt: message.payload.createdAt
          ? new Date(message.payload.createdAt)
          : undefined,
      })

      return ctx.response(
        isOk
          ? message.makeResponse(true)
          : message.makeResponse(false, 'Failed to save twitter article')
      )
    } catch (error) {
      return ctx.response(message.makeResponse(false, (error as Error).message))
    }
  }

export default saveTwitterArticleHandler
