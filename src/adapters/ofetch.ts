import { ofetch as _ofetch } from 'ofetch'
import type { $Fetch } from 'ofetch'
import type { ApiClient } from '../client'

export interface OFetchClient extends $Fetch {}

export function ofetch() {
  return function (client: ApiClient): OFetchClient {
    return _ofetch.create(client.defaultOptions)
  }
}
