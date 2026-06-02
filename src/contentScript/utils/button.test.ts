/**
 * @jest-environment jsdom
 */
import {
  DownloadTweetMediaMessage,
  SaveTweetContentMessage,
  SaveTwitterArticleMessage,
  WebExtAction,
} from '#libs/webExtMessage'
import { makeHarvestButton } from '../core/Harvester'
import { setTargetArticle, setTextOnlyTargetArticle } from './article'
import { screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import 'core-js/actual/url/can-parse'
import * as IOE from 'fp-ts/lib/IOEither'
import { pipe } from 'fp-ts/lib/function'
import { runtime } from 'webextension-polyfill'

const setPath = (path: string) =>
  Object.defineProperty(window, 'location', {
    value: { pathname: path },
    writable: true,
  })

const makeArticleHtml = ({
  withArticle = false,
  withMedia,
}: {
  withArticle?: boolean
  withMedia: boolean
}) => `
  <article data-testid="tweet">
    <div data-testid="User-Name">
      <a href="/alice/status/123">alice</a>
    </div>
    <a href="/alice/status/123">
      <time datetime="2026-05-11T10:00:00.000Z"></time>
    </a>
    <div data-testid="tweetText">hello tweet</div>
    ${withMedia ? '<div data-testid="videoPlayer"></div>' : ''}
    ${withArticle ? '<a href="/i/article/456" data-testid="article-link">article</a>' : ''}
    <div role="group" aria-label="actions">
      <div data-testid="reply">
        <div>
          <div></div>
          <svg viewBox="0 0 24 24"></svg>
          <span data-testid="app-text-transition-container"><span><span>1</span></span></span>
        </div>
      </div>
    </div>
  </article>
`

jest.mock(
  '#assets/icons/twitter-download.svg',
  () =>
    `<svg x="0px" y="0px" viewBox="0 0 24 24" style="enable-background:new 0 0 24 24;">
      <g><path d="M12,16l-5.7-5.7l1.4-1.4l3.3,3.3V2.6h2v9.6l3.3-3.3l1.4,1.4L12,16z"/></g>
    </svg>`
)

describe('button click side effects', () => {
  beforeEach(() => setPath('/alice'))

  afterEach(() => {
    document.body.innerHTML = ''
    jest.restoreAllMocks()
  })

  const prepareButton = ({ textOnly }: { textOnly?: boolean } = {}) => {
    pipe(
      textOnly
        ? setTextOnlyTargetArticle(
            setTargetArticle(screen.getByTestId('tweet') as HTMLElement)
          )
        : setTargetArticle(screen.getByTestId('tweet') as HTMLElement),
      makeHarvestButton,
      IOE.match(
        error => {
          throw new Error(String(error))
        },
        () => undefined
      )
    )()
  }

  it('sends save tweet content message alongside media download', async () => {
    document.body.innerHTML = makeArticleHtml({ withMedia: true })

    const sendMessageSpy = jest
      .spyOn(runtime, 'sendMessage')
      .mockResolvedValueOnce({ status: 'ok', payload: { isExist: false } })
      .mockResolvedValueOnce({ status: 'ok' })
      .mockResolvedValueOnce({ status: 'ok' })

    prepareButton()
    await userEvent.click(screen.getByTestId('harvester-button'))

    expect(
      sendMessageSpy.mock.calls.some(([message]) => {
        const validated = SaveTweetContentMessage.validate(message)
        return (
          validated.value?.toObject().action === WebExtAction.SaveTweetContent
        )
      })
    ).toBe(true)
    expect(
      sendMessageSpy.mock.calls.some(([message]) => {
        const validated = DownloadTweetMediaMessage.validate(message)
        return validated.value?.toObject().action === WebExtAction.DownloadMedia
      })
    ).toBe(true)
  })

  it('only saves tweet content for text-only tweets', async () => {
    document.body.innerHTML = makeArticleHtml({
      withArticle: true,
      withMedia: false,
    })

    const sendMessageSpy = jest
      .spyOn(runtime, 'sendMessage')
      .mockResolvedValueOnce({ status: 'ok', payload: { isExist: false } })
      .mockResolvedValueOnce({ status: 'ok' })

    prepareButton({ textOnly: true })
    await userEvent.click(screen.getByTestId('harvester-button'))

    expect(
      sendMessageSpy.mock.calls.some(([message]) => {
        const validated = SaveTweetContentMessage.validate(message)
        return (
          validated.value?.toObject().action === WebExtAction.SaveTweetContent
        )
      })
    ).toBe(true)
  })

  it('downloads media when a previously text-only article later has media', async () => {
    document.body.innerHTML = makeArticleHtml({ withMedia: true })

    const sendMessageSpy = jest
      .spyOn(runtime, 'sendMessage')
      .mockResolvedValueOnce({ status: 'ok', payload: { isExist: false } })
      .mockResolvedValueOnce({ status: 'ok' })
      .mockResolvedValueOnce({ status: 'ok' })

    prepareButton({ textOnly: true })
    await userEvent.click(screen.getByTestId('harvester-button'))

    expect(
      sendMessageSpy.mock.calls.some(([message]) => {
        const validated = DownloadTweetMediaMessage.validate(message)
        return validated.value?.toObject().action === WebExtAction.DownloadMedia
      })
    ).toBe(true)
  })

  it('saves twitter article instead of plain tweet content when article link exists', async () => {
    document.body.innerHTML = makeArticleHtml({
      withArticle: true,
      withMedia: false,
    })

    const sendMessageSpy = jest
      .spyOn(runtime, 'sendMessage')
      .mockResolvedValueOnce({ status: 'ok', payload: { isExist: false } })
      .mockResolvedValueOnce({ status: 'ok' })

    prepareButton({ textOnly: true })
    sendMessageSpy.mockClear()
    await userEvent.click(screen.getByTestId('harvester-button'))

    expect(
      sendMessageSpy.mock.calls.map(
        ([message]) => (message as { action: WebExtAction }).action
      )
    ).toEqual([WebExtAction.SaveTwitterArticle])
    expect(
      sendMessageSpy.mock.calls.some(([message]) => {
        const validated = SaveTwitterArticleMessage.validate(message)
        return (
          validated.value?.toObject().action === WebExtAction.SaveTwitterArticle
        )
      })
    ).toBe(true)
    expect(
      sendMessageSpy.mock.calls.some(([message]) => {
        return (
          (message as { action: WebExtAction }).action ===
          WebExtAction.SaveTweetContent
        )
      })
    ).toBe(false)
  })
})
