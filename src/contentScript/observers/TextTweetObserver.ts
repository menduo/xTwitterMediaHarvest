/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import makeHarvester from '../core'
import {
  articleHasTextOnlyDownloadableContent,
  setTextOnlyTargetArticle,
} from '../utils/article'
import { $, $$ } from 'select-dom'

const enum Query {
  Root = '#react-root',
  Stream = 'section[role="region"] > div[aria-label] > div',
  Timeline = '[data-testid="primaryColumn"] [aria-label]',
  Columns = 'main[role="main"] > div > div > div',
  DeckStream = '[data-testid="multi-column-layout-column-content"] > section[role="region"] > div[aria-label] > div',
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
    if (articleHasTextOnlyDownloadableContent(article))
      makeHarvester(setTextOnlyTargetArticle(article))
  })
}

export default class TextTweetObserver implements IHarvestObserver {
  readonly observedElements = new WeakSet<HTMLElement>()

  constructor(readonly mode: 'twitter' | 'tweetdeck') {}

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

  private observeTargets(
    selector: string,
    callback: MutationCallback,
    options: MutationObserverInit = { childList: true, subtree: true }
  ) {
    $$<HTMLElement>(selector).forEach(target =>
      this.observeTarget(target, callback, options)
    )
  }

  observeRoot() {
    this.initialize()
    const root = $<HTMLElement>(Query.Root) ?? document.body
    this.observeTarget(
      root,
      () => {
        this.initialize()
        if (this.mode === 'twitter') {
          this.observeStream()
          this.observeTimeline()
          return
        }

        this.observeDeckStream()
        this.observeColumns()
      },
      { childList: true, subtree: true }
    )

    if (this.mode === 'twitter') {
      this.observeStream()
      this.observeTimeline()
      return
    }

    this.observeDeckStream()
    this.observeColumns()
  }

  observeStream() {
    if (this.mode !== 'twitter') return

    this.observeTargets(
      Query.Stream,
      mutations => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (!(node instanceof HTMLElement)) return
            initializeArticles(getArticlesFromNode(node))
          })
        })
      },
      { childList: true, subtree: true }
    )
  }

  observeTimeline() {
    if (this.mode !== 'twitter') return

    this.observeTargets(
      Query.Timeline,
      () => {
        this.initialize()
      },
      { childList: true, subtree: true }
    )
  }

  observeDeckStream() {
    if (this.mode !== 'tweetdeck') return

    $$<HTMLElement>(Query.DeckStream).forEach(stream => {
      this.observeTarget(stream, mutations => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (!(node instanceof HTMLElement)) return
            initializeArticles(getArticlesFromNode(node))
          })
        })
      })
    })
  }

  observeColumns() {
    if (this.mode !== 'tweetdeck') return

    this.observeTargets(
      Query.Columns,
      mutations => {
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length) this.observeDeckStream()
        })
      },
      { childList: true }
    )
  }
}
