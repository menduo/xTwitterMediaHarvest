import { SaveTweetContentMessage } from '#libs/webExtMessage'
import { MockTweetResponseCache } from '#mocks/caches/tweetResponseCache'
import { MockDownloadSettingsRepository } from '#mocks/repositories/downloadSettings'
import { MockFilenameSettingRepository } from '#mocks/repositories/filenameSetting'
import { MockDownloadFile } from '#mocks/useCases/downloadFile'
import saveTweetContentHandler from './saveTweetContentHandler'

describe('saveTweetContentHandler', () => {
  const filenameSettingRepo = new MockFilenameSettingRepository()
  const downloadSettingsRepo = new MockDownloadSettingsRepository()
  const tweetCacheRepo = new MockTweetResponseCache()
  const browserDownloadFile = new MockDownloadFile()
  const downloadHistoryRepo = {
    clear: jest.fn(),
    getByTweetId: jest.fn(),
    hasTweetId: jest.fn(),
    removeByTweetId: jest.fn(),
    save: jest.fn(),
    total: jest.fn(),
  }

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  it('returns error response when saving tweet content throws', async () => {
    jest
      .spyOn(browserDownloadFile, 'process')
      .mockRejectedValueOnce(new Error('download failed'))

    const handler = saveTweetContentHandler({
      downloadHistoryRepo,
      filenameSettingRepo,
      downloadSettingsRepo,
      tweetCacheRepo,
      browserDownloadFile,
    })

    const response = jest.fn()
    await handler({
      message: new SaveTweetContentMessage({
        tweetId: '123',
        screenName: 'alice',
        content: 'hello',
      }).toObject(),
      sender: {},
      response,
    })

    expect(response).toHaveBeenCalledWith({
      status: 'error',
      reason: 'download failed',
    })
  })
})
