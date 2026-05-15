import {
  AggregationToken,
  FilenameSetting,
} from '#domain/valueObjects/filenameSetting'
import PatternToken from '#enums/patternToken'
import { makeTweetMarkdownFilename } from './makeTweetMarkdownFilename'

describe('makeTweetMarkdownFilename', () => {
  it('uses filename pattern tokens and markdown extension', () => {
    const filenameSetting = new FilenameSetting({
      directory: 'download',
      noSubDirectory: false,
      fileAggregation: false,
      filenamePattern: [
        PatternToken.Account,
        PatternToken.TweetId,
        PatternToken.Serial,
      ],
      groupBy: AggregationToken.Account,
    })

    expect(
      makeTweetMarkdownFilename(filenameSetting, {
        tweetId: '123456',
        screenName: 'alice',
      })
    ).toBe('download/alice-123456-01-00.md')
  })

  it('uses account aggregation when enabled', () => {
    const filenameSetting = new FilenameSetting({
      directory: 'download',
      noSubDirectory: false,
      fileAggregation: true,
      filenamePattern: [PatternToken.Account, PatternToken.TweetId],
      groupBy: AggregationToken.Account,
    })

    expect(
      makeTweetMarkdownFilename(filenameSetting, {
        tweetId: '123456',
        screenName: 'alice',
      })
    ).toBe('download/alice/alice-123456-00.md')
  })
})
