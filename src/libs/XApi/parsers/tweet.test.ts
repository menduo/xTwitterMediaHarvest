import { parseTweet, retrieveTweetsFromInstruction } from './tweet'
import fs from 'node:fs'
import path from 'node:path'

describe('unit test for tweet parser', () => {
  it.each([
    {
      responseName: 'UserMedia',
      tweetCount: 14,
    },
    { responseName: 'UserTweets', tweetCount: 20 },
    { responseName: 'TweetDetail', tweetCount: 8 },
  ])('should parse from $reponseName', ({ responseName, tweetCount }) => {
    const body = JSON.parse(
      fs
        .readFileSync(
          path.resolve(__dirname, 'test-data', `${responseName}.json`)
        )
        .toString()
    )

    const tweets = (body.instructions as XApi.Instruction[])
      .map(retrieveTweetsFromInstruction)
      .flat()

    expect(tweets.length).toBe(tweetCount)
  })

  it('falls back to empty hashtags when entities.hashtags is missing', () => {
    const body = JSON.parse(
      fs
        .readFileSync(path.resolve(__dirname, 'test-data', 'TweetDetail.json'))
        .toString()
    )

    const tweetResult =
      body.instructions[0].entries[0].content.itemContent.tweet_results.result

    delete tweetResult.legacy.entities.hashtags

    const tweet = parseTweet(tweetResult)

    expect(tweet.mapBy(props => props.tweet.mapBy(p => p.hashtags))).toEqual([])
  })
})
