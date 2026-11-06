import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { defineApifulConfig } from '../../src/config'
import {
  declareModule,
  EMPTY_SCHEMA_TYPES,
  generateDeclarations,
  generateSchemaTypes,
  generateTypeHelpers,
  SchemaGenerationError,
} from '../../src/openapi/generate'
import { currentDir } from '../utils'

const config = defineApifulConfig({
  services: {
    testEcho: {
      schema: path.join(currentDir, 'fixtures/test-echo-api-schema.yml'),
    },
  },
})

describe('generateDeclarations', () => {
  it('generates an entry and one fragment per service', async () => {
    const { entry, fragments } = await generateDeclarations(config.services)

    expect(entry).toMatchSnapshot()
    expect(fragments).toMatchSnapshot()
  })

  it('rejects services whose generated type names collide', async () => {
    const service = config.services.testEcho!

    await expect(generateDeclarations({ foo: service, fooModel: service }))
      .rejects
      .toThrow(new SchemaGenerationError('Services `foo` and `fooModel` both generate the type `FooModel`'))
    await expect(generateDeclarations({ foo: service, fooModel: service }))
      .rejects
      .toHaveProperty('name', 'SchemaGenerationError')
  })

  it('rejects a service whose generated type name is no identifier', async () => {
    await expect(generateDeclarations({ '1password': config.services.testEcho! }))
      .rejects
      .toThrow(new SchemaGenerationError('Service `1password` generates the type `1password`, which is not a valid identifier'))
  })

  it('rejects a service whose name holds a path separator', async () => {
    await expect(generateDeclarations({ 'a/b': config.services.testEcho! }))
      .rejects
      .toThrow(new SchemaGenerationError('Service `a/b` may only hold letters, digits, `_`, `$`, `.`, and `-`'))
  })

  it('accepts a service whose generated type name starts with a non-ASCII letter', async () => {
    const { entry } = await generateDeclarations({ über: config.services.testEcho! })

    expect(entry).toContain('export type Über<')
  })

  it('rejects a service whose generated type name is OpenAPIEndpoint', async () => {
    await expect(generateDeclarations({ openAPIEndpoint: config.services.testEcho! }))
      .rejects
      .toThrow(new SchemaGenerationError('Service `openAPIEndpoint` generates the type `OpenAPIEndpoint`, which the `apiful/schema` module declares itself'))
  })
})

