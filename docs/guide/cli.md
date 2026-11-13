---
outline: deep
---

# Command Line Interface

The `apiful` command line interface (CLI) generates types from the OpenAPI document of each service. `--help` lists its commands:

```sh
npx apiful --help
```

<<< @/snippets/help.ansi

## `generate`

Generates the types the [OpenAPI extension](/extensions/openapi) reads.

```sh
npx apiful generate
```

<<< @/snippets/generate.ansi

`--help` lists the options of the command:

```sh
npx apiful generate --help
```

<<< @/snippets/generate-help.ansi

### Configuration and Output

By default, this command loads the [configuration](/reference/define-apiful-config) from the `apiful.config.{ts,mts,js,mjs}` file in the current working directory, or in the directory `--root` points to. The CLI imports the file with Node's native `import()`, so the configuration is a regular ES module: it can import other modules, branch on conditions, and read `process.env`. Three rules follow from that:

- A TypeScript configuration runs through Node's built-in type stripping, which supports only erasable syntax – no `enum`s, no parameter properties.
- A relative import names its file extension, such as `./services.ts`.
- In a project whose `package.json` declares no `"type"`, Node warns with `MODULE_TYPELESS_PACKAGE_JSON` as it imports an `apiful.config.ts` or `.js`, and under `"type": "commonjs"` it fails to load one. Name the file `apiful.config.mts` or `.mjs` to mark it as an ES module.

The types are saved as `apiful.d.ts` in the same directory, where they augment the `apiful/schema` module. `--outfile` and `--outdir` resolve against that directory, too, and exclude each other – passing both fails the run.

### Failed and Skipped Services

An OpenAPI document that cannot be read or parsed fails the whole run: the command reports the service it choked on, exits with code `1`, and writes no types, rather than leaving you with a client that compiles and is silently untyped. So does a service name the [type generator rejects](/reference/type-generator#generatetypes). The command prints the error message only; add `--verbose` to print the stack trace, too. Called from your own code instead of the CLI, the type generator rejects with a `GenerationError` for the same failures.

A service with no `schema` has nothing to generate from, so the run skips it and names it in a warning. Every other service is still generated, and the run succeeds. Where no service sets a `schema`, the run does nothing: output from earlier runs stays on disk, and `--check` passes. In a TypeScript configuration the omission is a type error long before that, since `schema` is required.

### Keep Generated Types Current

Commit the generated types to version control, so every checkout compiles against the same ones. A committed file can fall behind the OpenAPI document it came from, and `--check` catches that: it generates into memory, compares the result against the files on disk, and writes nothing.

```sh
npx apiful generate --check
```

The command exits with code `0` when the files already match, and with code `1` when they do not – listing each file that is missing, out of date, or left over from a service the configuration no longer lists. That makes it a CI step:

```yaml
- run: npx apiful generate --check
```

`--check` combines with `--outfile` and `--outdir`, so it verifies whichever layout you generate.

### Split the Output Into Files

For projects with many services, the single generated file can grow large. `--outdir` writes the entry and each fragment to a file of its own instead:

```sh
npx apiful generate --outdir generated
```

The run writes:

- `generated/apiful.d.ts` – the entry, which lists every service and declares each service's type helpers
- `generated/schema/<service>.d.ts` – one fragment per service, declaring its `paths` and `components`

Each service's types then change in a file of their own, so a diff shows which services a regeneration touched.

Each run rewrites the entry file and the fragment of every configured service, and deletes the fragments of services the configuration no longer lists. Files it did not write are left alone, so the directory may hold your own sources as well.

That includes the `apiful.d.ts` of an earlier single-file run, which keeps declaring the same modules. Delete it when you switch, or pass `--outdir .` to overwrite it with the entry.

To return to single-file mode, run the command with `--outfile` (or use the default behavior) and delete the directory yourself – nothing outside a run's own output is ever removed.
