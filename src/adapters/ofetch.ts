import { ofetch as _ofetch } from 'ofetch'
import type { $Fetch } from 'ofetch'
import type { ApiClient } from '../client'

export interface OFetchAdapter extends $Fetch {}

export function ofetch() {
  return function (client: ApiClient): OFetchAdapter {
    return _ofetch.create(client.defaultOptions)
  }
}