describe('generateSchemaTypes', () => {
  it('emits the types of a document at the top level', () => {
    const types = generateSchemaTypes({
      openapi: '3.1.0',
      info: { title: 'Pets', version: '1.0.0' },
      components: { schemas: { Pet: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } },
    })

    expect(types).toBe(`export type paths = Record<string, never>;
export interface components {
  schemas: {
    Pet: {
      name: string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
`)
  })

  it('returns EMPTY_SCHEMA_TYPES for a document declaring no paths or components', () => {
    expect(generateSchemaTypes({ openapi: '3.1.0', info: { title: 'Empty', version: '1.0.0' } })).toBe(EMPTY_SCHEMA_TYPES)
  })

  it('types an allOf child of a discriminated parent as its discriminator value and the parent without it', () => {
    const types = generateSchemaComponentTypes({
      Pet: { type: 'object', required: ['petType'], properties: { petType: { type: 'string' } }, discriminator: { propertyName: 'petType' } },
      Cat: { allOf: [{ $ref: '#/components/schemas/Pet' }, { type: 'object', properties: { meows: { type: 'boolean' } } }] },
    })

    expect(types).toContain(`    Cat: {
      petType: "Cat";
    } & (Omit<components["schemas"]["Pet"], "petType"> & {
      meows?: boolean;
    });`)
  })

  it('adds the discriminator value to an allOf child whose discriminated parent follows another ref', () => {
    const types = generateSchemaComponentTypes({
      Base: { type: 'object', properties: { id: { type: 'string' } } },
      Pet: { type: 'object', required: ['petType'], properties: { petType: { type: 'string' } }, discriminator: { propertyName: 'petType' } },
      Cat: { allOf: [{ $ref: '#/components/schemas/Base' }, { $ref: '#/components/schemas/Pet' }] },
    })

    expect(types).toContain(`    Cat: {
      petType: "Cat";
    }`)
  })

  it('inlines a discriminated parent into an allOf child that its oneOf lists', () => {
    const types = generateSchemaComponentTypes({
      Pet: {
        type: 'object',
        properties: { name: { type: 'string' } },
        oneOf: [{ $ref: '#/components/schemas/Cat' }],
        discriminator: { propertyName: 'petType' },
      },
      Cat: { allOf: [{ $ref: '#/components/schemas/Pet' }, { type: 'object', properties: { meows: { type: 'boolean' } } }] },
    })

    expect(types).toContain(`    Cat: Omit<{
      name?: string;
    }, "petType"> & {
      meows?: boolean;
    }`)
  })

  it('adds the discriminator value once to an allOf child that the oneOf of its parent maps', () => {
    const types = generateSchemaComponentTypes({
      Shape: {
        oneOf: [{ $ref: '#/components/schemas/Circle' }],
        discriminator: { propertyName: 'kind', mapping: { round: '#/components/schemas/Circle' } },
      },
      Circle: { allOf: [{ $ref: '#/components/schemas/Shape' }, { type: 'object', properties: { radius: { type: 'number' } } }] },
    })

    expect(types.match(/kind: "round";/g)).toHaveLength(1)
  })

  it('narrows each oneOf member of a discriminated schema to its mapped value', () => {
    const types = generateSchemaComponentTypes({
      Shape: {
        oneOf: [{ $ref: '#/components/schemas/Circle' }],
        discriminator: { propertyName: 'kind', mapping: { round: '#/components/schemas/Circle' } },
      },
      Circle: { type: 'object', properties: { radius: { type: 'number' } } },
    })

    expect(types).toContain(`    Circle: {
      radius?: number;
      /**
       * @description discriminator enum property added by apiful
       * @enum {string}
       */
      kind: "round";
    };`)
  })

  it('narrows a oneOf member to the value a mapping assigns to its bare schema name', () => {
    const types = generateSchemaComponentTypes({
      Animal: {
        oneOf: [{ $ref: '#/components/schemas/Lion' }],
        discriminator: { propertyName: 'kind', mapping: { lion: 'Lion' } },
      },
      Lion: { type: 'object', properties: { roar: { type: 'boolean' } } },
    })

    expect(types).toContain('      kind: "lion";')
  })

  it('intersects the properties beside a oneOf of objects with the union of those objects', () => {
    const types = generateSchemaComponentTypes({
      Shape: {
        type: 'object',
        properties: { label: { type: 'string' } },
        oneOf: [{ $ref: '#/components/schemas/Circle' }, { $ref: '#/components/schemas/Square' }],
      },
      Circle: { type: 'object', properties: { radius: { type: 'number' } } },
      Square: { type: 'object', properties: { side: { type: 'number' } } },
    })

    expect(types).toContain(`    Shape: {
      label?: string;
    } & (components["schemas"]["Circle"] | components["schemas"]["Square"]);`)
  })

  it('folds an allOf member that lists required keys, an annotation, and an x- extension into the ref beside it', () => {
    const types = generateSchemaComponentTypes({
      Base: { type: 'object', properties: { id: { type: 'string' } } },
      Extended: { allOf: [{ $ref: '#/components/schemas/Base' }, { type: 'object' }] },
      Identified: {
        allOf: [{ $ref: '#/components/schemas/Base' }, { 'type': 'object', 'required': ['id'], '$comment': 'Set once stored', 'x-internal': true }],
      },
    })

    expect(types).toContain('    Extended: components["schemas"]["Base"];')
    expect(types).toContain('    Identified: WithRequired<components["schemas"]["Base"], "id">;')
  })

  it('makes a property required that an allOf member of its schema requires', () => {
    const types = generateSchemaComponentTypes({
      Named: { type: 'object', properties: { name: { type: 'string' } }, allOf: [{ required: ['name'] }] },
    })

    expect(types).toContain('      name: string;')
  })

  it('types an allOf whose sole member is an object listing required keys as Record<string, unknown>', () => {
    const types = generateSchemaComponentTypes({ Identified: { allOf: [{ type: 'object', required: ['id'] }] } })

    expect(types).toContain('    Identified: Record<string, unknown>;')
  })

  it('types an object schema without a properties or additionalProperties key as Record<string, unknown>', () => {
    const types = generateSchemaComponentTypes({
      Anything: { type: 'object' },
      Nothing: { type: 'object', properties: {} },
      Closed: { type: 'object', additionalProperties: false },
    })

    expect(types).toContain('    Anything: Record<string, unknown>;')
    expect(types).toContain('    Nothing: Record<string, never>;')
    expect(types).toContain('    Closed: Record<string, never>;')
  })

  it('types a string with a contentMediaType and a contentEncoding as string', () => {
    const types = generateSchemaComponentTypes({ Image: { type: 'string', contentMediaType: 'image/png', contentEncoding: 'base64' } })

    expect(types).toContain('Image: string;')
  })

  it('keeps a property with a default optional where `required` leaves it out', () => {
    const types = generateSchemaComponentTypes({ Page: { type: 'object', properties: { size: { type: 'integer', default: 10 } } } })

    expect(types).toContain('      size?: number;')
  })

  it('skips an additionalOperations method that a fixed field already declares', () => {
    const types = generateSchemaTypes({
      openapi: '3.2.0',
      info: { title: 'Items', version: '1.0.0' },
      paths: {
        '/items': {
          get: { responses: {} },
          additionalOperations: { GET: { responses: { 204: { description: 'No items' } } } },
        },
      },
    })

    expect(types).toBe(`export interface paths {
  "/items": {
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: never;
    };
  };
}
export type components = Record<string, never>;
`)
  })

  it('types a schema whose type list holds null and that has an allOf as nullable', () => {
    const types = generateSchemaComponentTypes({
      Base: { type: 'object', properties: { id: { type: 'string' } } },
      NullableBase: { type: ['object', 'null'], allOf: [{ $ref: '#/components/schemas/Base' }] },
    })

    expect(types).toContain('NullableBase: components["schemas"]["Base"] | null;')
  })

  it('types an Infinity const as number', () => {
    expect(generateSchemaComponentTypes({ Infinite: { const: Number.POSITIVE_INFINITY } })).toContain('Infinite: number;')
  })

  it('inlines a ref into the items of a schema component', () => {
    const types = generateSchemaComponentTypes({
      List: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' } } } },
      Item: { $ref: '#/components/schemas/List/items' },
    })

    expect(types).toContain(`    Item: {
      name?: string;
    };`)
  })

  it('inlines a component ref that points into an operation', () => {
    const types = generateSchemaTypes({
      openapi: '3.1.0',
      info: { title: 'Items', version: '1.0.0' },
      paths: {
        '/items': {
          get: { responses: { 200: { description: 'The items', content: { 'application/json': { schema: { type: 'array', items: { type: 'string' } } } } } } },
        },
      },
      components: { schemas: { Items: { $ref: '#/paths/~1items/get/responses/200/content/application~1json/schema' } } },
    })

    expect(types).toContain('    Items: string[];')
  })

  it('types a ref through an optional property as an indexed access on its non-nullable type', () => {
    const types = generateSchemaComponentTypes({
      Foo: { type: 'object', properties: { a: { type: 'object', properties: { b: { type: 'string' } } } } },
      B: { $ref: '#/components/schemas/Foo/properties/a/properties/b' },
    })

    expect(types).toContain('    B: NonNullable<components["schemas"]["Foo"]["a"]>["b"];')
  })

  it('types a ref through a required nullable property as an indexed access on its non-nullable type', () => {
    const types = generateSchemaComponentTypes({
      Foo: { type: 'object', required: ['a'], properties: { a: { type: 'object', nullable: true, properties: { b: { type: 'string' } } } } },
      B: { $ref: '#/components/schemas/Foo/properties/a/properties/b' },
    })

    expect(types).toContain('    B: NonNullable<components["schemas"]["Foo"]["a"]>["b"];')
  })

  it('inlines a ref to a property of a schema whose oneOf lists only primitives', () => {
    const types = generateSchemaComponentTypes({
      Value: { properties: { a: { type: 'string' } }, oneOf: [{ type: 'string' }, { type: 'number' }] },
      A: { $ref: '#/components/schemas/Value/properties/a' },
    })

    expect(types).toContain('    A: string;')
  })

  it('types a ref to a property that a component does not declare as unknown', () => {
    const types = generateSchemaComponentTypes({
      Foo: { type: 'object', properties: { a: { type: 'string' } } },
      Missing: { $ref: '#/components/schemas/Foo/properties/b' },
    })

    expect(types).toContain('    Missing: unknown;')
  })

  it('types a recursive ref into $defs as an indexed access on the optional $defs member', () => {
    const types = generateSchemaComponentTypes({
      Tree: {
        type: 'object',
        properties: { root: { $ref: '#/components/schemas/Tree/$defs/Node' } },
        $defs: { Node: { type: 'object', properties: { children: { type: 'array', items: { $ref: '#/components/schemas/Tree/$defs/Node' } } } } },
      },
    })

    expect(types).toContain('          children?: NonNullable<components["schemas"]["Tree"]["$defs"]>["Node"][];')
  })

  it('types a ref to a ref to a component as the component', () => {
    const types = generateSchemaComponentTypes({
      Foo: { type: 'object', properties: { self: { type: 'string' } } },
      List: { type: 'array', items: { $ref: '#/components/schemas/Foo' } },
      Alias: { $ref: '#/components/schemas/List/items' },
    })

    expect(types).toContain('    Alias: components["schemas"]["Foo"];')
  })

  it('types the recursive occurrence of a ref into items as unknown', () => {
    const types = generateSchemaComponentTypes({
      List: { type: 'array', items: { type: 'object', properties: { next: { $ref: '#/components/schemas/List/items' } } } },
      Item: { $ref: '#/components/schemas/List/items' },
    })

    expect(types).toContain(`    Item: {
      next?: unknown;
    };`)
  })

  it('makes the $defs of a schema optional', () => {
    const types = generateSchemaComponentTypes({
      Tree: { type: 'object', properties: { leaf: { $ref: '#/components/schemas/Tree/$defs/Leaf' } }, $defs: { Leaf: { type: 'string' } } },
    })

    expect(types).toContain('      $defs?: {')
  })

  it('quotes a property name with a non-ASCII letter', () => {
    const types = generateSchemaComponentTypes({ Order: { type: 'object', properties: { größe: { type: 'string' } } } })

    expect(types).toContain('      "gr\\u00F6\\u00DFe"?: string;')
  })

  it('types a null const as null', () => {
    expect(generateSchemaComponentTypes({ Nothing: { const: null } })).toContain('Nothing: null;')
  })

  it('widens the additionalProperties index signature with the types of the declared properties', () => {
    const types = generateSchemaComponentTypes({
      Scores: { type: 'object', required: ['name'], properties: { name: { type: 'string' } }, additionalProperties: { type: 'number' } },
    })

    expect(types).toContain('[key: string]: number | string;')
  })

  it('makes a required query parameter optional where its content schema declares a default', () => {
    const types = generateSchemaTypes({
      openapi: '3.1.0',
      info: { title: 'Items', version: '1.0.0' },
      paths: {
        '/items': {
          get: {
            parameters: [{
              name: 'sort',
              in: 'query',
              required: true,
              content: { 'application/json': { schema: { type: 'string', default: 'name' } } },
            }],
            responses: {},
          },
        },
      },
    })

    expect(types).toContain('sort?: string;')
  })

  it('makes a required query parameter optional where the schema of its content media type ref declares a default', () => {
    const types = generateSchemaTypes({
      openapi: '3.2.0',
      info: { title: 'Items', version: '1.0.0' },
      paths: {
        '/items': {
          get: {
            parameters: [{ name: 'sort', in: 'query', required: true, content: { 'application/json': { $ref: '#/components/mediaTypes/Sort' } } }],
            responses: {},
          },
        },
      },
      components: { mediaTypes: { Sort: { schema: { type: 'string', default: 'name' } } } },
    })

    expect(types).toContain('sort?: ')
  })

  it('emits no mediaTypes group for an openapi of 3.1', () => {
    const types = generateSchemaTypes({ openapi: '3.1', info: { title: 'Items', version: '1.0.0' }, components: {} })

    expect(types).not.toContain('mediaTypes')
  })

  it('keeps the anyOf of a schema whose oneOf restates every type of its type list', () => {
    const types = generateSchemaComponentTypes({
      Value: { type: ['string', 'null'], oneOf: [{ type: 'string' }, { type: 'null' }], anyOf: [{ type: 'number' }] },
    })

    expect(types).toContain('Value: (never | number) | string | null;')
  })

  it('types an OpenAPI 3.2 media type ref by its components.mediaTypes entry', () => {
    const mediaType = { $ref: '#/components/mediaTypes/Item' }
    const types = generateSchemaTypes({
      openapi: '3.2.0',
      info: { title: 'Items', version: '1.0.0' },
      paths: {
        '/items': {
          post: {
            requestBody: { content: { 'application/json': mediaType } },
            responses: { 200: { description: 'The item', content: { 'application/json': mediaType } } },
          },
        },
      },
      components: { mediaTypes: { Item: { schema: { type: 'string' } } } },
    })

    expect(types.match(/"application\/json": components\["mediaTypes"\]\["Item"\];/g)).toHaveLength(2)
    expect(types).toContain(`  mediaTypes: {
    Item: string;
  };`)
  })
})

describe('generateTypeHelpers', () => {
  it('references the paths and components identifiers it is given', () => {
    const helpers = generateTypeHelpers('petStore', { paths: 'PetPaths', components: 'PetComponents' })

    expect(helpers).toContain('= OpenAPIEndpoint<PetPaths, Path, Method>')
    expect(helpers).toContain('export type PetStoreModel<T extends keyof PetComponents[\'schemas\']> = PetComponents[\'schemas\'][T]')
  })
})

describe('declareModule', () => {
  it('wraps the body in a module declaration and indents every non-empty line', () => {
    expect(declareModule('#api/pets', 'export type a = 1\n\nexport type b = 2\n'))
      .toBe(`declare module '#api/pets' {\n  export type a = 1\n\n  export type b = 2\n}\n`)
  })
})

function generateSchemaComponentTypes(schemas: Record<string, unknown>): string {
  return generateSchemaTypes({ openapi: '3.1.0', info: { title: 'Schemas', version: '1.0.0' }, components: { schemas } })
}
