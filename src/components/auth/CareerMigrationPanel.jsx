import { useMemo, useState } from 'react'
import { ApiProblemError } from '../../lib/authApi.js'
import { careerImportApi } from '../../lib/careerImportApi.js'
import {
  listCareerImportCandidates,
  markCareerImported,
  prepareCareerImportPayload,
} from '../../lib/careerMigration.js'

function gameLabel(gameId) {
  return gameId === 'ets2' ? 'Euro Truck Simulator 2' : 'American Truck Simulator'
}

function money(value, currency) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(number)
  } catch {
    return `${number.toFixed(2)} ${currency || ''}`.trim()
  }
}

function migrationError(error, phase) {
  if (error instanceof ApiProblemError) {
    if (error.code === 'CAREER_IMPORT_ALREADY_EXISTS') {
      return 'O servidor informa que esta carreira local já foi importada anteriormente. O backup local foi mantido; a recuperação do vínculo será tratada na etapa de recuperação da P4.'
    }
    if (error.code === 'CAREER_IMPORT_IDEMPOTENCY_CONFLICT') {
      return 'A operação local já foi usada com outro snapshot. Nenhum dado local foi apagado.'
    }
    if (error.code === 'API_UNAVAILABLE') {
      return 'A API está indisponível agora. O snapshot local continua intacto e você pode tentar novamente.'
    }
    if (error.message) return error.message
  }
  return phase === 'validate'
    ? 'Não foi possível validar esta carreira agora. O snapshot local não foi alterado.'
    : 'Não foi possível importar esta carreira agora. O snapshot local não foi alterado.'
}

function SummaryGrid({ summary, currency }) {
  return (
    <div className="career-migration-summary" aria-label="Resumo da carreira local">
      <div><span>Motorista</span><strong>{summary.driverName}</strong></div>
      <div><span>Base</span><strong>{summary.baseCity}</strong></div>
      <div><span>Empresa</span><strong>{summary.companyName}</strong></div>
      <div><span>Nível</span><strong>N{summary.currentLevel}</strong></div>
      <div><span>Saldo</span><strong>{money(summary.balance, currency)}</strong></div>
      <div><span>Semana operacional</span><strong>{summary.currentOperationalWeek}</strong></div>
      {summary.currentPayrollMonth != null && <div><span>Mês operacional</span><strong>{summary.currentPayrollMonth}</strong></div>}
      <div><span>Viagens</span><strong>{summary.trips}</strong></div>
      <div><span>Períodos fechados</span><strong>{summary.closedPeriods}</strong></div>
      <div><span>Ocorrências</span><strong>{summary.incidents}</strong></div>
    </div>
  )
}

