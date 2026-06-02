import { TwitterArticle } from '#domain/valueObjects/twitterArticle'
import {
  makeTwitterArticleMarkdown,
  makeTwitterArticleTodoMarkdown,
} from './makeTwitterArticleMarkdown'

describe('makeTwitterArticleMarkdown', () => {
  const article = TwitterArticle.create({
    tweetId: '123',
    articleId: '456',
    screenName: 'alice',
    title: 'Article Title',
    createdAt: '2026-05-28T00:00:00.000Z',
    sourceUrl: 'https://x.com/alice/status/123',
    blocks: [
      {
        type: 'paragraph',
        children: [
          { text: 'hello ' },
          { text: 'site', href: 'https://example.com', bold: true },
        ],
      },
      { type: 'image', imageId: 'img1' },
      { type: 'image', imageId: 'img2' },
    ],
    images: [
      {
        imageId: 'img1',
        url: 'https://pbs.twimg.com/media/aaa.png',
        filename: 'aaa.png',
      },
      {
        imageId: 'img2',
        url: 'https://pbs.twimg.com/media/bbb.png',
        filename: 'bbb.png',
      },
    ],
  })

  it('renders front matter, rich text, local images, and failed remote images', () => {
    const markdown = makeTwitterArticleMarkdown(article, {
      assetDir: 'alice-123-01-00',
      failedImageUrls: ['https://pbs.twimg.com/media/bbb.png'],
    })

    expect(markdown).toContain('source: "https://x.com/alice/status/123"')
    expect(markdown).toContain('# Article Title')
    expect(markdown).toContain('[**site**](https://example.com)')
    expect(markdown).toContain('![](alice-123-01-00/aaa.png)')
    expect(markdown).toContain('![](https://pbs.twimg.com/media/bbb.png)')
  })

  it('renders todo markdown for failed images', () => {
    expect(
      makeTwitterArticleTodoMarkdown(article, [
        'https://pbs.twimg.com/media/bbb.png',
      ])
    ).toContain('- https://pbs.twimg.com/media/bbb.png')
  })
})
