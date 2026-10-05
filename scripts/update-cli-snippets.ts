import * as fsp from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'
import { consola } from 'consola'
import { exec } from 'tinyexec'
import pkg from '../package.json' with { type: 'json' }

const rootDir = path.join(import.meta.dirname, '..')
const snippetDir = path.join(rootDir, 'docs/snippets')
const cliEntry = path.join(rootDir, 'src/cli/entry.ts')

const fixtureDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'apiful-cli-snippets-'))
await fsp.copyFile(
  path.join(rootDir, 'test/fixtures/test-echo-api-schema.yml'),
  path.join(fixtureDir, 'schema.yml'),
)
await fsp.writeFile(
  path.join(fixtureDir, 'apiful.config.ts'),
  `export default { services: { testEcho: { schema: 'schema.yml' } } }\n`,
)

await capture('help.ansi', ['--help'])
await capture('generate-help.ansi', ['generate', '--help'])
await capture('generate.ansi', ['generate', `--root=${fixtureDir}`])

await fsp.rm(fixtureDir, { recursive: true, force: true })
consola.success('Generated the CLI snippets in `docs/snippets`')

/**
 * Runs the CLI once and writes everything it printed to a snippet file. Both
 * streams are kept, since help goes to stdout while a command reports its
 * result on stderr.
 */
async function capture(fileName: string, argv: string[]): Promise<void> {
  const { stdout, stderr } = await exec('node', [cliEntry, ...argv], {
    nodeOptions: { env: { ...process.env, FORCE_COLOR: '1' } },
  })

  const transcript = [stdout, stderr].filter(Boolean).join('').trimEnd()
  // Help opens with `name vX.Y.Z`, which would otherwise rewrite the help snippets on every release.
  await fsp.writeFile(path.join(snippetDir, fileName), `${transcript.replace(` v${pkg.version}`, '')}\n`)
}
