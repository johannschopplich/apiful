import type { Listener } from 'listhen'
import { fileURLToPath } from 'node:url'
import { getRandomPort } from 'get-port-please'
import {
  createApp,
  defineEventHandler,
  getQuery,
  getRequestHeaders,
  readBody,
  toNodeListener,
} from 'h3'
import { listen } from 'listhen'

export const currentDir: string = fileURLToPath(new URL('.', import.meta.url))

export async function createListener(): Promise<Listener> {
  const app = createApp()
    .use(
      '/echo/static/constant',
      defineEventHandler(() => ({ value: 'foo' })),
    )
    .use(
      '/echo/request',
      defineEventHandler(async event => ({
        path: event.path,
        body: await readBody(event),
        headers: getRequestHeaders(event),
        method: event.method,
      })),
    )
    .use(
      '/echo/query',
      defineEventHandler(event => getQuery(event)),
    )

  return await listen(toNodeListener(app), {
    port: await getRandomPort(),
  })
}
