import { describe, expect, it } from 'vitest'
import { createDefu, defu } from './utils'

// Part of tests brought from jonschlinkert/defaults-deep (MIT)
const nonObject = [null, undefined, [], false, true, 123]

describe('defu', () => {
  it('should copy only missing properties defaults', () => {
    const result = defu({ a: 'c' }, { a: 'bbb', d: 'c' })
    expect(result).toEqual({ a: 'c', d: 'c' })
  })

  it('should fill in values that are null', () => {
    const result1 = defu({ a: null as null }, { a: 'c', d: 'c' })
    expect(result1).toEqual({ a: 'c', d: 'c' })

    const result2 = defu({ a: 'c' }, { a: null as null, d: 'c' })
    expect(result2).toEqual({ a: 'c', d: 'c' })
  })

  it('should copy nested values', () => {
    const result = defu({ a: { b: 'c' } }, { a: { d: 'e' } })
    expect(result).toEqual({
      a: { b: 'c', d: 'e' },
    })
  })

  it('should concat array values by default', () => {
    const result = defu({ array: ['a', 'b'] }, { array: ['c', 'd'] })
    expect(result).toEqual({
      array: ['a', 'b', 'c', 'd'],
    })
  })

  it('should correctly type differing array values', () => {
    const item1 = { name: 'Name', age: 21 }
    const item2 = { name: 'Name', age: '42' }
    const result = defu({ items: [item1] }, { items: [item2] })
    expect(result).toEqual({ items: [item1, item2] })
  })

  it('should avoid merging objects with custom constructor', () => {
    class Test {
      value: string
      constructor(value: string) {
        this.value = value
      }
    }
    const result = defu({ test: new Test('a') }, { test: new Test('b') })
    expect(result).toEqual({ test: new Test('a') })
  })

  it('should assign date properly', () => {
    const date1 = new Date('2020-01-01')
    const date2 = new Date('2020-01-02')
    const result = defu({ date: date1 }, { date: date2 })
    expect(result).toEqual({ date: date1 })
  })

  it('should correctly merge different object types', () => {
    const fn = () => 42
    const re = /test/i

    const result = defu({ a: fn }, { a: re })
    expect(result).toEqual({ a: fn })
  })

  it('should handle non object first param', () => {
    for (const val of nonObject) {
      expect(defu(val as any, { d: true })).toEqual({ d: true })
    }
  })

  it('should handle non object second param', () => {
    for (const val of nonObject) {
      expect(defu({ d: true }, val as any)).toEqual({ d: true })
    }
  })

  it('multi defaults', () => {
    const result = defu({ a: 1 }, { b: 2, a: 'x' }, { c: 3, a: 'x', b: 'x' })
    expect(result).toEqual({
      a: 1,
      b: 2,
      c: 3,
    })
  })

  it('should not override Object prototype', () => {
    const payload = JSON.parse(
      '{"constructor": {"prototype": {"isAdmin": true}}}',
    )
    defu({}, payload)
    defu(payload, {})
    defu(payload, payload)
    // @ts-expect-error: Property does not exist
    expect({}.isAdmin).toBe(undefined)
  })

  it('should ignore non-object arguments', () => {
    expect(defu(null as any, { foo: 1 }, false as any, 123 as any, { bar: 2 })).toEqual({
      foo: 1,
      bar: 2,
    })
  })

  it('custom merger', () => {
    const ext = createDefu((obj, key, val) => {
      if (typeof val === 'number') {
        (obj as any)[key] += val
        return true
      }
    })
    expect(ext({ cost: 15 }, { cost: 10 })).toEqual({ cost: 25 })
  })

  it('custom merger with namespace', () => {
    const ext = createDefu((obj, key, val, namespace) => {
      if (key === 'modules') {
        obj[key] = `${namespace}:${[...val, ...obj[key]].sort().join(',')}`
        return true
      }
    })

    const obj1 = { modules: ['A'], foo: { bar: { modules: ['X'] } } }
    const obj2 = { modules: ['B'], foo: { bar: { modules: ['Y'] } } }
    expect(ext(obj1, obj2)).toEqual({
      modules: ':A,B',
      foo: { bar: { modules: 'foo.bar:X,Y' } },
    })
  })
})
