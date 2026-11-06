/**
 * Measures and compares what the generated types and the type helpers cost a consumer.
 * Every command takes project directories, each holding a tsconfig that type-checks a
 * consumer against one variant of the helpers or the generated schema types.
 *
 * node scripts/benchmark-types.ts bench <dir>... [--config=tsconfig.json] [--runs=5] [--tsc=<bin>]...
 *   Median check time, instantiations, types and memory per directory and compiler. `--tsc`
 *   repeats, for example once more with the `tsc` of TypeScript 7; the default is this repo's.
 *
 * node scripts/benchmark-types.ts compare <base-dir> <dir>... [--config=tsconfig.json]
 *   Diagnostics, and every top-level export of the consumer files whose printed type differs
 *   from the base, ignoring union member order: a function by its return type, a type alias
 *   by its expansion.
 *
 * node scripts/benchmark-types.ts schemas <old.d.ts> <new.d.ts>
 *   Mutual assignability of each operation in `paths` and each entry in `components` of two
 *   generated schema modules, drilling into the deepest members that differ.
 */
import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { parseArgs } from 'node:util'
import ts from 'typescript'

interface Measurement {
  checkMs: number
  instantiations: number
  types: number
  memoryMB: number
}

interface Mismatch {
  where: string
  kind: string
  old?: string
  new?: string
}

const rootDir = path.join(import.meta.dirname, '..')

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    config: { type: 'string', default: 'tsconfig.json' },
    runs: { type: 'string', default: '5' },
    tsc: { type: 'string', multiple: true },
  },
})
const [command, ...targets] = positionals

if (command === 'bench') {
  bench(targets, values.tsc ?? [
    path.join(rootDir, 'node_modules/.bin/tsc'),
  ], Number(values.runs))
}
else if (command === 'compare') {
  compare(targets[0]!, targets.slice(1))
}
else if (command === 'schemas') {
  compareSchemas(targets[0]!, targets[1]!)
}
else {
  throw new Error('Expected one of the commands `bench`, `compare` or `schemas`.')
}

function bench(directories: string[], compilers: string[], runs: number): void {
  const rows = []
  for (const directory of directories) {
    for (const compiler of compilers) {
      // The first run only warms the file system cache.
      const samples = Array.from({ length: runs + 1 }, () => measure(directory, compiler)).slice(1)
      const row = {
        project: path.basename(directory),
        compiler: execFileSync(compiler, ['--version'], { encoding: 'utf8' }).trim(),
        checkMs: median(samples.map(sample => sample.checkMs)),
        checkRangeMs: `${Math.min(...samples.map(sample => sample.checkMs))}–${Math.max(...samples.map(sample => sample.checkMs))}`,
        instantiations: median(samples.map(sample => sample.instantiations)),
        types: median(samples.map(sample => sample.types)),
        memoryMB: median(samples.map(sample => sample.memoryMB)),
      }
      rows.push(row)
      console.log(JSON.stringify(row))
    }
  }
  console.table(rows)
}

function measure(directory: string, compiler: string): Measurement {
  let output: string
  try {
    output = execFileSync(compiler, [
      '-p',
      values.config!,
      '--noEmit',
      '--extendedDiagnostics',
    ], { cwd: directory, encoding: 'utf8', maxBuffer: 1 << 26 })
  }
  catch (error) {
    output = (error as { stdout: string }).stdout
    if (!output.includes('Check time'))
      throw error
    console.error(`${directory} reports type errors under ${compiler}.`)
  }

  const read = (pattern: RegExp) => Number.parseFloat(output.match(pattern)?.[1] ?? 'NaN')
  return {
    checkMs: Math.round(read(/Check time:\s+([\d.]+)s/) * 1000),
    instantiations: read(/Instantiations:\s+(\d+)/),
    types: read(/Types:\s+(\d+)/),
    memoryMB: Math.round(read(/Memory used:\s+(\d+)K/) / 1024),
  }
}

