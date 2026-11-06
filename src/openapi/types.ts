import type { FetchError, FetchOptions, MappedResponseType, ResponseType } from 'ofetch'

/** Body of the successful response, for whichever 2xx status and media type the operation declares. */
export type FetchResponseData<Operation> = IsAny<Operation> extends true
  ? any
  : Operation extends { responses: infer Responses }
    ? ResponseBody<Responses[keyof Responses & SuccessStatus]>
    : never

/** Union of the bodies every 4xx, 5xx, and `default` response of the operation declares. */
export type FetchResponseErrorData<Operation> = Operation extends { responses: infer Responses }
  ? ResponseBody<Responses[ErrorStatusKey<Responses>]>
  : never

export type FetchResponseError<Operation> = FetchError<FetchResponseErrorData<Operation>>

export type MethodOption<M, P> = 'get' extends keyof P ? { method?: M } : { method: M }

export type ParamsOption<Operation> = IsAny<Operation> extends true
  ? Record<string, unknown>
  : Operation extends { parameters?: any }
    ? Pick<Operation['parameters'], 'path' | 'query'> & { headers?: Operation['parameters']['header'] | HeadersInit }
    : Record<string, unknown>

export type RequestBodyOption<Operation> = IsAny<Operation> extends true
  ? { body?: any }
  : Operation extends { requestBody: { content: infer Content } }
    ? { body: MediaTypeBody<Content> }
    : Operation extends { requestBody?: { content: infer Content } }
      ? { body?: MediaTypeBody<Content> }
      : { body?: never }

export type OpenAPIPathMethods<Paths, Path extends keyof Paths> = keyof Paths[Path]

/** Path or query parameters of an operation, or `never` where it declares none. */
export type OpenAPIParameters<Operation, Kind extends 'path' | 'query'> = Operation extends { parameters: infer Parameters }
  ? Kind extends keyof Parameters ? Exclude<Parameters[Kind], undefined> : never
  : never

/**
 * Every type one operation carries, keyed for extraction – `Service<'/pet/{petId}', 'get'>['response']`.
 * `response` is the same `FetchResponseData` an `OpenAPIClient` call with the default `json` `responseType` resolves to.
 */
export interface OpenAPIEndpoint<Paths, Path extends keyof Paths, Method extends keyof Paths[Path]> {
  path: OpenAPIParameters<Paths[Path][Method], 'path'>

  query: OpenAPIParameters<Paths[Path][Method], 'query'>

  /** Request body, `undefined` where the operation declares none or declares it optional. */
  request: RequestBody<Paths[Path][Method]>

  response: FetchResponseData<Paths[Path][Method]>

  /** Union of the 4xx, 5xx, and `default` response bodies, which a failed request carries on its `data`. */
  error: FetchResponseErrorData<Paths[Path][Method]>

  /** Response bodies keyed by status code, `undefined` where a status carries no content. */
  responses: Paths[Path][Method] extends { responses: infer Responses }
    ? { [Status in keyof Responses]: ResponseBody<Responses[Status]> }
    : never

  /** Path literal including its parameter placeholders, for route builders to consume. */
  fullPath: Path

  method: Method

  /** Raw operation object, carrying metadata such as tags and security requirements. */
  operation: Paths[Path][Method]
}

export type OpenAPIClient<Paths> = <
  ReqT extends Extract<keyof Paths, string>,
  Methods extends PathItem<Paths[ReqT]>,
  Method extends Extract<keyof Methods, string> | Uppercase<Extract<keyof Methods, string>>,
  LowercasedMethod extends Lowercase<Method> extends keyof Methods ? Lowercase<Method> : never,
  DefaultMethod extends 'get' extends LowercasedMethod ? 'get' : LowercasedMethod,
  ResT = FetchResponseData<Methods[DefaultMethod]>,
  ResponseFormat extends ResponseType = 'json',
>(
  url: ReqT,
  ...options: OptionsArgument<OpenAPIFetchOptions<Method, LowercasedMethod, Methods, ResponseFormat>>
) => Promise<MappedResponseType<ResponseFormat, ResT>>

type OpenAPIFetchOptions<
  Method,
  LowercasedMethod,
  Methods,
  ResponseFormat extends ResponseType,
  Operation = 'get' extends LowercasedMethod ? ('get' extends keyof Methods ? Methods['get'] : never) : LowercasedMethod extends keyof Methods ? Methods[LowercasedMethod] : never,
> = MethodOption<Method, Methods>
  & ParamsOption<Operation>
  & RequestBodyOption<Operation>
  // Only `responseType` infers the format; a hook or `retryDelay` typed for any format would widen it.
  & Omit<FetchOptions<NoInfer<ResponseFormat>>, 'query' | 'body' | 'method' | 'responseType'>
  & { responseType?: ResponseFormat }

/** Options parameter, required where the operation has a required option, such as a path parameter or a `method`. */
type OptionsArgument<Options> = [RequiredKeys<Options>] extends [never] ? [options?: Options] : [options: Options]

// eslint-disable-next-line ts/no-empty-object-type -- An empty object extends the pick of a key only where the key is optional.
type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T]

/**
 * Mapped copy of a path item. Calls check measurably faster against it than against
 * the indexed access `Paths[Path]` it copies.
 */
type PathItem<T> = { [K in keyof T]: T[K] }

/** Whether a type is `any`, which an operation becomes behind a path cast to `any`. */
type IsAny<T> = 0 extends 1 & T ? true : false

type MediaType = `${string}/${string}`

/** Every 2xx status IANA registers, plus the `2XX` range OpenAPI allows in place of a code, and its lowercase spelling. */
type SuccessStatus = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226 | '2XX' | '2xx'

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

/** Statuses ofetch throws for, plus the ranges and the `default` OpenAPI allows in place of a code, and the ranges' lowercase spelling. */
type ErrorStatus = `${4 | 5}${Digit}${Digit}` | '4XX' | '5XX' | '4xx' | '5xx' | 'default'

type ErrorStatusKey<Responses> = {
  [Status in keyof Responses]: `${Status & (string | number)}` extends ErrorStatus ? Status : never
}[keyof Responses]

type MediaTypeBody<Content> = Content[keyof Content & MediaType]

/** Body of one response object, `undefined` where it carries no content. */
type ResponseBody<Response> = Response extends { content: infer Content } ? MediaTypeBody<Content> : undefined

type RequestBody<Operation> = Operation extends { requestBody: { content: infer Content } }
  ? MediaTypeBody<Content>
  : Operation extends { requestBody?: { content: infer Content } }
    ? MediaTypeBody<Content> | undefined
    : undefined
