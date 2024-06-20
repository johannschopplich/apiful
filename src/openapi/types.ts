import type { FetchError, FetchOptions } from 'ofetch'
import type {
  ErrorResponse,
  FilterKeys,
  MediaType,
  OperationRequestBodyContent,
  ResponseObjectMap,
  SuccessResponse,
} from 'openapi-typescript-helpers'

export type FetchResponseData<T> = SuccessResponse<ResponseObjectMap<T>, MediaType>
export type FetchResponseError<T> = FetchError<ErrorResponse<ResponseObjectMap<T>, MediaType>>

export type MethodOption<M, P> = 'get' extends keyof P ? { method?: M } : { method: M }

export type ParamsOption<T> = T extends { parameters?: any, query?: any } ? T['parameters'] : unknown

export type RequestBodyOption<T> =
  OperationRequestBodyContent<T> extends never
    ? { body?: never }
    : undefined extends OperationRequestBodyContent<T>
      ? { body?: OperationRequestBodyContent<T> }
      : { body: OperationRequestBodyContent<T> }

export type FilterMethods<T> = {
  [K in keyof Omit<T, 'parameters'> as T[K] extends never | undefined
    ? never
    : K]: T[K];
}

export type OpenAPIFetchOptions<
  Method,
  LowercasedMethod,
  Params,
  Operation = 'get' extends LowercasedMethod ? ('get' extends keyof Params ? Params['get'] : never) : LowercasedMethod extends keyof Params ? Params[LowercasedMethod] : never,
> =
  MethodOption<Method, Params>
  & ParamsOption<Operation>
  & RequestBodyOption<Operation>
  & Omit<FetchOptions, 'query' | 'body' | 'method'>

export type OpenAPIClient<Paths> = <
  ReqT extends Extract<keyof Paths, string>,
  Methods extends FilterMethods<Paths[ReqT]>,
  Method extends Extract<keyof Methods, string> | Uppercase<Extract<keyof Methods, string>>,
  LowercasedMethod extends Lowercase<Method> extends keyof FilterMethods<Paths[ReqT]> ? Lowercase<Method> : never,
  DefaultMethod extends 'get' extends LowercasedMethod ? 'get' : LowercasedMethod,
  ResT = FetchResponseData<Paths[ReqT][DefaultMethod]>,
>(
  url: ReqT,
  options?: OpenAPIFetchOptions<Method, LowercasedMethod, Methods>
) => Promise<ResT>