function median(numbers: number[]): number {
  const sorted = numbers.toSorted((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]!
}

function compare(baseDirectory: string, directories: string[]): void {
  const base = printConsumerTypes(baseDirectory)
  console.log(`${path.basename(baseDirectory)}: ${base.diagnostics.length} diagnostics, ${Object.keys(base.types).length} exports`)

  for (const directory of directories) {
    const result = printConsumerTypes(directory)
    const differing = Object.keys(base.types).filter(name => normalizeUnionOrder(base.types[name]!) !== normalizeUnionOrder(result.types[name] ?? ''))
    console.log(`${path.basename(directory)}: ${result.diagnostics.length} diagnostics, ${differing.length} of ${Object.keys(base.types).length} exports differ`)
    for (const diagnostic of result.diagnostics.slice(0, 5))
      console.log(`  ${diagnostic}`)
    for (const name of differing.slice(0, 10))
      console.log(`  ${name}\n    base:    ${base.types[name]!.slice(0, 300)}\n    variant: ${result.types[name]?.slice(0, 300)}`)
  }
}

function printConsumerTypes(directory: string): { diagnostics: string[], types: Record<string, string> } {
  const program = createProgram(path.resolve(directory, values.config!))
  const checker = program.getTypeChecker()
  const flags = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias
  const types: Record<string, string> = {}

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile || sourceFile.fileName.includes('/node_modules/'))
      continue

    const prefix = path.basename(sourceFile.fileName, '.ts')
    for (const statement of sourceFile.statements) {
      if (ts.isTypeAliasDeclaration(statement)) {
        types[`${prefix}:${statement.name.text}`] = checker.typeToString(checker.getTypeAtLocation(statement.name), undefined, flags)
        continue
      }

      const node = ts.isFunctionDeclaration(statement)
        ? statement
        : ts.isVariableStatement(statement)
          ? statement.declarationList.declarations[0]?.initializer
          : undefined
      const name = ts.isFunctionDeclaration(statement)
        ? statement.name?.text
        : ts.isVariableStatement(statement)
          ? statement.declarationList.declarations[0]?.name.getText()
          : undefined
      const signature = node && checker.getSignaturesOfType(checker.getTypeAtLocation(node), ts.SignatureKind.Call)[0]
      if (name && signature)
        types[`${prefix}:${name}`] = checker.typeToString(checker.getReturnTypeOfSignature(signature), undefined, flags)
    }
  }

  const diagnostics = ts.getPreEmitDiagnostics(program).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ').slice(0, 200))
  return { diagnostics, types }
}

function normalizeUnionOrder(printedType: string): string {
  return (printedType.match(/[\w"'$.-]+|[^\s\w]/g) ?? []).sort().join(' ')
}

function createProgram(configPath: string): ts.Program {
  const config = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '))
    },
  })!
  return ts.createProgram({ rootNames: config.fileNames, options: config.options })
}

