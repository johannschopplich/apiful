# `ApiClient`

Instances of `ApiClient` created using the [`createClient`](/reference/create-client) function.

## Type Definition

```ts
interface ApiClient<BaseURL extends string = string> extends Function {
  _handler: Fn
  _extensions: Record<PropertyKey, unknown>
  defaultOptions: FetchOptions
  with: <Extension extends ApiExtension>(
    createExtension: (client: ApiClient<BaseURL>) => Extension,
  ) => this & Extension
}
```