export default function CareerMigrationPanel({ userId }) {
  const [revision, setRevision] = useState(0)
  const [validationByKey, setValidationByKey] = useState({})
  const [busyKey, setBusyKey] = useState(null)
  const candidates = useMemo(() => listCareerImportCandidates(userId), [userId, revision])
  const pending = candidates.filter((candidate) => !candidate.imported)
  const imported = candidates.filter((candidate) => candidate.imported)

  async function validate(candidate) {
    setBusyKey(candidate.key)
    setValidationByKey((current) => ({
      ...current,
      [candidate.key]: { status: 'loading', response: null, payload: null, error: null },
    }))
    try {
      const payload = prepareCareerImportPayload(userId, candidate)
      const response = await careerImportApi.validate(payload)
      setValidationByKey((current) => ({
        ...current,
        [candidate.key]: { status: 'valid', response, payload, error: null },
      }))
    } catch (error) {
      setValidationByKey((current) => ({
        ...current,
        [candidate.key]: { status: 'error', response: null, payload: null, error: migrationError(error, 'validate') },
      }))
    } finally {
      setBusyKey(null)
    }
  }

  async function importCareer(candidate) {
    const validation = validationByKey[candidate.key]
    if (validation?.status !== 'valid' || !validation.payload) return

    setBusyKey(candidate.key)
    try {
      const response = await careerImportApi.importCareer(validation.payload)
      markCareerImported(userId, candidate, response)
      setValidationByKey((current) => ({
        ...current,
        [candidate.key]: {
          ...current[candidate.key],
          status: 'imported',
          response,
          error: null,
        },
      }))
      setRevision((current) => current + 1)
    } catch (error) {
      setValidationByKey((current) => ({
        ...current,
        [candidate.key]: {
          ...current[candidate.key],
          status: 'error',
          error: migrationError(error, 'import'),
        },
      }))
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <section className="panel account-panel account-migration-panel">
      <span className="eyebrow">Migração segura</span>
      <h2>Levar carreiras deste navegador para sua conta</h2>
      <p>
        Detectamos as carreiras salvas neste navegador. Primeiro você confere o resumo local; a validação no servidor não grava a carreira.
        A importação só acontece depois de uma segunda confirmação e o backup no <code>localStorage</code> não é apagado.
      </p>

      {candidates.length === 0 && (
        <div className="career-migration-empty" role="status">
          Nenhuma carreira local ATS ou ETS2 foi encontrada neste navegador.
        </div>
      )}

      {pending.length > 0 && (
        <div className="career-migration-list">
          {pending.map((candidate) => {
            const validation = validationByKey[candidate.key]
            const busy = busyKey === candidate.key
            return (
              <article className="career-migration-card" key={candidate.key}>
                <div className="career-migration-card-heading">
                  <div>
                    <span className="career-migration-game">{gameLabel(candidate.gameId)}</span>
                    <h3>{candidate.summary.driverName}</h3>
                  </div>
                  <span className="career-migration-status pending">Pendente</span>
                </div>

                <SummaryGrid summary={candidate.summary} currency={candidate.career.currency} />

                <div className="career-migration-safety-note">
                  Este resumo vem somente do navegador. Nenhum dado foi enviado ao backend até você clicar em “Validar no servidor”.
                </div>

                {validation?.status === 'valid' && (
                  <div className="auth-feedback auth-feedback-success career-migration-feedback" role="status">
                    <span className="auth-feedback-icon">✓</span>
                    <div>
                      <strong>Validado pelo servidor</strong>
                      <p>
                        O snapshot v12 foi aceito e ainda não foi persistido. Confirme abaixo para criar a carreira server-side preservando o histórico.
                      </p>
                    </div>
                  </div>
                )}

                {validation?.status === 'error' && (
                  <div className="auth-feedback auth-feedback-error career-migration-feedback" role="alert">
                    <span className="auth-feedback-icon">!</span>
                    <div><strong>Migração não concluída</strong><p>{validation.error}</p></div>
                  </div>
                )}

                <div className="career-migration-actions">
                  {validation?.status === 'valid' ? (
                    <>
                      <button
                        className="button primary career-migration-import"
                        type="button"
                        disabled={busy}
                        onClick={() => importCareer(candidate)}
                      >
                        {busy ? 'Importando…' : 'Confirmar e importar carreira'}
                      </button>
                      <button
                        className="button secondary career-migration-revalidate"
                        type="button"
                        disabled={busy}
                        onClick={() => validate(candidate)}
                      >
                        Validar novamente
                      </button>
                    </>
                  ) : (
                    <button
                      className="button primary career-migration-validate"
                      type="button"
                      disabled={busy}
                      onClick={() => validate(candidate)}
                    >
                      {busy ? 'Validando…' : 'Validar no servidor'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {imported.length > 0 && (
        <div className="career-migration-imported-list">
          <h3>Já associadas a esta conta</h3>
          {imported.map((candidate) => (
            <div className="career-migration-imported" key={candidate.key}>
              <div>
                <strong>{candidate.summary.driverName} · {gameLabel(candidate.gameId)}</strong>
                <span>{candidate.summary.baseCity} · {candidate.summary.companyName}</span>
              </div>
              <div className="career-migration-imported-meta">
                <span className="career-migration-status imported">Importada</span>
                <small>Backup local preservado</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
