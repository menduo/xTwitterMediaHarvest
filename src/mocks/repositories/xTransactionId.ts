import type { IXTransactionIdRepository } from '#domain/repositories/xTransactionId'
import type { XTransactionId } from '#domain/valueObjects/xTransactionId'
import { toErrorResult } from '#utils/result'

export class MockXTransactionIdRepository implements IXTransactionIdRepository {
  async get(_endpoint: string): AsyncResult<XTransactionId> {
    return toErrorResult(new Error('No transaction id'))
  }
  async save(_xTransactionId: XTransactionId): Promise<UnsafeTask> {
    return undefined
  }
}
