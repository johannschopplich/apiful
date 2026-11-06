# Reference

The exported symbols, their type definitions, and the options each one takes. For how the pieces fit together, start with the [guide](/guide/getting-started).

## Methods

| Method | What it does |
|---|---|
| [`createClient`](/reference/create-client) | Creates a client from default fetch options. Every APIful client starts here. |
| [`createOpenAPIClient`](/reference/create-openapi-client) | Creates a client typed from the generated types of one service, without the extension chain. |
| [`defineApifulConfig`](/reference/define-apiful-config) | Declares the services the [`generate`](/guide/cli) command reads. |
| [Type Generator](/reference/type-generator) | Generates the types the `generate` command writes, for tools that write them themselves. |

## Types

| Type | What it describes |
|---|---|
| [`ApiClient`](/reference/api-client) | The client itself: its default options and the `with` method that extends it. |
| [`HandlerExtensionBuilder`](/reference/handler-extension-builder) | A function that takes the client and returns its call signature. |
| [`MethodsExtensionBuilder`](/reference/methods-extension-builder) | A function that takes the client and returns named methods to add to it. |

## Type Helpers

[OpenAPI Type Helpers](/reference/openapi-type-helpers) name the types of one operation, or of one schema in `components`, from the generated types – useful when you need one in a signature of your own.
