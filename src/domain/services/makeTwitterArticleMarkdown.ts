/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type {
  TwitterArticle,
  TwitterArticleBlock,
  TwitterArticleImage,
  TwitterArticleInline,
  TwitterArticleProps,
} from '#domain/valueObjects/twitterArticle'
import { posix as path } from 'path'

type MarkdownOptions = {
  assetDir: string
  failedImageUrls?: string[]
}

export const makeTwitterArticleMarkdown = (
  article: TwitterArticle,
  options: MarkdownOptions
): string => {
  const props = article.mapBy(value => value)
  const failedImageUrls = new Set(options.failedImageUrls ?? [])
  const imageById = new Map(props.images.map(image => [image.imageId, image]))
  const blocks = [
    makeFrontMatter(props),
    props.title ? `# ${escapeText(props.title)}` : '',
    ...props.blocks.map(block =>
      renderBlock(block, imageById, options.assetDir, failedImageUrls)
    ),
  ].filter(Boolean)

  return `${blocks.join('\n\n')}\n`
}

export const makeTwitterArticleTodoMarkdown = (
  article: TwitterArticle,
  failedImageUrls: string[]
): string => {
  const props = article.mapBy(value => value)
  return [
    '# Download Todo',
    '',
    `Source: ${props.sourceUrl}`,
    '',
    '## Failed Images',
    '',
    ...failedImageUrls.map(url => `- ${url}`),
    '',
  ].join('\n')
}

const makeFrontMatter = (props: TwitterArticleProps): string => {
  const lines = [
    '---',
    `source: ${JSON.stringify(props.sourceUrl)}`,
    `author: ${JSON.stringify(props.screenName)}`,
    `tweet_id: ${JSON.stringify(props.tweetId)}`,
    `article_id: ${JSON.stringify(props.articleId)}`,
  ]

  if (props.createdAt)
    lines.push(`created_at: ${JSON.stringify(props.createdAt)}`)
  if (props.title) lines.push(`title: ${JSON.stringify(props.title)}`)
  lines.push('---')
  return lines.join('\n')
}

const renderBlock = (
  block: TwitterArticleBlock,
  imageById: Map<string, TwitterArticleImage>,
  assetDir: string,
  failedImageUrls: Set<string>
): string => {
  switch (block.type) {
    case 'heading':
      return `${'#'.repeat(block.level)} ${renderInlines(block.children)}`
    case 'paragraph':
      return renderInlines(block.children)
    case 'blockquote':
      return `> ${renderInlines(block.children)}`
    case 'unordered-list-item':
      return `${'  '.repeat(block.depth)}- ${renderInlines(block.children)}`
    case 'ordered-list-item':
      return `${'  '.repeat(block.depth)}1. ${renderInlines(block.children)}`
    case 'image':
      return renderImage(block.imageId, imageById, assetDir, failedImageUrls)
    case 'unknown':
      return escapeText(block.text)
  }
}

const renderImage = (
  imageId: string,
  imageById: Map<string, TwitterArticleImage>,
  assetDir: string,
  failedImageUrls: Set<string>
) => {
  const image = imageById.get(imageId)
  if (!image) return ''

  const url = failedImageUrls.has(image.url)
    ? image.url
    : path.join(assetDir, image.filename)
  return `![](${escapeUrl(url)})`
}

const renderInlines = (children: TwitterArticleInline[]) =>
  children.map(renderInline).join('')

const renderInline = (inline: TwitterArticleInline) => {
  let text = escapeText(inline.text)
  if (inline.code) text = `\`${text.replace(/`/g, '\\`')}\``
  if (inline.bold) text = `**${text}**`
  if (inline.italic) text = `*${text}*`
  if (inline.href) text = `[${text}](${escapeUrl(inline.href)})`
  return text
}

const escapeText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/([*_#[\]])/g, '\\$1')

const escapeUrl = (url: string) => url.replace(/\)/g, '%29')
