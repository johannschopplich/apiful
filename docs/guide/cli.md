# Command Line Interface

APIful includes a command line interface (CLI) for generating TypeScript definitions from OpenAPI schemas. View all available commands with the help flag:

```sh
npx apiful --help
```

This displays the following output:

<<< @/snippets/help.ansi

## Commands

The CLI currently provides one primary command:

### `generate`

Generates TypeScript definitions from OpenAPI schemas. This is the core command for enabling type-safe API clients.

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

> [!IMPORTANT]
> You must have a valid `apiful.config.ts` file with service definitions before running this command.

> [!TIP]
> Read the [OpenAPI](/extensions/openapi) extension documentation to learn how to build the type-safe API client.

By default, this command loads the APIful configuration from the `apiful.config.{js,ts,mjs,cjs,json}` file in the current working directory. If it cannot find a configuration file based on the supported extensions, it will throw an error.

The generated TypeScript types are saved as `apiful.d.ts` in the same directory. This file augments the `apiful/schema` module with your generated types, making them available to the [OpenAPI](/extensions/openapi) extension.

> [!NOTE]
> Commit the generated `apiful.d.ts` file to version control so all team members have access to the same types.

<<< @/snippets/generate.ansi

View all options for the `generate` command:

```sh
npx apiful generate --help
```

This displays the following output:

<<< @/snippets/generate-help.ansi

> [!NOTE]
> Although it is recommended to create a `apiful.config.ts` file with a [`defineApifulConfig`](/reference/define-apiful-config) default export, you can also write plain JavaScript (`.js`, `.mjs`, `.cjs`) or JSON (`.json`, `.json5`) configuration files.
