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

type SaveTweetContentMessagePayload = {
  tweetId: string
  screenName: string
  content: string
  createdAt?: string
}

const messageSchema: Joi.ObjectSchema<
  WebExtMessagePayloadObject<
    WebExtAction.SaveTweetContent,
    SaveTweetContentMessagePayload
  >
> = Joi.object({
  action: Joi.valid(WebExtAction.SaveTweetContent).required(),
  payload: Joi.object({
    tweetId: Joi.string().required(),
    screenName: Joi.string().required(),
    content: Joi.string().required(),
    createdAt: Joi.string().isoDate().optional(),
  }).required(),
})

export class SaveTweetContentMessage implements WebExtMessage<
  WebExtAction.SaveTweetContent,
  SaveTweetContentMessagePayload
> {
  constructor(readonly payload: SaveTweetContentMessagePayload) {}

  static validate(message: unknown): Result<SaveTweetContentMessage> {
    const { value, error } = messageSchema.validate(message)
    return error
      ? toErrorResult(error)
      : toSuccessResult(new SaveTweetContentMessage(value.payload))
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
    WebExtAction.SaveTweetContent,
    SaveTweetContentMessagePayload
  > {
    return {
      action: WebExtAction.SaveTweetContent,
      payload: this.payload,
    }
  }
}
