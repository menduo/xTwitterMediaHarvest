import { parseTwitterArticleFromTweetResult } from './twitterArticle'
import fs from 'fs'
import path from 'path'

const fixture = JSON.parse(
  fs.readFileSync(
    path.resolve(
      process.cwd(),
      '_pid_proj/_cloudocs/current/fixtures/op7418-2059812895803011449-TweetResultByRestId.json'
    ),
    'utf8'
  )
)

describe('parseTwitterArticleFromTweetResult', () => {
  it('parses a TweetResultByRestId article response', () => {
    const result = parseTwitterArticleFromTweetResult(
      fixture.data.tweetResult.result
    )

    expect(result.error).toBeUndefined()
    expect(result.value?.mapBy(props => props.tweetId)).toBe(
      '2059812895803011449'
    )
    expect(result.value?.mapBy(props => props.articleId)).toBe(
      '2059811469081141248'
    )
    expect(result.value?.mapBy(props => props.screenName)).toBe('op7418')
    expect(result.value?.mapBy(props => props.title)).toContain('开源个 Skill')
    expect(result.value?.blocks.length).toBeGreaterThan(100)
    expect(result.value?.images).toContainEqual(
      expect.objectContaining({
        imageId: '2059812572757647360',
        url: 'https://pbs.twimg.com/media/HJXsnx8aYAAsVAF.png?format=png&name=orig',
        filename: 'HJXsnx8aYAAsVAF.png',
      })
    )
  })

  it('preserves bold inline metadata', () => {
    const result = parseTwitterArticleFromTweetResult(
      fixture.data.tweetResult.result
    )
    const firstParagraph = result.value?.blocks.find(
      block => block.type === 'paragraph'
    )

    expect(firstParagraph).toMatchObject({
      type: 'paragraph',
      children: expect.arrayContaining([
        expect.objectContaining({
          text: 'guizang-ppt-skill',
          bold: true,
        }),
      ]),
    })
  })
})
