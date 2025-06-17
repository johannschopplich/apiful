import type { Listener } from 'listhen'
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

export const currentDir: string = fileURLToPath(new URL('.', import.meta.url))

export async function createListener(): Promise<Listener> {
  const app = createApp()
    // Static constant endpoint - GET only
    .use(
      '/echo/static/constant',
      defineEventHandler((event) => {
        if (event.method !== 'GET') {
          throw createError({ statusCode: 405 })
        }

        return { value: 'foo' }
      }),
    )
    // Request echo endpoints - specific HTTP methods
    .use(
      '/echo/request',
      defineEventHandler(async (event) => {
        const allowedMethods = ['POST', 'PUT', 'PATCH', 'DELETE']

        if (!allowedMethods.includes(event.method)) {
          throw createError({ statusCode: 405 })
        }

        // Handle request body based on method
        let body: Record<string, any> | undefined
        try {
          if (event.method !== 'DELETE') {
            body = await readBody(event).catch(() => ({}))
          }
        }
        catch {
          throw createError({ statusCode: 400 })
        }

        return {
          path: event.path,
          body,
          headers: getRequestHeaders(event),
          method: event.method,
        }
      }),
    )
    // Query parameters endpoint - GET only
    .use(
      '/echo/query',
      defineEventHandler((event) => {
        if (event.method !== 'GET') {
          throw createError({ statusCode: 405 })
        }

        return getQuery(event)
      }),
    )
    // 404 handler for non-existent routes
    .use(
      defineEventHandler(() => {
        throw createError({ statusCode: 404 })
      }),
    )

  return await listen(toNodeListener(app), {
    port: await getRandomPort(),
  })
}
