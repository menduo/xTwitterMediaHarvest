import { SaveTweetContentMessage } from './saveTweetContent'

describe('unit test for save tweet content web ext message', () => {
  it('can validate valid message', () => {
    const message = new SaveTweetContentMessage({
      tweetId: '123',
      screenName: 'alice',
      content: 'hello',
      createdAt: '2024-10-10T10:10:10.000Z',
    })
    const { value, error } = SaveTweetContentMessage.validate(
      message.toObject()
    )

    expect(value).toBeDefined()
    expect(error).toBeUndefined()
  })

  it('can validate invalid message', () => {
    const { value, error } = SaveTweetContentMessage.validate('123')

    expect(error).toBeDefined()
    expect(value).toBeUndefined()
  })

  it('can make response', () => {
    const message = new SaveTweetContentMessage({
      tweetId: '123',
      screenName: 'alice',
      content: 'hello',
    })

    const okResp = message.makeResponse(true)
    expect(okResp.status).toBe('ok')

    const errResp = message.makeResponse(false, 'nope')
    expect(errResp.status).toBe('error')
    expect(errResp.reason).toBe('nope')
  })
})
