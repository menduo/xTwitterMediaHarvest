import type { ICache } from '#domain/repositories/cache'
import { TwitterArticle } from '#domain/valueObjects/twitterArticle'
import { toErrorResult } from '#utils/result'

export class MockTwitterArticleCache implements ICache<TwitterArticle> {
  async get(_cacheId: string): AsyncResult<TwitterArticle | undefined, Error> {
    return toErrorResult(new Error('Method not implemented.'))
  }

  async save(_item: TwitterArticle): Promise<UnsafeTask> {
    return new Error('Method not implemented.')
  }

  async saveAll(..._items: TwitterArticle[]): Promise<UnsafeTask> {
    return new Error('Method not implemented.')
  }
}
