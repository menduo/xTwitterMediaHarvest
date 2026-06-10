/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { CheckDownloadHistoryMessage } from '#libs/webExtMessage'
import type { InfraProvider } from '../../applicationUseCases/checkMediaTweetHasBeenDownloaded'
import { type MessageContextHandler, makeErrorResponse } from '../messageRouter'

const checkDownloadHistoryHandler = (
  infraProvider: InfraProvider
): MessageContextHandler => {
  return async ctx => {
    const { value: message, error } = CheckDownloadHistoryMessage.validate(
      ctx.message
    )
    if (error) return ctx.response(makeErrorResponse(error.message))

    const { value: history, error: historyError } =
      await infraProvider.downloadHistoryRepo.getByTweetId(
        message.payload.tweetId
      )
    if (historyError) {
      // eslint-disable-next-line no-console
      console.error(historyError)
      return ctx.response(message.makeResponse(true, { isExist: false }))
    }

    return ctx.response(
      message.makeResponse(true, {
        isExist: !!history,
        downloadTime: history?.mapBy((_, props) =>
          props.downloadTime.toISOString()
        ),
      })
    )
  }
}

export default checkDownloadHistoryHandler
