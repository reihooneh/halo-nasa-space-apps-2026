import { describe, expect, it } from 'vitest'
import { parseCommand, wordsToNumbers } from './parse'

describe('voice command grammar', () => {
  it('spoken numbers', () => {
    expect(wordsToNumbers('log heart rate sixty two')).toBe('log heart rate 62')
    expect(wordsToNumbers('one hundred twenty two')).toBe('122')
    expect(wordsToNumbers('sleep six point five hours')).toBe('sleep 6.5 hours')
  })
  it('logging', () => {
    expect(parseCommand('Log heart rate 62')).toEqual({ type: 'log', id: 'hr', value: 62 })
    expect(parseCommand('log blood pressure one hundred eighteen over seventy six')).toEqual({ type: 'log', id: 'sbp', value: 118, value2: 76 })
    expect(parseCommand('record temperature 38.2')).toEqual({ type: 'log', id: 'temp', value: 38.2 })
    expect(parseCommand('log something')).toBeNull()
  })
  it('navigation and control', () => {
    expect(parseCommand('open radiation')).toEqual({ type: 'go', view: 'radiation' })
    expect(parseCommand('show me the sol planner')).toEqual({ type: 'go', view: 'sol' })
    expect(parseCommand('go to day 90')).toEqual({ type: 'day', day: 90 })
    expect(parseCommand('shelter')).toEqual({ type: 'storm' })
    expect(parseCommand('play story')).toEqual({ type: 'play' })
    expect(parseCommand('pause')).toEqual({ type: 'pause' })
    expect(parseCommand('banana')).toBeNull()
  })
})
