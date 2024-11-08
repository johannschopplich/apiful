# Command Line Interface

APIful provides a command line interface (CLI). Run the CLI with the `--help` flag to see the available commands:

```sh
npx apiful --help
```

It will display the following output:

<<< @/snippets/help.ansi

## Commands

At the current development stage, the CLI provides only one command:

### `generate`

Generates TypeScript definitions from OpenAPI schemas.

This command requires the `openapi-typescript` package, which APIful does not include by default to keep its package size small. Install the package using your preferred package manager:

::: code-group
  ```bash [pnpm]
  pnpm add -D openapi-typescript
  ```
  ```bash [yarn]
  yarn add -D openapi-typescript
  ```
  ```bash [npm]
  npm install -D openapi-typescript
  ```
:::

> [!TIP]
> Read the [OpenAPI](/extensions/openapi) extension documentation to learn how to build the type-safe API client.

By default, this command loads the APIful configuration from the `apiful.config.{js,ts,mjs,cjs,json}` file in the current working directory. If it cannot find a configuration file based on the supported extensions, it will throw an error.

The generated TypeScript types are stored in the file `apiful.d.ts` in the same directory. It augments the `apiful/schema` module with the generated types, so that the [OpenAPI](/extensions/openapi) extension and you can access the globally defined types.

<<< @/snippets/generate.ansi

Display all available options for the `generate` command with the `--help` flag:

```sh
npx apiful generate --help
```

It will display the following output:

<<< @/snippets/generate-help.ansi

> [!NOTE]
> Although it is recommended to create a `apiful.config.ts` file with a [`defineApifulConfig`](/reference/define-apiful-config) default export, you can also write plain JavaScript (`.js`, `.mjs`, `.cjs`) or JSON (`.json`, `.json5`) configuration files.
