---
outline: deep
---

# Command Line Interface

APIful includes a command line interface (CLI) for generating TypeScript definitions from OpenAPI schemas. View all available commands with the help flag:

```sh
npx apiful --help
```

This displays the following output:

<<< @/snippets/help.ansi

## Commands

### `generate`

Generates the types the [OpenAPI extension](/extensions/openapi) reads.

By default, this command loads the [configuration](/reference/define-apiful-config) from the `apiful.config.{ts,mts,js,mjs}` file in the current working directory, or in the directory `--root` points to. The CLI imports the file with Node's native `import()`, so the configuration is a regular ES module: it can import other modules, branch on conditions, and read `process.env`. A TypeScript configuration runs through Node's built-in type stripping, which supports only erasable syntax – no `enum`s, no parameter properties – and a relative import names its file extension, such as `./services.ts`. In a project whose `package.json` declares no `"type"`, Node warns with `MODULE_TYPELESS_PACKAGE_JSON` as it imports an `apiful.config.ts` or `.js`, and under `"type": "commonjs"` it fails to load one – name the file `apiful.config.mts` or `.mjs` instead to mark it as an ES module.

The types are saved as `apiful.d.ts` in the same directory, where they augment the `apiful/schema` module. `--outfile` and `--outdir` resolve against that directory, too.

A schema that cannot be read or parsed fails the whole run: the command reports the service it choked on, exits with code `1`, and writes no types, rather than leaving you with a client that compiles and is silently untyped. Calling the [type generator](/reference/type-generator) from your own code instead of the CLI, the same failure arrives as a `SchemaGenerationError`.

A service with no `schema` has nothing to generate from, so the run skips it and names it in a warning. Every other service is still generated, and the run succeeds. Where no service has a schema, the run does nothing: output from earlier runs stays on disk, and `--check` passes. In a TypeScript configuration the omission is a type error long before that, since `schema` is required.

> [!NOTE]
> Commit the generated `apiful.d.ts` file to version control so all team members have access to the same types, and run [`--check`](#keeping-generated-types-current) in CI so a schema change cannot land without them.

<<< @/snippets/generate.ansi

View all options for the `generate` command:

```sh
npx apiful generate --help
```

This displays the following output:

<<< @/snippets/generate-help.ansi

#### Keeping Generated Types Current

The generated file is a build artifact you commit, which means it can fall behind the schema it came from. `--check` catches that: it generates into memory, compares the result against the files on disk, and writes nothing.

```sh
npx apiful generate --check
```

The command exits with code `0` when the files already match, and with code `1` when they do not – listing each file that is missing, out of date, or left over from a service the configuration no longer lists. That makes it a CI step:

```yaml
- run: npx apiful generate --check
```

`--check` combines with `--outfile` and `--outdir`, so it verifies whichever layout you generate.

#### Fragmented Output

For projects with many services, the generated type declaration file can grow large. Use `--outdir` to split the output into a directory structure with separate files per service:

```sh
npx apiful generate --outdir generated
```

The generated output follows this structure:

- `generated/apiful.d.ts` – Main entry file with shared type helpers
- `generated/schema/*.d.ts` – Individual service declaration files

Splitting types into separate files keeps git diffs smaller and improves IDE performance for large schemas.

Each run rewrites the entry file and the fragment of every configured service, and deletes the fragments of services the configuration no longer lists. Files it did not write are left alone, so the directory may hold your own sources as well.

To return to single-file mode, run the command with `--outfile` (or use the default behavior) and delete the directory yourself – nothing outside a run's own output is ever removed.
