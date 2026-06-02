/**
 * @jest-environment jsdom
 */
import makeHarvester from '../core'
import TwitterArticleObserver from './TwitterArticleObserver'
import { waitFor } from '@testing-library/dom'

jest.mock('../core', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockedMakeHarvester = jest.mocked(makeHarvester)

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
    stream: document.querySelector<HTMLElement>('[data-testid="stream"]')!,
  }
}

describe('TwitterArticleObserver', () => {
  beforeEach(() => {
    mockedMakeHarvester.mockClear()
    document.body.innerHTML = ''
  })

  it('observes article previews in stream mutations', async () => {
    const { stream } = createTwitterDom()
    const observer = new TwitterArticleObserver()
    observer.observeRoot()

    stream.insertAdjacentHTML(
      'beforeend',
      `<div>
        <article>
          <div data-testid="article-cover-image">Article</div>
        </article>
      </div>`
    )

    await waitFor(() => expect(mockedMakeHarvester).toHaveBeenCalled())
    expect(mockedMakeHarvester).toHaveBeenCalledWith(
      expect.objectContaining({
        dataset: expect.objectContaining({
          harvestTwitterArticle: 'true',
        }),
      })
    )
  })
})
