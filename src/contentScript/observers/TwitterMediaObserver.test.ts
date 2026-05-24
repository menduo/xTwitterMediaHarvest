/**
 * @jest-environment jsdom
 */
import makeHarvester from '../core'
import TwitterMediaObserver from './TwitterMediaObserver'
import { waitFor } from '@testing-library/dom'

jest.mock('../core', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockedMakeHarvester = jest.mocked(makeHarvester)

const createMediaArticle = () => `
  <article>
    <div role="group" aria-label="Actions"></div>
    <div data-testid="reply"><div><svg></svg></div></div>
    <div data-testid="videoPlayer"></div>
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
    stream: document.querySelector<HTMLElement>('[data-testid="stream"]')!,
  }
}

describe('TwitterMediaObserver', () => {
  beforeEach(() => {
    mockedMakeHarvester.mockClear()
    document.body.innerHTML = ''
  })

  it('handles added nodes that are articles themselves', async () => {
    const { stream } = createTwitterDom()
    const observer = new TwitterMediaObserver(false)
    observer.observeRoot()

    stream.insertAdjacentHTML('beforeend', createMediaArticle())

    await waitFor(() => expect(mockedMakeHarvester).toHaveBeenCalled())
  })

  it('does not stop processing when a non-element node appears before an article', async () => {
    const { stream } = createTwitterDom()
    const observer = new TwitterMediaObserver(false)
    observer.observeRoot()

    const article = document
      .createRange()
      .createContextualFragment(createMediaArticle())
      .firstElementChild as HTMLElement

    stream.append(document.createTextNode('loading'), article)

    await waitFor(() => expect(mockedMakeHarvester).toHaveBeenCalled())
  })
})
