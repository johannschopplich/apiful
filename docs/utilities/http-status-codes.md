# HTTP Status Codes

`apiful/http-status-codes` exports a constant for each status code the IANA registry assigns, typed with its literal number, such as `NOT_FOUND` for `404`.

The constants follow the [IANA HTTP Status Code Registry](https://www.iana.org/assignments/http-status-codes) and take their names from its reason phrases – [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes)'s, for the codes that RFC defines: `413` is `CONTENT_TOO_LARGE`, `422` is `UNPROCESSABLE_CONTENT`. Codes the registry marks as unused, such as `418`, and temporary registrations have no constant. Each constant links to the RFC that defines its code, down to the section where the registry names one.

Unlike the enums of the [http-status-codes](https://www.npmjs.com/package/http-status-codes) package, plain constants work with type systems such as `@hono/zod-openapi`.

## Usage

```ts
import * as HttpStatusCodes from 'apiful/http-status-codes'

console.log(HttpStatusCodes.CREATED) // 201
```

Bundlers tree-shake a namespace import, so only the constants you use end up in your bundle. In a [Hono](https://hono.dev) route handler:

```ts
import * as HttpStatusCodes from 'apiful/http-status-codes'
import { Hono } from 'hono'

const app = new Hono()

app.get('/not-found', c => c.json({ message: 'Resource not found' }, HttpStatusCodes.NOT_FOUND))
```
