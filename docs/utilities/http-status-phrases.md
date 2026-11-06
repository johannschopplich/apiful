# HTTP Status Reason Phrases

APIful provides the reason phrase of every registered HTTP status code as a constant. These are individually typed exports that you can use wherever you need a status phrase instead of hardcoding raw strings.

The phrases are the ones the [IANA HTTP Status Code Registry](https://www.iana.org/assignments/http-status-codes) lists, and each constant shares its name with the matching [status code](/utilities/http-status-codes): `CONTENT_TOO_LARGE` is `'Content Too Large'`.

> [!TIP]
> You may be wondering, why not use the [http-status-codes](https://www.npmjs.com/package/http-status-codes) package directly? Because the enums exported by the package don't work well with frameworks like Hono that use the `@hono/zod-openapi` type system.

## Usage

Import all named exports from `apiful/http-status-phrases` as local names, and use them as needed.

```ts
import * as HttpStatusPhrases from 'apiful/http-status-phrases'

console.log(HttpStatusPhrases.NOT_FOUND) // 'Not Found'
```

> [!TIP]
> With namespace imports, bundlers like Rollup will only include the imported exports in the final bundle, which can help reduce the bundle size.

For web frameworks like [Hono](https://hono.dev), you can use the status phrases in your route handlers like this:

```ts
import * as HttpStatusCodes from 'apiful/http-status-codes'
import * as HttpStatusPhrases from 'apiful/http-status-phrases'

app.get('/not-found', (c) => {
  c.status(HttpStatusCodes.NOT_FOUND)
  c.json({ message: HttpStatusPhrases.NOT_FOUND })
})
```
