---
layout: home

hero:
  image:
    light: /logo-light.svg
    dark: /logo-dark.svg
    alt: APIful logo
  name: APIful
  text: Extensible, Typed API Tooling
  tagline: From generated OpenAPI clients to server-side utilities, for any JavaScript runtime
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Extensions
      link: /guide/using-extensions
    - theme: alt
      text: Utilities
      link: /utilities/
    - theme: alt
      text: View on GitHub
      link: https://github.com/johannschopplich/apiful
features:
  - icon: <span class="i-carbon:build-tool"></span>
    title: Extensible API Client
    details: Unified <code>createClient</code> interface foundation to build custom API clients.
    link: /guide/getting-started
    linkText: Get Started
  - icon: <span class="i-carbon:plug"></span>
    title: Built-in Extensions
    details: Includes an ofetch adapter, OpenAPI support, and API router extension.
    link: /guide/using-extensions#built-in-extensions
    linkText: Explore Extensions
  - icon: <span class="i-carbon:connect"></span>
    title: Typed Extensibility
    details: Add methods to your API client with full type safety.
    link: /guide/custom-extensions
    linkText: Create Extensions
  - icon: <span class="i-carbon:ibm-watson-knowledge-studio"></span>
    title: Schema Generation
    details: Generate TypeScript definitions for any OpenAPI schema.
    link: /extensions/openapi#schema-generation
    linkText: Generate Schemas
  - icon: <span class="i-carbon:api"></span>
    title: OpenAPI Client Generator
    details: Create fully typed API clients from OpenAPI specifications.
    link: /extensions/openapi
    linkText: OpenAPI Integration
  - icon: <span class="i-carbon:chart-network"></span>
    title: UnJS Integration
    details: Designed to work seamlessly with UnJS tooling.
    link: /extensions/ofetch
    linkText: ofetch Adapter
  - icon: <span class="i-carbon:application"></span>
    title: Server-Side Utilities
    details: Ease server-side development with utilities for Hono, Elysia, and more.
    link: /utilities
    linkText: Import Utilities
  - icon: <span class="i-carbon:code"></span>
    title: TypeScript-First
    details: Enjoy full TypeScript support with robust type inference.
    link: /reference
    linkText: Reference
---
