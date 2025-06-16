# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development

- `pnpm install` - Install dependencies
- `pnpm dev` - Run playground development environment (executes `playground/clients.ts`)
- `pnpm build` - Build the package using tsdown
- `pnpm test` - Run tests with Vitest and type checking
- `pnpm test:types` - Run TypeScript type checking only
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Run ESLint with auto-fix

### CLI Usage

- `npx apiful generate` - Generate TypeScript types from OpenAPI schemas
- `tsx src/cli generate --root="playground"` - Generate types for playground (used in prepare script)

### Documentation

- `pnpm docs:dev` - Start VitePress development server
- `pnpm docs:build` - Build documentation
- `pnpm docs:preview` - Preview built documentation

## Architecture Overview

APIful is a modular API client library built around a core extensible client system:

### Core Architecture

- **Client System** (`src/client.ts`): The foundation is `createClient()` which creates an extensible `ApiClient` that can be enhanced with extensions via the `.with()` method
- **Extension Pattern**: Extensions can be either handler functions (that become the callable client) or method objects (that add methods to the client)
  - Handler extensions implement the actual HTTP request logic
  - Methods extensions add utility functions and additional capabilities

### Built-in Extensions (`src/extensions/`)

- **ofetch** (`ofetch.ts`): Wraps the ofetch library for HTTP requests
- **api-router** (`api-router.ts`): Provides jQuery/Axios-like chainable API (`api.users.get()`, etc.)
- **openapi** (`openapi.ts`): Type-safe API client based on OpenAPI schemas

### OpenAPI Integration (`src/openapi/`)

- **Type Generation** (`generate.ts`): Generates TypeScript types from OpenAPI schemas using `openapi-typescript`
- **Client Integration** (`client.ts`): Integrates generated types with the client system
- **Configuration** (`src/config.ts`): Defines service configurations for type generation

### CLI (`src/cli/`)

- Built with citty for command structure
- Main command: `generate` - processes `apiful.config.ts` files to generate types from OpenAPI schemas
- Configuration via `apiful.config.ts` files using `defineApifulConfig()`

### Key Files

- `src/index.ts` - Main package exports
- `src/client.ts` - Core client and extension system
- `src/config.ts` - Configuration types and helpers
- `playground/` - Development environment with example configurations
- `schema.js/schema.d.ts` - JSON Schema utilities

### Testing

- Uses Vitest with TypeScript type checking enabled
- Tests are organized by feature area in `test/` directory
- Includes snapshot testing for OpenAPI code generation
