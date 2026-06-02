/**
 * @jest-environment jsdom
 */
import { articleHasTwitterArticle } from './twitterArticle'

describe('twitterArticle helpers', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('detects an explicit article link', () => {
    document.body.innerHTML = `
      <article>
        <a href="/i/article/456">Article</a>
      </article>
    `

    expect(articleHasTwitterArticle(document.querySelector('article')!)).toBe(
      true
    )
  })

  it('detects profile timeline article previews', () => {
    document.body.innerHTML = `
      <article>
        <div data-testid="article-cover-image">Article</div>
      </article>
    `

    expect(articleHasTwitterArticle(document.querySelector('article')!)).toBe(
      true
    )
  })

  it('detects article detail pages from the article read view', () => {
    document.body.innerHTML = `
      <article>
        <div data-testid="twitterArticleReadView">
          <div data-testid="twitter-article-title">Article title</div>
          <div data-testid="longformRichTextComponent">Article body</div>
        </div>
      </article>
    `

    expect(articleHasTwitterArticle(document.querySelector('article')!)).toBe(
      true
    )
  })

  it('detects article detail pages from article media links', () => {
    document.body.innerHTML = `
      <article>
        <a href="/alice/article/123/media/456">Image</a>
      </article>
    `

    expect(articleHasTwitterArticle(document.querySelector('article')!)).toBe(
      true
    )
  })

  it('does not treat generic external cards as articles', () => {
    document.body.innerHTML = `
      <article>
        <div data-testid="card.wrapper">
          <a href="https://t.co/abc">Card</a>
        </div>
      </article>
    `

    expect(articleHasTwitterArticle(document.querySelector('article')!)).toBe(
      false
    )
  })
})
