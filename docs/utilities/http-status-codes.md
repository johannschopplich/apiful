# HTTP Status Codes

APIful provides all common HTTP status codes as constants. These are individually typed exports that you can use wherever you need a status code instead of hardcoding raw numbers.

All status codes defined in RFC1945 (HTTP/1.0), RFC2616 (HTTP/1.1), RFC2518 (WebDAV), RFC6585 (Additional HTTP Status Codes), and RFC7538 (Permanent Redirect) are supported.

> [!TIP]
> You may be wondering, why not use the [http-status-codes](https://www.npmjs.com/package/http-status-codes) package directly? Because the enums exported by the package do not work well with frameworks like Hono that use the `@hono/zod-openapi` type system.

## Usage

Import all named exports from `apiful/http-status-codes` as a local names, and use them as needed.

```ts
import * as HttpStatusCodes from 'apiful/http-status-codes'

console.log(HttpStatusCodes.CREATED) // 201
```

> [!TIP]
> With namespace imports, bundlers like Rollup will only include the imported exports in the final bundle, which can help reduce the bundle size.

For web frameworks like [Hono](https://hono.dev), you can use the status codes in your route handlers like this:

```ts
import * as HttpStatusCodes from 'apiful/http-status-codes'

app.get('/not-found', (c) => {
  c.status(HttpStatusCodes.NOT_FOUND)
  c.json({ message: 'Resource not found' })
})
```
