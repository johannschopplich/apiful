# APIful

A fetch client composed from extensions, typed from the OpenAPI document of each configured service without generated client code.

## Language

### Generation

**Service**:
A named API in the APIful configuration, typed from its OpenAPI document.

**OpenAPI document**:
The complete OpenAPI description of one service's API.
_Avoid_: schema, spec – the `schema` configuration key and the `apiful/schema` modules keep the word

**Schema**:
A schema object inside an OpenAPI document, describing one value, such as `Pet`.

**Generated types**:
What `apiful generate` writes for the configured services: the entry and one fragment per service.
_Avoid_: TypeScript definitions, OpenAPI types, declarations

**Entry**:
The `apiful/schema` module of the generated types, listing every service and declaring each service's type helpers.

**Fragment**:
The `apiful/schema/<service>` module of the generated types, declaring the `paths` and `components` of one service.
_Avoid_: per-service file, service declaration file

**Type helpers**:
The types the entry declares for one service, named after it, such as `PetStore` and `PetStoreModel`.

**Generation plan**:
The files one `apiful generate` run would write and delete, and the directories it would create, decided before any of them is touched.

### Client

**Extension**:
A function or object a client carries, added with `with`.

**Built-in extension**:
One of the handler extensions APIful ships – ofetch, OpenAPI, and API router.
_Avoid_: adapter

**Extension builder**:
A function that takes a client and returns an extension, such as the one `ofetchBuilder()` returns.
_Avoid_: extension, for the builder itself

**Handler extension**:
An extension that is a function, which becomes the client's call signature.

**Methods extension**:
An extension that is an object, whose entries become methods on the client.
