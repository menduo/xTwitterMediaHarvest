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
import { TweetWithContent } from '#domain/valueObjects/tweetWithContent'
import { SaveTweetContentMessage } from '#libs/webExtMessage'
import type { DownloadSettings } from '#schema'
import { SaveTweetContent } from '../../applicationUseCases/saveTweetContent'
import { type MessageContextHandler, makeErrorResponse } from '../messageRouter'

type InfraProvider = {
  downloadHistoryRepo: IDownloadHistoryRepository
  filenameSettingRepo: ISettingsVORepository<FilenameSetting>
  downloadSettingsRepo: ISettingsRepository<DownloadSettings>
  tweetCacheRepo: ICache<TweetWithContent>
  browserDownloadFile: DownloadFileUseCase
}

const saveTweetContentHandler =
  (infra: InfraProvider): MessageContextHandler =>
  async ctx => {
    const { value: message, error } = SaveTweetContentMessage.validate(
      ctx.message
    )
    if (error) return ctx.response(makeErrorResponse(error.message))

    try {
      const useCase = new SaveTweetContent(infra)
      const isOk = await useCase.process({
        tweetId: message.payload.tweetId,
        screenName: message.payload.screenName,
        content: message.payload.content,
        createdAt: message.payload.createdAt
          ? new Date(message.payload.createdAt)
          : undefined,
      })

      return ctx.response(
        isOk
          ? message.makeResponse(true)
          : message.makeResponse(false, 'Failed to save tweet content.')
      )
    } catch (caughtError) {
      const reason =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to save tweet content.'

      return ctx.response(makeErrorResponse(reason))
    }
  }

export default saveTweetContentHandler
