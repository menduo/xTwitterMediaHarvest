/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { toErrorResult, toSuccessResult } from '#utils/result'
import {
  WebExtAction,
  WebExtMessage,
  WebExtMessageErrorResponse,
  WebExtMessagePayloadObject,
  WebExtMessageResponse,
} from './base'
import Joi from 'joi'

type SaveTwitterArticleMessagePayload = {
  tweetId: string
  screenName: string
  createdAt?: string
}

const messageSchema: Joi.ObjectSchema<
  WebExtMessagePayloadObject<
    WebExtAction.SaveTwitterArticle,
    SaveTwitterArticleMessagePayload
  >
> = Joi.object({
  action: Joi.valid(WebExtAction.SaveTwitterArticle).required(),
  payload: Joi.object({
    tweetId: Joi.string().required(),
    screenName: Joi.string().required(),
    createdAt: Joi.string().isoDate().optional(),
  }).required(),
})

export class SaveTwitterArticleMessage implements WebExtMessage<
  WebExtAction.SaveTwitterArticle,
  SaveTwitterArticleMessagePayload
> {
  constructor(readonly payload: SaveTwitterArticleMessagePayload) {}

  static validate(message: unknown): Result<SaveTwitterArticleMessage> {
    const { value, error } = messageSchema.validate(message)
    return error
      ? toErrorResult(error)
      : toSuccessResult(new SaveTwitterArticleMessage(value.payload))
  }

  makeResponse(isOk: true): WebExtMessageResponse
  makeResponse(isOk: false, reason: string): WebExtMessageErrorResponse
  makeResponse(
    ...args: [true] | [false, string]
  ): WebExtMessageResponse | WebExtMessageErrorResponse {
    const [isOk, reason] = args
    return isOk ? { status: 'ok' } : { status: 'error', reason }
  }

  toObject(): WebExtMessagePayloadObject<
    WebExtAction.SaveTwitterArticle,
    SaveTwitterArticleMessagePayload
  > {
    return {
      action: WebExtAction.SaveTwitterArticle,
      payload: this.payload,
    }
  }
}
