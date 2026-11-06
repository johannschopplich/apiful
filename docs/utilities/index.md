# Utilities

Helpers that ship with APIful but need no client. The status constants fit server code in any framework, such as [Hono](https://hono.dev), [Elysia](https://elysiajs.com), or [Nitro](https://nitro.build).

| Utility | Import from | What it does |
|---|---|---|
| [HTTP Status Codes](/utilities/http-status-codes) | `apiful/http-status-codes` | Exports every registered status code as a constant, such as `NOT_FOUND` for `404`. |
| [HTTP Status Phrases](/utilities/http-status-phrases) | `apiful/http-status-phrases` | Exports the reason phrase of every registered status code, such as `'Not Found'`. |
| [JSON to Type Definition](/utilities/json-to-type-definition) | `apiful/utils` | Infers a TypeScript type from a JSON value and returns its source. |
