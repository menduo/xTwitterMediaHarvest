/**
 * @jest-environment jsdom
 */
import makeHarvester from '../core'
import TextTweetObserver from './TextTweetObserver'
import { waitFor } from '@testing-library/dom'

jest.mock('../core', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockedMakeHarvester = jest.mocked(makeHarvester)

const createArticle = (content?: string) => `
  <article>
    <div role="group" aria-label="Actions"></div>
    <div data-testid="reply"><div><svg></svg></div></div>
    ${content ? `<div data-testid="tweetText">${content}</div>` : ''}
  </article>
`

const createTwitterDom = () => {
  document.body.innerHTML = `
    <div id="react-root">
      <section role="region">
        <div aria-label="Timeline">
          <div data-testid="stream"></div>
        </div>
      </section>
      <div data-testid="primaryColumn">
        <div aria-label="Primary timeline"></div>
      </div>
    </div>
  `

  return {
    root: document.querySelector<HTMLElement>('#react-root')!,
    stream: document.querySelector<HTMLElement>('[data-testid="stream"]')!,
    timeline: document.querySelector<HTMLElement>(
      '[data-testid="primaryColumn"] [aria-label]'
    )!,
  }
}

describe('TextTweetObserver', () => {
  beforeEach(() => {
    mockedMakeHarvester.mockClear()
    document.body.innerHTML = ''
  })

  it('observes text-only tweets even when shared containers are already occupied', async () => {
    const { root, stream, timeline } = createTwitterDom()
    root.dataset.harvestObserveId = 'Root'
    stream.dataset.harvestObserveId = 'Stream'
    timeline.dataset.harvestObserveId = 'Timeline'

    const observer = new TextTweetObserver('twitter')
    observer.observeRoot()

    stream.insertAdjacentHTML(
      'beforeend',
      `<div>${createArticle('hello')}</div>`
    )

    await waitFor(() => expect(mockedMakeHarvester).toHaveBeenCalled())
    expect(mockedMakeHarvester).toHaveBeenCalledWith(
      expect.objectContaining({
        dataset: expect.objectContaining({
          harvestTextOnly: 'true',
        }),
      })
    )
  })

  it('re-checks an existing article when tweet text is rendered later', async () => {
    const { stream } = createTwitterDom()
    const observer = new TextTweetObserver('twitter')
    observer.observeRoot()

    stream.insertAdjacentHTML('beforeend', `<div>${createArticle()}</div>`)
    const article = document.querySelector('article')!

    await waitFor(() => expect(mockedMakeHarvester).toHaveBeenCalledTimes(0))

    article.insertAdjacentHTML(
      'beforeend',
      '<div><div data-testid="tweetText">late text</div></div>'
    )

    await waitFor(() => expect(mockedMakeHarvester).toHaveBeenCalled())
    expect(mockedMakeHarvester).toHaveBeenCalledWith(
      expect.objectContaining({
        dataset: expect.objectContaining({
          harvestTextOnly: 'true',
        }),
      })
    )
  })
})
