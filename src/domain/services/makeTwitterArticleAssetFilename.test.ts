import {
  makeTwitterArticleAssetFilename,
  makeTwitterArticleOriginalImageUrl,
} from './makeTwitterArticleAssetFilename'

describe('makeTwitterArticleAssetFilename', () => {
  it('uses media id and format query for pbs URLs', () => {
    expect(
      makeTwitterArticleAssetFilename(
        'https://pbs.twimg.com/media/HJXsnx8aYAAsVAF?format=png&name=large'
      )
    ).toBe('HJXsnx8aYAAsVAF.png')
  })

  it('uses pathname extension when format query is missing', () => {
    expect(
      makeTwitterArticleAssetFilename(
        'https://pbs.twimg.com/media/HJXsnx8aYAAsVAF.jpg'
      )
    ).toBe('HJXsnx8aYAAsVAF.jpg')
  })

  it('falls back to jpg when no extension is available', () => {
    expect(
      makeTwitterArticleAssetFilename(
        'https://pbs.twimg.com/media/HJXsnx8aYAAsVAF'
      )
    ).toBe('HJXsnx8aYAAsVAF.jpg')
  })
})

describe('makeTwitterArticleOriginalImageUrl', () => {
  it('requests the original image variant for bare pbs URLs', () => {
    expect(
      makeTwitterArticleOriginalImageUrl(
        'https://pbs.twimg.com/media/HJXr7qGbAAAycXX.jpg'
      )
    ).toBe(
      'https://pbs.twimg.com/media/HJXr7qGbAAAycXX.jpg?format=jpg&name=orig'
    )
  })

  it('replaces smaller pbs image variants with the original variant', () => {
    expect(
      makeTwitterArticleOriginalImageUrl(
        'https://pbs.twimg.com/media/HJXr7qGbAAAycXX?format=jpg&name=medium'
      )
    ).toBe('https://pbs.twimg.com/media/HJXr7qGbAAAycXX?format=jpg&name=orig')
  })

  it('keeps unsupported URLs unchanged', () => {
    expect(makeTwitterArticleOriginalImageUrl('not-a-url')).toBe('not-a-url')
  })
})
