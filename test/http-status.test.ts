import { describe, expect, it } from 'vitest'
import * as HttpStatusCodes from '../src/generated/http-status-codes'

describe('http status codes', () => {
  it('exports 413 as CONTENT_TOO_LARGE', () => {
    expect(HttpStatusCodes.CONTENT_TOO_LARGE).toBe(413)
    expect(HttpStatusCodes).not.toHaveProperty('REQUEST_TOO_LONG')
  })

  it('exports no constant for the unregistered 419', () => {
    expect(Object.values(HttpStatusCodes)).not.toContain(419)
  })
})
