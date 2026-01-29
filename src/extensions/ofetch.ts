import type { $Fetch } from 'ofetch'
import type { ApiClient } from '../client.ts'
import { ofetch } from 'ofetch'

export interface OFetchClient extends $Fetch {}

export function ofetchBuilder() {
  return function (client: ApiClient): OFetchClient {
    return ofetch.create(client.defaultOptions)
  }
}
