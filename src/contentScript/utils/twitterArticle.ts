/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { getClosedTargetArticle } from './article'
import { $, elementExists } from 'select-dom'

const ARTICLE_TARGET_DATASET_CRITERIA = 'harvestTwitterArticle'

export const articleHasTwitterArticle = (article: HTMLElement) =>
  elementExists('a[href*="/i/article/"]', article) ||
  Boolean(article.querySelector('[href*="/i/article/"]')) ||
  elementExists('a[href*="/article/"][href*="/media/"]', article) ||
  elementExists('[data-testid="article-cover-image"]', article) ||
  elementExists('[data-testid="twitterArticleReadView"]', article) ||
  elementExists('[data-testid="twitter-article-title"]', article) ||
  elementExists('[data-testid="twitterArticleRichTextView"]', article) ||
  elementExists('[data-testid="longformRichTextComponent"]', article)

export const setTwitterArticleTarget = <
  T extends HTMLElement | undefined | null,
>(
  article: T
) => {
  if (article) article.dataset[ARTICLE_TARGET_DATASET_CRITERIA] = 'true'
  return article
}

export const isTwitterArticleTarget = (article: HTMLElement) =>
  article.dataset[ARTICLE_TARGET_DATASET_CRITERIA] === 'true' ||
  articleHasTwitterArticle(article)

export const getTwitterArticleFromArticleChildElement = <T extends HTMLElement>(
  childElement: T
) => {
  const article = getClosedTargetArticle(childElement)
  return article && isTwitterArticleTarget(article) ? article : undefined
}

export const getTwitterArticleTitle = (article: HTMLElement) =>
  (
    $<HTMLElement>('[data-testid="twitter-article-title"]', article)
      ?.innerText ??
    $<HTMLElement>('[data-testid="tweetText"]', article)?.innerText ??
    ''
  )
    .trim()
    .split('\n')
    .at(0)
