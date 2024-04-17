import type { OpenAPI3, OpenAPITSOptions } from 'openapi-typescript'

export interface OpenAPIEndpoint {
  schema?: string | URL | OpenAPI3 | (() => Promise<OpenAPI3>)
  openAPITS?: OpenAPITSOptions
}

export function defineEndpoints<
  T extends Record<string, OpenAPIEndpoint>,
>(endpoints: T) {
  return endpoints
}
