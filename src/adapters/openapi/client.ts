import { ofetch } from 'ofetch'
import type { ApiClient } from '../../client'
import type {
  AllPaths,
  ApiResponse,
  CaseVariants,
  GetPaths,
  GetPlainPaths,
  HttpMethod,
  RequestOptions,
  SchemaPath,
} from './types'

type OpenAPISchemaRepository = import('apiverse').OpenAPISchemaRepository

type OpenAPIPaths<K> = K extends keyof OpenAPISchemaRepository
  ? OpenAPISchemaRepository[K]['paths']
  : Record<string, never>

export interface OpenAPIAdapter<Paths extends Record<string, SchemaPath>> {
  <P extends GetPlainPaths<Paths>>(
    path: P,
    opts?: Omit<RequestOptions<Paths[`/${P}`]>, 'method'>,
  ): Promise<ApiResponse<Paths[`/${P}`]['get']>>
  <P extends GetPaths<Paths>>(
    path: P,
    opts: Omit<RequestOptions<Paths[`/${P}`]>, 'method'>,
  ): Promise<ApiResponse<Paths[`/${P}`]['get']>>
  <
    P extends AllPaths<Paths>,
    M extends CaseVariants<keyof Paths[`/${P}`] & HttpMethod>,
  >(
    path: P,
    opts?: RequestOptions<Paths[`/${P}`], M> & { method: M },
  ): Promise<ApiResponse<Paths[`/${P}`][Lowercase<M>]>>
}

export function OpenAPI<
  const Schema extends string,
  Paths extends Record<string, SchemaPath> = OpenAPIPaths<Schema>,
>() {
  return function (client: ApiClient): OpenAPIAdapter<Paths> {
    const fetcher = ofetch.create(client.defaultOptions)

    return (path: string, options?: RequestOptions<SchemaPath>) =>
      fetcher(
        // @ts-expect-error: `pathParams` can be defined in `options`
        resolvePathParams(path, options?.pathParams),
        options,
      )
  }
}

function resolvePathParams(path: string, params?: Record<string, unknown>) {
  if (params) {
    for (const [key, value] of Object.entries(params))
      path = path.replace(`{${key}}`, encodeURIComponent(String(value)))
  }

  return path
}
