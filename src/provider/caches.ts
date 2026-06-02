import { TweetResponseCache } from '#infra/caches/tweetResponseCache'
import { TwitterArticleCache } from '#infra/caches/twitterArticleCache'

export const tweetResponseCache = new TweetResponseCache()
export const twitterArticleCache = new TwitterArticleCache()
