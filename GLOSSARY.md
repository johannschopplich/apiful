# Context

## Glossary

**Generation plan** – everything a `generate` run would change on disk, decided before it touches any of it: the contents of every file it would write, the generated fragments it would delete, the directories it would create, and the line it reports afterwards. `--check` compares a plan against what is already there instead of applying it.

**Service** – an OpenAPI schema declared under a name in `apiful.config.ts`. The service name keys everything generated from it: the `apiful/schema/<service>` module, the type helpers named after it, such as `PetStore`, and the type argument of `createOpenAPIClient` and `openAPIBuilder`.
