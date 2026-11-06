# HTTP Status Codes

APIful provides every registered HTTP status code as a constant. These are individually typed exports that you can use wherever you need a status code instead of hardcoding raw numbers.

The constants follow the [IANA HTTP Status Code Registry](https://www.iana.org/assignments/http-status-codes) and take their names from its reason phrases – [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes)'s, for the codes that RFC defines: `413` is `CONTENT_TOO_LARGE`, `422` is `UNPROCESSABLE_CONTENT`. Codes the registry marks as unused, such as `418`, and temporary registrations have no constant. Each constant links to the RFC that defines its code, down to the section where the registry names one.

> [!TIP]
> You may be wondering, why not use the [http-status-codes](https://www.npmjs.com/package/http-status-codes) package directly? Because the enums exported by the package don't work well with frameworks like Hono that use the `@hono/zod-openapi` type system.

## Usage

Import all named exports from `apiful/http-status-codes` as local names, and use them as needed.

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
