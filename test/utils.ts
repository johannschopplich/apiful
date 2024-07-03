import { fileURLToPath } from 'node:url'
import {
  createApp,
  defineEventHandler,
  getQuery,
  getRequestHeaders,
  readBody,
  toNodeListener,
} from 'h3'
import { listen } from 'listhen'
import { getRandomPort } from 'get-port-please'

export const currentDir = fileURLToPath(new URL('.', import.meta.url))

export async function createListener() {
  const app = createApp()
    .use(
      '/foo/1',
      defineEventHandler(() => ({ foo: '1' })),
    )
    .use(
      '/foo',
      defineEventHandler(() => ({ foo: 'bar' })),
    )
    .use(
      '/bar',
      defineEventHandler(async event => ({
        url: event.path,
        body: await readBody(event),
        headers: getRequestHeaders(event),
        method: event.method,
      })),
    )
    .use(
      '/params',
      defineEventHandler(event => getQuery(event)),
    )

  return await listen(toNodeListener(app), {
    port: await getRandomPort(),
  })
}
