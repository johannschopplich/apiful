import { ofetch as _ofetch } from 'ofetch'
import type { $Fetch } from 'ofetch'
import type { ApiClient } from '../client'

export interface $FetchAdapter extends $Fetch {}

export function ofetch() {
  return function (client: ApiClient): $FetchAdapter {
    return _ofetch.create(client.defaultOptions)
  }
}
