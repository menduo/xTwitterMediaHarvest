import { CheckDownloadHistoryMessage } from './checkDownloadHistory'

describe('unit test for download tweet media web ext message', () => {
  it('can validate valid message', () => {
    const message = new CheckDownloadHistoryMessage({ tweetId: '123' })
    const { value, error } = CheckDownloadHistoryMessage.validate(
      message.toObject()
    )

    expect(value).toBeDefined()
    expect(error).toBeUndefined()
  })

  it('can validate invalid message', () => {
    const { value, error } = CheckDownloadHistoryMessage.validate('123')

    expect(error).toBeDefined()
    expect(value).toBeUndefined()
  })

  it('can make response', () => {
    const message = new CheckDownloadHistoryMessage({ tweetId: '123' })

    const okResp = message.makeResponse(true, {
      isExist: true,
      downloadTime: '2026-06-10T00:00:00.000Z',
    })
    expect(okResp.status).toBe('ok')
    expect(okResp.payload.isExist).toBeTruthy()
    expect(okResp.payload.downloadTime).toBe('2026-06-10T00:00:00.000Z')

    const errResp = message.makeResponse(false, 'nope')
    expect(errResp.status).toBe('error')
    expect(errResp.reason).toBe('nope')
  })
})
