import { readFile } from 'node:fs/promises'
import { isBuiltin } from 'node:module'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { currentDir } from '../utils'

const IMPORT_SPECIFIER_RE = /\b(?:from\s*|import\s*(?:\(\s*)?)['"]([^'"]+)['"]/g

describe('apiful/openapi', () => {
  it('reaches no Node.js built-in module', async () => {
    const specifiers = await collectImportSpecifiers(path.resolve(currentDir, '../src/openapi/index.ts'))

    expect(specifiers.filter(specifier => isBuiltin(specifier))).toEqual([])
  })
})

/** Follows the relative imports of a module and returns every other specifier they reach. */
async function collectImportSpecifiers(entryPath: string): Promise<string[]> {
  const visitedPaths = new Set<string>()
  const externalSpecifiers = new Set<string>()
  const pendingPaths = [entryPath]

  while (pendingPaths.length) {
    const modulePath = pendingPaths.pop()!
    if (visitedPaths.has(modulePath))
      continue
    visitedPaths.add(modulePath)

    const source = await readFile(modulePath, 'utf8')
    for (const [, specifier] of source.matchAll(IMPORT_SPECIFIER_RE)) {
      if (specifier!.startsWith('.'))
        pendingPaths.push(path.resolve(path.dirname(modulePath), specifier!))
      else
        externalSpecifiers.add(specifier!)
    }
  }

  return [...externalSpecifiers]
}
