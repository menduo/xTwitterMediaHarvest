/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import makeHarvester from '../core'
import {
  articleHasTwitterArticle,
  setTwitterArticleTarget,
} from '../utils/twitterArticle'
import { $, $$ } from 'select-dom'

const enum Query {
  Root = '#react-root',
  Stream = 'section[role="region"] > div[aria-label] > div',
  Timeline = '[data-testid="primaryColumn"] [aria-label]',
}

const getArticlesFromNode = (node: HTMLElement): HTMLElement[] => {
  const articles = $$<HTMLElement>('article', node)
  const currentArticle = node.closest<HTMLElement>('article')
  if (currentArticle) articles.unshift(currentArticle)
  if (node.matches('article')) articles.unshift(node)
  return [...new Set(articles)]
}

const initializeArticles = (articles: HTMLElement[]) => {
  articles.forEach(article => {
    if (articleHasTwitterArticle(article))
      makeHarvester(setTwitterArticleTarget(article))
  })
}

export default class TwitterArticleObserver implements IHarvestObserver {
  readonly observedElements = new WeakSet<HTMLElement>()

  initialize() {
    initializeArticles($$<HTMLElement>('article'))
  }

  private observeTarget(
    target: HTMLElement,
    callback: MutationCallback,
    options: MutationObserverInit = { childList: true, subtree: true }
  ) {
    if (this.observedElements.has(target)) return

    const observer = new MutationObserver(callback)
    observer.observe(target, options)
    this.observedElements.add(target)
  }

  private observeTargets(selector: string, callback: MutationCallback) {
    $$<HTMLElement>(selector).forEach(target =>
      this.observeTarget(target, callback)
    )
  }

  observeRoot() {
    this.initialize()
    const root = $<HTMLElement>(Query.Root) ?? document.body
    this.observeTarget(root, () => {
      this.initialize()
      this.observeStream()
      this.observeTimeline()
    })

    this.observeStream()
    this.observeTimeline()
  }

  observeStream() {
    this.observeTargets(Query.Stream, mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return
          initializeArticles(getArticlesFromNode(node))
        })
      })
    })
  }

  observeTimeline() {
    this.observeTargets(Query.Timeline, () => this.initialize())
  }
}
