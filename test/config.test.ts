import { describe, expect, it } from 'vitest'
import { defineApifulConfig } from '../src/config'

describe('defineApifulConfig', () => {
  it('accepts valid configuration', () => {
    const config = defineApifulConfig({
      services: {
        api: {
          url: 'https://api.example.com',
          schema: 'https://api.example.com/openapi.json',
        },
      },
    })

    expect(config).toEqual({
      services: {
        api: {
          url: 'https://api.example.com',
          schema: 'https://api.example.com/openapi.json',
        },
      },
    })
  })

  it('allows empty services', () => {
    const config = defineApifulConfig({
      services: {},
    })

    expect(config).toEqual({ services: {} })
  })

  it('supports multiple services', () => {
    const config = defineApifulConfig({
      services: {
        main: {
          url: 'https://api.example.com',
          schema: 'https://api.example.com/openapi.json',
        },
        secondary: {
          url: 'https://api2.example.com',
          schema: 'https://api2.example.com/openapi.json',
        },
      },
    })

    expect(Object.keys(config.services)).toHaveLength(2)
    expect(config.services.main).toBeDefined()
    expect(config.services.secondary).toBeDefined()
  })
})
