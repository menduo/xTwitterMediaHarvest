/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { ICache } from '#domain/repositories/cache'
import {
  TwitterArticle,
  type TwitterArticleProps,
} from '#domain/valueObjects/twitterArticle'
import { TimeHelper } from '#helpers/time'
import { toErrorResult, toSuccessResult } from '#utils/result'
import Joi from 'joi'

const inlineSchema = Joi.object({
  text: Joi.string().required(),
  href: Joi.string().optional(),
  bold: Joi.boolean().optional(),
  italic: Joi.boolean().optional(),
  code: Joi.boolean().optional(),
})

const blockSchema = Joi.object({
  type: Joi.string().required(),
  level: Joi.number().optional(),
  depth: Joi.number().optional(),
  children: Joi.array().items(inlineSchema).optional(),
  imageId: Joi.string().optional(),
  alt: Joi.string().optional(),
  text: Joi.string().optional(),
})

const imageSchema = Joi.object({
  imageId: Joi.string().required(),
  url: Joi.string().required(),
  filename: Joi.string().required(),
})

const articleSchema: Joi.ObjectSchema<TwitterArticleProps> = Joi.object({
  tweetId: Joi.string().required(),
  articleId: Joi.string().required(),
  screenName: Joi.string().required(),
  title: Joi.string().optional(),
  createdAt: Joi.string().optional(),
  sourceUrl: Joi.string().required(),
  blocks: Joi.array().items(blockSchema).required(),
  images: Joi.array().items(imageSchema).required(),
})

export class TwitterArticleCache implements ICache<TwitterArticle> {
  private cache?: Cache

  protected async getCache() {
    return (this.cache ??= await caches.open('twitter-article'))
  }

  async get(cacheId: string): AsyncResult<TwitterArticle | undefined, Error> {
    try {
      const cache = await this.getCache()
      const response = await cache.match(
        new Request(makeFakeArticleUrl(cacheId))
      )
      if (!response) return toSuccessResult(undefined)

      const data = await response.json()
      const { value, error } = articleSchema.validate(data)
      if (error) return toErrorResult(error)

      return toSuccessResult(TwitterArticle.create(value))
    } catch (error) {
      return toErrorResult(error as Error)
    }
  }

  async save(item: TwitterArticle): Promise<UnsafeTask> {
    try {
      const cache = await this.getCache()
      const response = new Response(JSON.stringify(item), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${TimeHelper.hour(24)}`,
        },
      })

      await cache.put(new Request(makeFakeArticleUrl(item.id)), response)
      return undefined
    } catch (error) {
      return error as Error
    }
  }

  async saveAll(...items: TwitterArticle[]): Promise<UnsafeTask> {
    const errors = await Promise.all(items.map(item => this.save(item)))
    if (errors.some(error => error))
      return new Error('Failed to cache some twitter articles', {
        cause: errors,
      })
  }
}

const makeFakeArticleUrl = (tweetId: string) =>
  `http://mediaharvest.local/twitter-articles/${tweetId}`
