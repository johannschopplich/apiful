import { defineApifulConfig } from './src/config'

export default defineApifulConfig({
  services: {
    sampleApi: {
      schema: 'test/fixtures/sample-api-schema.yml',
    },
    petStore: {
      schema: 'playground/schemas/pet-store.json',
    },
  },
})
