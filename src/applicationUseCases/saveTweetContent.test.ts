import { DownloadConfig } from '#domain/valueObjects/downloadConfig'
import { TweetWithContent } from '#domain/valueObjects/tweetWithContent'
import { MockTweetResponseCache } from '#mocks/caches/tweetResponseCache'
import { MockDownloadSettingsRepository } from '#mocks/repositories/downloadSettings'
import { MockFilenameSettingRepository } from '#mocks/repositories/filenameSetting'
import { MockDownloadFile } from '#mocks/useCases/downloadFile'
import { toSuccessResult } from '#utils/result'
import { generateTweet } from '#utils/test/tweet'
import { SaveTweetContent } from './saveTweetContent'

describe('SaveTweetContent', () => {
  const filenameSettingRepo = new MockFilenameSettingRepository()
  const downloadSettingsRepo = new MockDownloadSettingsRepository()
  const tweetCacheRepo = new MockTweetResponseCache()
  const browserDownloadFile = new MockDownloadFile()
  const saveTweetContent = new SaveTweetContent({
    filenameSettingRepo,
    downloadSettingsRepo,
    tweetCacheRepo,
    browserDownloadFile,
  })

  afterEach(() => jest.restoreAllMocks())

  it('uses blob URL when createObjectURL is available', async () => {
    jest
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:tweet-markdown')
    jest.spyOn(tweetCacheRepo, 'get').mockResolvedValueOnce(
      toSuccessResult(
        new TweetWithContent({
          tweet: generateTweet(),
          content: 'cached content',
        })
      )
    )
    const downloadSpy = jest
      .spyOn(browserDownloadFile, 'process')
      .mockResolvedValueOnce(undefined)

    const result = await saveTweetContent.process({
      tweetId: '123',
      screenName: 'alice',
      content: 'hello markdown',
      createdAt: new Date('2024-10-10T10:10:10.000Z'),
    })

    expect(result).toBe(true)
    expect(downloadSpy).toHaveBeenCalledTimes(1)
    expect(downloadSpy.mock.calls[0][0].target).toBeInstanceOf(DownloadConfig)
    const downloadConfig = downloadSpy.mock.calls[0][0].target as DownloadConfig
    expect(downloadConfig.mapBy(props => props.filename)).toContain('.md')
    expect(downloadConfig.mapBy(props => props.url)).toBe('blob:tweet-markdown')
  })

  it('falls back to data URL when createObjectURL is unavailable', async () => {
    const originalCreateObjectURL = URL.createObjectURL
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: undefined,
    })

    jest
      .spyOn(tweetCacheRepo, 'get')
      .mockResolvedValueOnce(toSuccessResult(undefined))
    const downloadSpy = jest
      .spyOn(browserDownloadFile, 'process')
      .mockResolvedValueOnce(undefined)

    const result = await saveTweetContent.process({
      tweetId: '123',
      screenName: 'alice',
      content: 'hello markdown',
      createdAt: new Date('2024-10-10T10:10:10.000Z'),
    })

    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: originalCreateObjectURL,
      })
    }

    expect(result).toBe(true)
    expect(downloadSpy).toHaveBeenCalledTimes(1)
    const downloadConfig = downloadSpy.mock.calls[0][0].target as DownloadConfig
    expect(downloadConfig.mapBy(props => props.url)).toBe(
      'data:text/markdown;base64,aGVsbG8gbWFya2Rvd24='
    )
  })

  it('skips empty content', async () => {
    const downloadSpy = jest.spyOn(browserDownloadFile, 'process')

    const result = await saveTweetContent.process({
      tweetId: '123',
      screenName: 'alice',
      content: '   ',
    })

    expect(result).toBe(false)
    expect(downloadSpy).not.toHaveBeenCalled()
  })
})
