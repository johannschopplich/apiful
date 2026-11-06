import type { ApifulConfig } from '../config.ts'
import { existsSync } from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { CliError } from 'utilful/cli'

const CONFIG_FILE_NAMES = ['apiful.config.ts', 'apiful.config.mts', 'apiful.config.js', 'apiful.config.mjs']

let importCount = 0

/**
 * Imports the first configuration file found in `rootDir`. Node strips the types of a
 * TypeScript configuration itself, so it may only use erasable syntax.
 */
export async function loadConfig(rootDir: string): Promise<Partial<ApifulConfig>> {
  const configPath = CONFIG_FILE_NAMES
    .map(fileName => path.resolve(rootDir, fileName))
    .find(filePath => existsSync(filePath))

  if (!configPath) {
    const [preferredFileName, ...otherFileNames] = CONFIG_FILE_NAMES
    const otherExtensions = otherFileNames.map(fileName => `\`${path.extname(fileName)}\``).join(', ')
    throw new CliError(`No configuration file found in \`${rootDir}\` – create an \`${preferredFileName}\` (or ${otherExtensions}) file`)
  }

  // A unique query string bypasses the module cache, so a second run in the same process
  // reads the file as it is now.
  const configUrl = `${pathToFileURL(configPath).href}?apiful=${++importCount}`
  const { default: config } = await import(/* @vite-ignore */ configUrl) as { default?: Partial<ApifulConfig> }

  if (!config) {
    throw new CliError(`Configuration file \`${path.basename(configPath)}\` has no default export`)
  }

  if (typeof config === 'function') {
    throw new CliError(`Configuration file \`${path.basename(configPath)}\` exports a function – export the configuration object instead`)
  }

  return config
}
