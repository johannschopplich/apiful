import type { Catalog } from 'apiful/schema'
import type { components, paths } from 'apiful/schema/catalog'
import { describe, expectTypeOf, it } from 'vitest'

describe('path items', () => {
  it('keys a path item by its declared methods only, a custom method in lowercase', () => {
    expectTypeOf<keyof paths['/files/{fileId}']>().toEqualTypeOf<'get' | 'put' | 'copy'>()
    expectTypeOf<keyof paths['/items']>().toEqualTypeOf<'get' | 'query'>()
  })

  it('folds path-level parameters into a custom method', () => {
    expectTypeOf<Catalog<'/files/{fileId}', 'copy'>['path']>().toEqualTypeOf<{ fileId: string }>()
  })
})

describe('binary payloads', () => {
  it('types a format: binary request body as Blob | File', () => {
    expectTypeOf<Catalog<'/files/{fileId}', 'put'>['request']>().toEqualTypeOf<Blob | File>()
  })

  it('types a response with a non-JSON contentMediaType as Blob | File', () => {
    expectTypeOf<Catalog<'/files/{fileId}', 'get'>['response']>().toEqualTypeOf<Blob | File>()
  })

  it('types a multipart/form-data request body as FormData', () => {
    expectTypeOf<Catalog<'/files', 'post'>['request']>().toEqualTypeOf<FormData>()
  })
})

describe('parameters', () => {
  it('makes a required parameter with a schema default optional', () => {
    type Parameters = Catalog<'/items', 'get'>['operation']['parameters']
    expectTypeOf<Pick<Parameters['query'] & {}, 'limit'>>().toEqualTypeOf<{ limit?: number }>()
    expectTypeOf<Pick<Parameters, 'header'>>().toEqualTypeOf<{ header?: { 'X-Locale'?: string } }>()
  })

  it('keeps a path parameter with a schema default required', () => {
    expectTypeOf<Catalog<'/items/{revision}', 'get'>['path']>().toEqualTypeOf<{ revision: string }>()
  })

  it('types an object sent as JSON in the query as its schema, and an array as a string', () => {
    type Query = Catalog<'/items', 'get'>['query']
    expectTypeOf<Pick<Query, 'filter'>>().toEqualTypeOf<{ filter?: components['schemas']['ItemFilter'] }>()
    expectTypeOf<Pick<Query, 'meta'>>().toEqualTypeOf<{ meta?: Record<string, unknown> }>()
    expectTypeOf<Pick<Query, 'ids'>>().toEqualTypeOf<{ ids?: string }>()
  })

  it('types an in: querystring parameter as the whole query', () => {
    expectTypeOf<Catalog<'/search', 'get'>['query']>().toEqualTypeOf<{ term?: string, page?: number }>()
  })
})

describe('schema refs', () => {
  it('never types the response of a discriminated parent that its oneOf child extends as any', () => {
    expectTypeOf<Catalog<'/pets', 'get'>['response']>().not.toBeAny()
  })

  it('types a ref into $defs recursively', () => {
    type Node = NonNullable<components['schemas']['Tree']['root']>
    expectTypeOf<NonNullable<Node['children']>[number]['label']>().toEqualTypeOf<string | undefined>()
  })
})