function compareSchemas(oldFile: string, newFile: string): void {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apiful-schema-types-'))
  fs.copyFileSync(oldFile, path.join(workDir, 'old.d.ts'))
  fs.copyFileSync(newFile, path.join(workDir, 'new.d.ts'))
  fs.writeFileSync(path.join(workDir, 'check.ts'), `import type * as Old from './old'\nimport type * as New from './new'\nexport type All = [Old.paths, New.paths, Old.components, New.components]\n`)

  const program = ts.createProgram([
    path.join(workDir, 'check.ts'),
  ], {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    noUncheckedIndexedAccess: true,
    lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'],
    types: [],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  })
  const checker = program.getTypeChecker()
  const exportsOf = (fileName: string) => {
    const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(path.join(workDir, fileName))!)!
    return Object.fromEntries(checker.getExportsOfModule(moduleSymbol).map(symbol => [
      symbol.name,
      checker.getDeclaredTypeOfSymbol(symbol),
    ]))
  }
  const oldExports = exportsOf('old.d.ts')
  const newExports = exportsOf('new.d.ts')

  const print = (type: ts.Type) => checker.typeToString(type, undefined, ts.TypeFormatFlags.InTypeAlias)
  const members = (type: ts.Type | undefined) => type
    ? checker.getPropertiesOfType(checker.getNonNullableType(type))
    : []
  const member = (type: ts.Type | undefined, name: string) => {
    const symbol = type && checker.getPropertyOfType(checker.getNonNullableType(type), name)
    return symbol && checker.getTypeOfSymbol(symbol)
  }
  const isOptional = (type: ts.Type, name: string) => !!((checker.getPropertyOfType(checker.getNonNullableType(type), name)?.flags ?? 0) & ts.SymbolFlags.Optional)
  const isObject = (type: ts.Type) => !!(checker.getNonNullableType(type).flags & ts.TypeFlags.Object) && !checker.getNonNullableType(type).isUnion()
  const isEqual = (a: ts.Type, b: ts.Type) => checker.isTypeAssignableTo(a, b) && checker.isTypeAssignableTo(b, a)
  // openapi-typescript adds path-level `parameters` and types every verb a path leaves out as `never`.
  const operations = (pathItem: ts.Type) => members(pathItem).filter(symbol => symbol.name !== 'parameters' && !(checker.getNonNullableType(checker.getTypeOfSymbol(symbol)).flags & ts.TypeFlags.Never))

  const mismatches: Mismatch[] = []
  const counts = {
    operations: 0,
    equalOperations: 0,
    components: 0,
    equalComponents: 0,
  }

  // Records the deepest members that differ, along with any change in optionality.
  const drill = (where: string, a: ts.Type, b: ts.Type, depth = 0): void => {
    if (isEqual(a, b))
      return
    const names = new Set([
      ...members(a),
      ...members(b),
    ].map(symbol => symbol.name))
    if (depth < 6 && isObject(a) && isObject(b) && names.size > 0) {
      const before = mismatches.length
      for (const name of names) {
        const memberA = member(a, name)
        const memberB = member(b, name)
        if (!memberA || !memberB) {
          mismatches.push({
            where: `${where}.${name}`,
            kind: memberA ? 'only in old' : 'only in new',
          })
          continue
        }
        if (isOptional(a, name) !== isOptional(b, name))
          mismatches.push({ where: `${where}.${name}`, kind: `optional ${isOptional(a, name)} → ${isOptional(b, name)}` })
        if (!isEqual(checker.getNonNullableType(memberA), checker.getNonNullableType(memberB)))
          drill(`${where}.${name}`, memberA, memberB, depth + 1)
      }
      if (mismatches.length > before)
        return
    }
    mismatches.push({
      where,
      kind: 'type',
      old: print(a),
      new: print(b),
    })
  }

  for (const pathSymbol of members(oldExports.paths)) {
    const oldPathItem = member(oldExports.paths, pathSymbol.name)!
    const newPathItem = member(newExports.paths, pathSymbol.name)
    if (!newPathItem) {
      mismatches.push({ where: pathSymbol.name, kind: 'path only in old' })
      continue
    }
    for (const methodSymbol of operations(oldPathItem)) {
      counts.operations++
      const oldOperation = member(oldPathItem, methodSymbol.name)!
      const newOperation = member(newPathItem, methodSymbol.name)
      if (!newOperation)
        mismatches.push({ where: `${pathSymbol.name} ${methodSymbol.name}`, kind: 'method only in old' })
      else if (isEqual(oldOperation, newOperation))
        counts.equalOperations++
      else
        drill(`${pathSymbol.name} ${methodSymbol.name}`, oldOperation, newOperation)
    }
    for (const methodSymbol of operations(newPathItem)) {
      if (!member(oldPathItem, methodSymbol.name))
        mismatches.push({ where: `${pathSymbol.name} ${methodSymbol.name}`, kind: 'method only in new' })
    }
  }
  for (const pathSymbol of members(newExports.paths)) {
    if (!member(oldExports.paths, pathSymbol.name))
      mismatches.push({ where: pathSymbol.name, kind: 'path only in new' })
  }

  for (const componentType of members(oldExports.components)) {
    const oldGroup = member(oldExports.components, componentType.name)
    const newGroup = member(newExports.components, componentType.name)
    for (const componentSymbol of members(oldGroup)) {
      counts.components++
      const where = `components.${componentType.name}.${componentSymbol.name}`
      const oldComponent = member(oldGroup, componentSymbol.name)!
      const newComponent = member(newGroup, componentSymbol.name)
      if (!newComponent)
        mismatches.push({ where, kind: 'only in old' })
      else if (isEqual(oldComponent, newComponent))
        counts.equalComponents++
      else
        drill(where, oldComponent, newComponent)
    }
  }

  fs.rmSync(workDir, { recursive: true, force: true })
  console.log(`operations ${counts.equalOperations}/${counts.operations} equal, components ${counts.equalComponents}/${counts.components} equal, ${mismatches.length} mismatches`)
  for (const mismatch of mismatches)
    console.log(JSON.stringify(mismatch))
}
