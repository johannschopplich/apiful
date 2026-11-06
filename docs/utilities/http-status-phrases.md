# HTTP Status Reason Phrases

APIful provides the reason phrase of every registered HTTP status code as a constant. These are individually typed exports that you can use wherever you need a status phrase instead of hardcoding raw strings.

The phrases are the ones the [IANA HTTP Status Code Registry](https://www.iana.org/assignments/http-status-codes) lists, and each constant shares its name with the matching [status code](/utilities/http-status-codes): `CONTENT_TOO_LARGE` is `'Content Too Large'`.

## Usage

Import all named exports from `apiful/http-status-phrases` as local names, and use them as needed.

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
