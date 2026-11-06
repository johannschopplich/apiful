import type { OpenAPIDocument } from './openapi/load.ts'

export interface ServiceOptions {
  schema: string | URL | OpenAPIDocument | (() => Promise<OpenAPIDocument>)
}

export interface ApifulConfig {
  services: Record<string, ServiceOptions>
}

export function defineApifulConfig(config: ApifulConfig): ApifulConfig {
  return config
}
