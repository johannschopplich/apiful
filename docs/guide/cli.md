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

> [!TIP]
> Read the [OpenAPI](/extensions/openapi) extension documentation to learn how to build the type-safe API client.

By default, this command loads the APIful configuration from the `apiful.config.ts` file in the current working directory. The generated TypeScript types are saved to the `apiful.d.ts` file in the same directory.

<<< @/snippets/generate.ansi

Display all available options for the `generate` command with the `--help` flag:

```sh
npx apiful generate --help
```

It will display the following output:

<<< @/snippets/generate-help.ansi
