/**
 * Adapted from https://github.com/w3cj/stoker/blob/1802bced69dc0babe0072acead73a123700352ed/scripts/update-http-statuses.ts
 */
import type { SourceFile } from 'ts-morph'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { consola } from 'consola'
import { exec } from 'tinyexec'
import { Project, VariableDeclarationKind } from 'ts-morph'

interface JsonCodeComment {
  doc: string
  description: string
}

interface JsonCode {
  code: number
  phrase: string
  constant: string
  comment: JsonCodeComment
  isDeprecated?: boolean
}

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const project = new Project({ tsConfigFilePath: path.join(rootDir, 'tsconfig.json') })
const httpStatusCodes = await fetchHttpStatusCodes()

const statusCodeFile = createSourceFile(project, 'src/http-status-codes.ts', 'HTTP status codes')
const phrasesFile = createSourceFile(project, 'src/http-status-phrases.ts', 'HTTP status phrases')

for (const code of httpStatusCodes) {
  addCodeToFile(statusCodeFile, code, 'code')
  addCodeToFile(phrasesFile, code, 'phrase')
}

await project.save()
await exec('npx', ['eslint', '--fix', 'http-status-codes.ts', 'http-status-phrases.ts'], {
  nodeOptions: {
    cwd: path.join(rootDir, 'src'),
  },
})
consola.success('Generated `http-status-codes.ts` and `http-status-phrases.ts`')

function createSourceFile(project: Project, fileName: string, context: string) {
  const file = project.createSourceFile(fileName, {}, { overwrite: true })
  file.insertStatements(0, '// GENERATED FILE. DO NOT EDIT.\n')
  file.insertStatements(1, `// ${context} retrieved from https://raw.githubusercontent.com/prettymuchbryce/http-status-codes/refs/heads/master/codes.json`)
  return file
}

function addCodeToFile(file: SourceFile, code: JsonCode, valueKey: 'code' | 'phrase') {
  file.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: code.constant,
      initializer: valueKey === 'code' ? code[valueKey].toString() : `"${code[valueKey]}"`,
    }],
  }).addJsDoc({
    description: `${code.isDeprecated ? '@deprecated\n' : ''}${code.comment.doc}\n\n${code.comment.description}`,
  })
}

async function fetchHttpStatusCodes() {
  const response = await fetch('https://raw.githubusercontent.com/prettymuchbryce/http-status-codes/refs/heads/master/codes.json')
  if (!response.ok) {
    throw new Error(`Failed to retrieve HTTP status codes: ${response.statusText}`)
  }
  return (await response.json()) as JsonCode[]
}
