# HTTP Status Phrases

`apiful/http-status-phrases` exports a constant for the reason phrase of each status code the IANA registry assigns, typed with its literal string, such as `NOT_FOUND` for `'Not Found'`.

The phrases are the ones the [IANA HTTP Status Code Registry](https://www.iana.org/assignments/http-status-codes) lists, and each constant shares its name with the matching [status code](/utilities/http-status-codes): `CONTENT_TOO_LARGE` is `'Content Too Large'`.

## Example

```ts
import * as HttpStatusPhrases from 'apiful/http-status-phrases'

console.log(HttpStatusPhrases.NOT_FOUND) // 'Not Found'
```

In a [Hono](https://hono.dev) route handler, next to the [status code](/utilities/http-status-codes) of the same name:

```ts
import * as HttpStatusCodes from 'apiful/http-status-codes'
import * as HttpStatusPhrases from 'apiful/http-status-phrases'
import { Hono } from 'hono'

const app = new Hono()

app.get('/not-found', c => c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND))
```
