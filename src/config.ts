import type { OpenAPI3, OpenAPITSOptions } from 'openapi-typescript'

export interface ServiceOptions {
  url?: string
  schema?: string | URL | OpenAPI3 | (() => Promise<OpenAPI3>)
  openAPITS?: OpenAPITSOptions
}

export interface ApifulConfig {
  services: Record<string, ServiceOptions>
}

export function defineApifulConfig(config: ApifulConfig) {
  return config
}
