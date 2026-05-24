/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { IXTransactionIdRepository } from '#domain/repositories/xTransactionId'
import { TransactionIdProvider } from '#domain/useCases/fetchTweetSolution'
import { TweetInfo } from '#domain/valueObjects/tweetInfo'
import { XTransactionId } from '#domain/valueObjects/xTransactionId'
import { DownloadTweetMediaMessage, sendTabMessage } from '#libs/webExtMessage'
import { RequestTransactionIdMessage } from '#libs/webExtMessage/messages/requestTransactionId'
import { toErrorResult, toSuccessResult } from '#utils/result'
import {
  DownloadTweetMedia,
  type InfraProvider,
} from '../../applicationUseCases/downloadTweetMedia'
import { type MessageContextHandler, makeErrorResponse } from '../messageRouter'
import { Runtime, Tabs } from 'webextension-polyfill'

const TRANSACTION_ID_TIMEOUT_MS = 1500

const isSenderTab = (
  sender: Runtime.MessageSender
): sender is Runtime.MessageSender & { tab: Tabs.Tab } =>
  sender.tab !== undefined

const xUrlPattern = /^https:\/\/(www\.)?x\.com\//

const isXTab = (url: string | undefined): boolean =>
  typeof url === 'string' && xUrlPattern.test(url)

const isTabTransactionIdProvider = (
  tab: Tabs.Tab
): tab is Tabs.Tab & { id: number; url: string } =>
  typeof tab.id === 'number' && isXTab(tab.url)

const tabTransactionIdProvider =
  (
    tabId: number,
    xTransactionIdRepo?: IXTransactionIdRepository
  ): TransactionIdProvider =>
  async (path, method) => {
    const endpointResult = XTransactionId.parseEndpoint(path)
    if (xTransactionIdRepo && endpointResult.value) {
      const cachedTxIdResult = await xTransactionIdRepo.get(
        endpointResult.value
      )

      if (cachedTxIdResult.value)
        return toSuccessResult(
          cachedTxIdResult.value.mapBy(props => props.value)
        )
    }

    const response: Awaited<ReturnType<ReturnType<typeof sendTabMessage>>> =
      await Promise.race([
        sendTabMessage(tabId)(
          new RequestTransactionIdMessage({ path, method })
        ),
        new Promise<Awaited<ReturnType<ReturnType<typeof sendTabMessage>>>>(
          resolve => {
            setTimeout(
              () =>
                resolve({
                  status: 'error',
                  reason: 'Timed out while requesting transaction id.',
                }),
              TRANSACTION_ID_TIMEOUT_MS
            )
          }
        ),
      ])

    return hasTransactionIdPayload(response)
      ? toSuccessResult(response.payload.transactionId)
      : toErrorResult(new Error('Failed to request transaction id'))
  }

const hasTransactionIdPayload = (
  response: Awaited<ReturnType<ReturnType<typeof sendTabMessage>>>
): response is { status: 'ok'; payload: { transactionId: string } } =>
  response.status === 'ok' &&
  'payload' in response &&
  typeof response.payload === 'object' &&
  response.payload !== null &&
  'transactionId' in response.payload &&
  typeof response.payload.transactionId === 'string'

const downloadMessageHandler = (
  infraProvider: InfraProvider
): MessageContextHandler => {
  const downloadTweetMedia = new DownloadTweetMedia(infraProvider)

  return async ctx => {
    const { value: message, error } = DownloadTweetMediaMessage.validate(
      ctx.message
    )
    if (error) return ctx.response(makeErrorResponse(error.message))

    try {
      const isOk = await downloadTweetMedia.process({
        tweetInfo: new TweetInfo(message.payload),
        xTransactionIdProvider:
          isSenderTab(ctx.sender) && isTabTransactionIdProvider(ctx.sender.tab)
            ? tabTransactionIdProvider(
                ctx.sender.tab.id,
                infraProvider.xTransactionIdRepo
              )
            : undefined,
      })

      return ctx.response(
        isOk
          ? message.makeResponse(isOk)
          : message.makeResponse(isOk, 'Failed to complete download task.')
      )
    } catch (caughtError) {
      const reason =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to complete download task.'

      return ctx.response(makeErrorResponse(reason))
    }
  }
}

export default downloadMessageHandler
