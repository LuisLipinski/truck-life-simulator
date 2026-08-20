// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { importCareerCSVText } from './csv.js'
import { CAREERS_KEY } from './storage.js'

function validV7(overrides = {}) {
  const career = overrides.career ?? 'CAREER,,Test Driver,Los Angeles CA,Pacific Horizon Logistics,5000,793,,2026-08-20T00:00:00.000Z'
  const state = overrides.state ?? 'STATE,793,1,1,0,0,0,0'
  return [
    'ATS_CAREER_BACKUP,7',
    'CAREER,id,driverName,city,company,arrivalBalance,initialBalance,bio,createdAt',
    career,
    'STATE,balance,careerLevel,currentWeek,academyLevel2,academyLevel3,hazmatQualified,emergencyReserve',
    state,
  ].join('\n')
}

describe('CSV import required field validation', () => {
  beforeEach(() => localStorage.clear())

  it('rejects a v7 file and lists all missing required CAREER fields', () => {
    const csv = validV7({
      career: 'CAREER,,Test Driver,,,5000,,,2026-08-20T00:00:00.000Z',
    })

    expect(() => importCareerCSVText(csv)).toThrow(/Arquivo incompleto\. Campos obrigatórios ausentes:/)
    expect(() => importCareerCSVText(csv)).toThrow(/CAREER\.city \(linha 3\)/)
    expect(() => importCareerCSVText(csv)).toThrow(/CAREER\.company \(linha 3\)/)
    expect(() => importCareerCSVText(csv)).toThrow(/CAREER\.initialBalance \(linha 3\)/)
    expect(JSON.parse(localStorage.getItem(CAREERS_KEY) || '[]')).toEqual([])
  })

  it('rejects when the STATE data row is missing', () => {
    const csv = [
      'ATS_CAREER_BACKUP,7',
      'CAREER,id,driverName,city,company,arrivalBalance,initialBalance,bio,createdAt',
      'CAREER,,Test Driver,Los Angeles CA,Pacific Horizon Logistics,5000,793,,',
    ].join('\n')

    expect(() => importCareerCSVText(csv)).toThrow(
      'Arquivo incompleto. Campos obrigatórios ausentes: linha STATE.',
    )
    expect(JSON.parse(localStorage.getItem(CAREERS_KEY) || '[]')).toEqual([])
  })

  it('requires emergencyReserve for CSV v7 but keeps older backups compatible', () => {
    expect(() => importCareerCSVText(validV7({ state: 'STATE,793,1,1,0,0,0,' }))).toThrow(
      /Arquivo incompleto\. Campos obrigatórios ausentes: STATE\.emergencyReserve \(linha 5\)\./,
    )

    const oldCsv = [
      'ATS_CAREER_BACKUP,6',
      'CAREER,id,driverName,city,company,arrivalBalance,initialBalance,bio,createdAt',
      'CAREER,,Legacy Driver,Fresno CA,Legacy Logistics,5000,793,,',
      'STATE,balance,careerLevel,currentWeek,academyLevel2,academyLevel3,hazmatQualified',
      'STATE,793,1,1,0,0,0',
    ].join('\n')
    const result = importCareerCSVText(oldCsv)
    expect(result.version).toBe(6)
    expect(result.state.emergencyReserve).toBe(0)
  })

  it('rejects invalid numeric state values with a useful message', () => {
    const csv = validV7({ state: 'STATE,abc,8,0,0,0,0,-20' })
    expect(() => importCareerCSVText(csv)).toThrow(/Arquivo inválido\. Revise estes campos:/)
    expect(() => importCareerCSVText(csv)).toThrow(/STATE\.balance \(linha 5\)/)
    expect(() => importCareerCSVText(csv)).toThrow(/STATE\.careerLevel \(linha 5\)/)
    expect(() => importCareerCSVText(csv)).toThrow(/STATE\.currentWeek \(linha 5\)/)
    expect(() => importCareerCSVText(csv)).toThrow(/STATE\.emergencyReserve \(linha 5\)/)
    expect(JSON.parse(localStorage.getItem(CAREERS_KEY) || '[]')).toEqual([])
  })

  it('imports a complete v7 file normally', () => {
    const result = importCareerCSVText(validV7())
    expect(result.version).toBe(7)
    expect(result.career.driverName).toBe('Test Driver')
    expect(result.career.city).toBe('Los Angeles CA')
    expect(result.career.company).toBe('Pacific Horizon Logistics')
    expect(result.state.balance).toBe(793)
    expect(result.state.emergencyReserve).toBe(0)
    expect(JSON.parse(localStorage.getItem(CAREERS_KEY) || '[]')).toHaveLength(1)
  })
})
