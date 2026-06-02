/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {
  makeTwitterArticleAssetFilename,
  makeTwitterArticleOriginalImageUrl,
} from '#domain/services/makeTwitterArticleAssetFilename'
import {
  TwitterArticle,
  type TwitterArticleBlock,
  type TwitterArticleImage,
  type TwitterArticleInline,
} from '#domain/valueObjects/twitterArticle'
import { toErrorResult, toSuccessResult } from '#utils/result'

type DraftRange = {
  offset: number
  length: number
  style?: string
  key?: number
}

type DraftBlock = {
  type?: string
  text?: string
  depth?: number
  inlineStyleRanges?: DraftRange[]
  entityRanges?: DraftRange[]
}

type EntityValue = {
  type?: string
  data?: {
    url?: string
    mediaItems?: Array<{ mediaId?: string }>
  }
}

type Entity = {
  value?: EntityValue
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const parseTwitterArticleFromTweetResult = (
  tweetResult: unknown
): Result<TwitterArticle> => {
  try {
    const tweet = getRequiredRecord(tweetResult, 'tweet result')
    const articleRoot = getRequiredRecord(tweet.article, 'article')
    const articleResults = getRequiredRecord(
      articleRoot.article_results,
      'article_results'
    )
    const article = getRequiredRecord(articleResults.result, 'article result')
    const articleId = getString(article.rest_id) ?? getString(article.id)
    const tweetId =
      getString(tweet.rest_id) ?? getString(getRecord(tweet.legacy)?.id_str)
    if (!articleId || !tweetId)
      return toErrorResult(new Error('Missing article id.'))

    const screenName = getScreenName(tweet)
    const contentState = getRequiredRecord(
      article.content_state,
      'content_state'
    )
    const blocks = getArray(contentState.blocks).filter(
      isRecord
    ) as DraftBlock[]
    const entityMap = getEntityMap(contentState.entityMap)
    const images = getImages(article)

    return toSuccessResult(
      TwitterArticle.create({
        tweetId,
        articleId,
        screenName,
        title: getString(article.title),
        createdAt: getCreatedAt(tweet, article),
        sourceUrl: `https://x.com/${screenName}/status/${tweetId}`,
        blocks: parseBlocks(blocks, entityMap),
        images,
      })
    )
  } catch (error) {
    return toErrorResult(error as Error)
  }
}

const parseBlocks = (
  blocks: DraftBlock[],
  entityMap: Map<number, EntityValue>
): TwitterArticleBlock[] =>
  blocks
    .map(block => parseBlock(block, entityMap))
    .filter((block): block is TwitterArticleBlock => Boolean(block))

const parseBlock = (
  block: DraftBlock,
  entityMap: Map<number, EntityValue>
): TwitterArticleBlock | undefined => {
  const text = block.text ?? ''
  if (block.type === 'atomic') {
    const mediaId = firstMediaId(block, entityMap)
    return mediaId ? { type: 'image', imageId: mediaId } : undefined
  }

  const children = parseInlines(
    text,
    block.inlineStyleRanges ?? [],
    block.entityRanges ?? [],
    entityMap
  )

  if (children.length === 0) return undefined

  switch (block.type) {
    case 'header-one':
      return { type: 'heading', level: 1, children }
    case 'header-two':
      return { type: 'heading', level: 2, children }
    case 'header-three':
      return { type: 'heading', level: 3, children }
    case 'unordered-list-item':
      return { type: 'unordered-list-item', depth: block.depth ?? 0, children }
    case 'ordered-list-item':
      return { type: 'ordered-list-item', depth: block.depth ?? 0, children }
    case 'blockquote':
      return { type: 'blockquote', children }
    case 'unstyled':
    case undefined:
      return { type: 'paragraph', children }
    default:
      return { type: 'unknown', text }
  }
}

const parseInlines = (
  text: string,
  styleRanges: DraftRange[],
  entityRanges: DraftRange[],
  entityMap: Map<number, EntityValue>
): TwitterArticleInline[] => {
  if (text.length === 0) return []

  const points = new Set([0, text.length])
  ;[...styleRanges, ...entityRanges].forEach(range => {
    points.add(range.offset)
    points.add(range.offset + range.length)
  })
  const sorted = [...points].sort((a, b) => a - b)

  return sorted
    .slice(0, -1)
    .map((start, index) => {
      const end = sorted[index + 1]
      const segment = text.slice(start, end)
      const styles = styleRanges.filter(range => inRange(start, range))
      const entities = entityRanges
        .filter(range => inRange(start, range) && typeof range.key === 'number')
        .map(range => entityMap.get(range.key as number))
        .filter((entity): entity is EntityValue => Boolean(entity))
      const link = entities.find(entity => entity.type === 'LINK')

      return {
        text: segment,
        href: link?.data?.url,
        bold: styles.some(range => range.style === 'Bold'),
        italic: styles.some(range => range.style === 'Italic'),
        code: styles.some(range => range.style === 'Code'),
      }
    })
    .filter(inline => inline.text.length > 0)
}

const inRange = (offset: number, range: DraftRange) =>
  offset >= range.offset && offset < range.offset + range.length

const firstMediaId = (
  block: DraftBlock,
  entityMap: Map<number, EntityValue>
): string | undefined => {
  const range = block.entityRanges?.find(value => typeof value.key === 'number')
  if (!range || typeof range.key !== 'number') return undefined
  return entityMap.get(range.key)?.data?.mediaItems?.find(item => item.mediaId)
    ?.mediaId
}

const getImages = (article: Record<string, unknown>): TwitterArticleImage[] => {
  const mediaEntities = getArray(article.media_entities).filter(isRecord)
  return mediaEntities
    .map(entity => {
      const imageId = getString(entity.media_id)
      const url = getString(getRecord(entity.media_info)?.original_img_url)
      if (!imageId || !url) return undefined
      const originalUrl = makeTwitterArticleOriginalImageUrl(url)
      return {
        imageId,
        url: originalUrl,
        filename: makeTwitterArticleAssetFilename(originalUrl),
      }
    })
    .filter((image): image is TwitterArticleImage => Boolean(image))
}

const getEntityMap = (entityMap: unknown): Map<number, EntityValue> => {
  if (!isRecord(entityMap)) return new Map()
  return new Map(
    Object.entries(entityMap)
      .map(([key, entity]) => {
        const value = getRecord((entity as Entity).value)
        return value ? [Number(key), value as EntityValue] : undefined
      })
      .filter((entry): entry is [number, EntityValue] => Boolean(entry))
  )
}

const getScreenName = (tweet: Record<string, unknown>): string => {
  const userResult = getRecord(
    getRecord(getRecord(tweet.core)?.user_results)?.result
  )
  return (
    getString(getRecord(userResult?.core)?.screen_name) ??
    getString(getRecord(userResult?.legacy)?.screen_name) ??
    'unknown'
  )
}

const getCreatedAt = (
  tweet: Record<string, unknown>,
  article: Record<string, unknown>
): string | undefined => {
  const tweetCreatedAt = getString(getRecord(tweet.legacy)?.created_at)
  if (tweetCreatedAt) return new Date(tweetCreatedAt).toISOString()
  const publishedAt = getNumber(
    getRecord(article.metadata)?.first_published_at_secs
  )
  return publishedAt ? new Date(publishedAt * 1000).toISOString() : undefined
}

const getRequiredRecord = (value: unknown, name: string) => {
  if (!isRecord(value)) throw new Error(`Missing ${name}.`)
  return value
}

const getRecord = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined

const getArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : []
const getString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined
const getNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined
