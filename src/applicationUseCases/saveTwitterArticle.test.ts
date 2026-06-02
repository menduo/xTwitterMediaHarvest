import type { DownloadHistory } from '#domain/entities/downloadHistory'
import { DownloadConfig } from '#domain/valueObjects/downloadConfig'
import { TwitterArticle } from '#domain/valueObjects/twitterArticle'
import { MockTweetResponseCache } from '#mocks/caches/tweetResponseCache'
import { MockTwitterArticleCache } from '#mocks/caches/twitterArticleCache'
import { MockDownloadSettingsRepository } from '#mocks/repositories/downloadSettings'
import { MockFilenameSettingRepository } from '#mocks/repositories/filenameSetting'
import { MockDownloadFile } from '#mocks/useCases/downloadFile'
import { toSuccessResult } from '#utils/result'
import { SaveTwitterArticle } from './saveTwitterArticle'

describe('SaveTwitterArticle', () => {
  const filenameSettingRepo = new MockFilenameSettingRepository()
  const downloadSettingsRepo = new MockDownloadSettingsRepository()
  const tweetCacheRepo = new MockTweetResponseCache()
  const twitterArticleCache = new MockTwitterArticleCache()
  const browserDownloadFile = new MockDownloadFile()
  const downloadHistoryRepo = {
    clear: jest.fn(),
    getByTweetId: jest.fn(),
    hasTweetId: jest.fn(),
    removeByTweetId: jest.fn(),
    save: jest.fn(),
    total: jest.fn(),
  }
  const article = TwitterArticle.create({
    tweetId: '123',
    articleId: '456',
    screenName: 'alice',
    title: 'Article Title',
    createdAt: '2026-05-28T00:00:00.000Z',
    sourceUrl: 'https://x.com/alice/status/123',
    blocks: [
      { type: 'paragraph', children: [{ text: 'hello article' }] },
      { type: 'image', imageId: 'img1' },
    ],
    images: [
      {
        imageId: 'img1',
        url: 'https://pbs.twimg.com/media/aaa.png',
        filename: 'aaa.png',
      },
    ],
  })
  const saveTwitterArticle = new SaveTwitterArticle({
    downloadHistoryRepo,
    filenameSettingRepo,
    downloadSettingsRepo,
    tweetCacheRepo,
    twitterArticleCache,
    browserDownloadFile,
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  it('keeps article save successful when an image fails and writes todo', async () => {
    jest
      .spyOn(twitterArticleCache, 'get')
      .mockResolvedValueOnce(toSuccessResult(article))
    jest
      .spyOn(tweetCacheRepo, 'get')
      .mockResolvedValueOnce(toSuccessResult(undefined))
    const downloadSpy = jest
      .spyOn(browserDownloadFile, 'process')
      .mockResolvedValueOnce(new Error('image failed'))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)

    const result = await saveTwitterArticle.process({
      tweetId: '123',
      screenName: 'alice',
      createdAt: new Date('2026-05-28T00:00:00.000Z'),
    })

    expect(result).toBe(true)
    expect(downloadSpy).toHaveBeenCalledTimes(3)
    expect(
      (downloadSpy.mock.calls[0][0].target as DownloadConfig).mapBy(
        props => props.filename
      )
    ).toBe('download/alice-123-01-00/aaa.png')
    const markdownConfig = downloadSpy.mock.calls[1][0].target as DownloadConfig
    expect(markdownConfig.mapBy(props => props.filename)).toBe(
      'download/alice-123-01-00.md'
    )
    expect(markdownConfig.mapBy(props => props.url)).toContain('blob:')
    expect(
      (downloadSpy.mock.calls[2][0].target as DownloadConfig).mapBy(
        props => props.filename
      )
    ).toBe('download/alice-123-01-00-todo.md')
    expect(downloadHistoryRepo.save).toHaveBeenCalledTimes(1)
    expect(
      (downloadHistoryRepo.save.mock.calls[0][0] as DownloadHistory).id.value
    ).toBe('123')
    expect(
      (downloadHistoryRepo.save.mock.calls[0][0] as DownloadHistory).mapBy(
        (_id, props) => props.tweetUser.mapBy(userProps => userProps.userId)
      )
    ).toBe('alice')
  })
})
