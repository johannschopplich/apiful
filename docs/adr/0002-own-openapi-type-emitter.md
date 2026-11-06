# APIful generates the types of OpenAPI documents itself

APIful's type generator is its own, ported from openapi-typescript, rather than a dependency on openapi-typescript. openapi-typescript is in maintenance mode and receives no more updates ([openapi-ts/openapi-typescript#2874](https://github.com/openapi-ts/openapi-typescript/issues/2874)), and it builds its output through `ts.factory`, which TypeScript 7 no longer provides, so it fails on load there ([openapi-ts/openapi-typescript#2841](https://github.com/openapi-ts/openapi-typescript/issues/2841)). The type generator writes the types as strings without the compiler API, so one build serves every TypeScript version [the types check against](../guide/getting-started.md#install-apiful).

## Consequences

The output shape is APIful's contract, and a change to it asks users to regenerate; the [differences from openapi-typescript](../guide/migrating-from-openapi-typescript.md#where-the-generated-types-differ) list each departure. The type generator takes no options, since every option of openapi-typescript would have to be ported and kept working, and the types it emits are the ones the client and the type helpers expect.
