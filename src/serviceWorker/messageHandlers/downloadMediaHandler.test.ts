import { NoValidSolutionToken } from '#domain/useCases/fetchTweetSolution'
import { XTransactionId } from '#domain/valueObjects/xTransactionId'
import { DownloadTweetMediaMessage } from '#libs/webExtMessage'
import { MockTweetResponseCache } from '#mocks/caches/tweetResponseCache'
import { MockEventPublisher } from '#mocks/eventPublisher'
import { MockDownloadHistoryRepository } from '#mocks/repositories/downloadHistory'
import { MockDownloadSettingsRepository } from '#mocks/repositories/downloadSettings'
import { MockFeatureSettingsRepository } from '#mocks/repositories/fetureSettings'
import { MockFilenameSettingRepository } from '#mocks/repositories/filenameSetting'
import { MockXTransactionIdRepository } from '#mocks/repositories/xTransactionId'
import { toErrorResult } from '#utils/result'
import downloadMessageHandler from './downloadMediaHandler'
import { Runtime } from 'webextension-polyfill'

const sendTabMessageMock = jest.fn()

jest.mock('#libs/webExtMessage', () => {
  const actual = jest.requireActual('#libs/webExtMessage')
  return {
    ...actual,
    sendTabMessage: () => sendTabMessageMock,
  }
})

describe('downloadMediaHandler', () => {
  const downloadHistoryRepo = new MockDownloadHistoryRepository()
  const filenameSettingRepo = new MockFilenameSettingRepository()
  const downloadSettingsRepo = new MockDownloadSettingsRepository()
  const featureSettingsRepo = new MockFeatureSettingsRepository()
  const xTransactionIdRepo = new MockXTransactionIdRepository()
  const tweetCacheRepo = new MockTweetResponseCache()
  const eventPublisher = new MockEventPublisher()

  const solution = {
    isTransactionIdConsumer: true as const,
    events: [],
    statistics: {},
    process: jest.fn(),
  }

  const makeHandler = () =>
    downloadMessageHandler({
      downloadHistoryRepo,
      filenameSettingRepo,
      downloadSettingsRepo,
      featureSettingsRepo,
      tweetCacheRepo,
      xTransactionIdRepo,
      downloaderBuilder: {
        aria2: () => ({
          isOk: true,
          events: [],
          process: async () => undefined,
        }),
        browser: () => ({
          isOk: true,
          events: [],
          process: async () => undefined,
        }),
      },
      eventPublisher,
      solutionProvider: () => solution,
    })

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('returns error response when download flow throws', async () => {
    solution.process.mockRejectedValueOnce(new Error('download failed'))

    const response = jest.fn()
    await makeHandler()({
      message: new DownloadTweetMediaMessage({
        tweetId: '123',
        screenName: 'alice',
      }).toObject(),
      sender: {},
      response,
    })

    expect(response).toHaveBeenCalledWith({
      status: 'error',
      reason: 'download failed',
    })
  })

  it('falls back when transaction id request times out', async () => {
    sendTabMessageMock.mockImplementation(
      () => new Promise(() => undefined) as never
    )

    solution.process.mockImplementationOnce(async command => {
      const txIdResult = await command.transactionIdProvider?.(
        '/i/api/graphql/TweetResultByRestId',
        'GET'
      )

      expect(txIdResult?.error).toBeInstanceOf(Error)
      expect(txIdResult?.value).toBeUndefined()
      return toErrorResult(new NoValidSolutionToken('txid unavailable'))
    })

    const response = jest.fn()
    const pending = makeHandler()({
      message: new DownloadTweetMediaMessage({
        tweetId: '123',
        screenName: 'alice',
      }).toObject(),
      sender: {
        tab: {
          id: 1,
          url: 'https://x.com/home',
        } as Runtime.MessageSender['tab'],
      },
      response,
    })

    await jest.advanceTimersByTimeAsync(1600)
    await pending

    expect(response).toHaveBeenCalledWith({
      status: 'error',
      reason: 'Failed to complete download task.',
    })
  })

  it('prefers cached transaction id before messaging the tab', async () => {
    const transactionId = XTransactionId.create({
      method: 'GET',
      path: '/i/api/graphql/query-id/TweetResultByRestId',
      value: 'cached-tx-id',
    })
    jest
      .spyOn(xTransactionIdRepo, 'get')
      .mockResolvedValueOnce({ value: transactionId.value!, error: undefined })

    solution.process.mockImplementationOnce(async command => {
      const txIdResult = await command.transactionIdProvider?.(
        '/i/api/graphql/query-id/TweetResultByRestId',
        'GET'
      )

      expect(txIdResult?.value).toBe('cached-tx-id')
      expect(sendTabMessageMock).not.toHaveBeenCalled()
      return toErrorResult(new NoValidSolutionToken('txid unavailable'))
    })

    const response = jest.fn()
    await makeHandler()({
      message: new DownloadTweetMediaMessage({
        tweetId: '123',
        screenName: 'alice',
      }).toObject(),
      sender: {
        tab: {
          id: 1,
          url: 'https://x.com/home',
        } as Runtime.MessageSender['tab'],
      },
      response,
    })
  })
})
