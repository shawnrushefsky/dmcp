import { describe, it, expect } from 'vitest'
import { safeJsonParse, safeJsonParseOrNull } from '../json.js'

describe('safeJsonParse', () => {
  it('should parse valid JSON', () => {
    const result = safeJsonParse('{"name": "test"}', {})
    expect(result).toEqual({ name: 'test' })
  })

  it('should return fallback for invalid JSON', () => {
    const fallback = { default: true }
    const result = safeJsonParse('not valid json', fallback)
    expect(result).toEqual(fallback)
  })

  it('should return fallback for empty string', () => {
    const fallback: string[] = []
    const result = safeJsonParse('', fallback)
    expect(result).toEqual(fallback)
  })

  it('should parse arrays', () => {
    const result = safeJsonParse<string[]>('["a", "b", "c"]', [])
    expect(result).toEqual(['a', 'b', 'c'])
  })

  it('should parse primitive values', () => {
    expect(safeJsonParse('42', 0)).toBe(42)
    expect(safeJsonParse('"hello"', '')).toBe('hello')
    expect(safeJsonParse('true', false)).toBe(true)
    expect(safeJsonParse('null', 'fallback')).toBe(null)
  })

  it('should return fallback for undefined JSON text', () => {
    const result = safeJsonParse(undefined as unknown as string, { fallback: true })
    expect(result).toEqual({ fallback: true })
  })
})

describe('safeJsonParseOrNull', () => {
  it('should parse valid JSON', () => {
    const result = safeJsonParseOrNull('{"name": "test"}')
    expect(result).toEqual({ name: 'test' })
  })

  it('should return null for invalid JSON', () => {
    const result = safeJsonParseOrNull('not valid json')
    expect(result).toBeNull()
  })

  it('should return null for empty string', () => {
    const result = safeJsonParseOrNull('')
    expect(result).toBeNull()
  })

  it('should parse arrays', () => {
    const result = safeJsonParseOrNull<number[]>('[1, 2, 3]')
    expect(result).toEqual([1, 2, 3])
  })

  it('should return null for malformed JSON', () => {
    expect(safeJsonParseOrNull('{name: "test"}')).toBeNull()
    expect(safeJsonParseOrNull('{"name": test}')).toBeNull()
    expect(safeJsonParseOrNull('{incomplete')).toBeNull()
  })
})
