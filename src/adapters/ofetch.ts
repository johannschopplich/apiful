import type { $Fetch } from 'ofetch'
import type { ApiClient } from '../client'
import { ofetch as _ofetch } from 'ofetch'

export interface OFetchClient extends $Fetch {}

export function ofetch() {
  return function (client: ApiClient): OFetchClient {
    return _ofetch.create(client.defaultOptions)
  }
}
