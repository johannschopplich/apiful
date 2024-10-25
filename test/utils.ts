import { fileURLToPath } from 'node:url'
import { getRandomPort } from 'get-port-please'
import {
  createApp,
  createError,
  defineEventHandler,
  getQuery,
  getRequestHeaders,
  readBody,
  toNodeListener,
} from 'h3'
import { listen } from 'listhen'

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
      defineEventHandler(async (event) => {
        const body = await readBody(event)

        if (body?.throw) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
          })
        }

        return {
          url: event.path,
          body,
          headers: getRequestHeaders(event),
          method: event.method,
        }
      }),
    )
    .use(
      '/params',
      defineEventHandler(event => getQuery(event)),
    )

  return await listen(toNodeListener(app), {
    port: await getRandomPort(),
  })
}
