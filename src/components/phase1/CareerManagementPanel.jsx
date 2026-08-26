import { useEffect, useMemo, useState } from 'react'
import { formatMoney, getGame } from '../../config/games.js'
import { WEEKDAY_OPTIONS, weekdayLabel } from '../../lib/tripWeek.js'
import CityAutocomplete from '../CityAutocomplete.jsx'
import { useConfirm } from '../ConfirmProvider.jsx'
import { useGame } from '../GameContext.jsx'
import { useToast } from '../ToastProvider.jsx'

function marketFactorText(factor) {
  const percentage = Math.round((Number(factor || 1) - 1) * 100)
  if (!percentage) return 'referência da sede'
  return `${Math.abs(percentage)}% ${percentage > 0 ? 'acima' : 'abaixo'} da referência da sede`
}

function WeekdaySelect({ id, value, onChange }) {
  return (
    <select id={id} value={value} onChange={onChange} required>
      <option value="">Selecione</option>
      {WEEKDAY_OPTIONS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
    </select>
  )
}

export default function CareerManagementPanel({ career, onUpdateProfile, onChangeEmployer, onChangeBase }) {
  const game = useGame()
  const confirm = useConfirm()
  const toast = useToast()
  const currentLocationCode = game.id === 'ets2' ? career.countryCode : career.stateCode
  const [mode, setMode] = useState('profile')
  const [driverName, setDriverName] = useState(career.driverName || '')
  const [bio, setBio] = useState(career.bio || career.biography || '')
  const [company, setCompany] = useState('')
  const [companyEffectiveDay, setCompanyEffectiveDay] = useState('')
  const [baseLocationCode, setBaseLocationCode] = useState(currentLocationCode || '')
  const [baseCity, setBaseCity] = useState(career.city || '')
  const [baseEffectiveDay, setBaseEffectiveDay] = useState('')

  useEffect(() => {
    setDriverName(career.driverName || '')
    setBio(career.bio || career.biography || '')
    setBaseLocationCode(game.id === 'ets2' ? career.countryCode : career.stateCode)
    setBaseCity(career.city || '')
  }, [career, game.id])

  const baseGame = useMemo(
    () => baseLocationCode
      ? getGame(game.id, baseLocationCode, career.currency, null, null, baseCity)
      : game,
    [baseCity, baseLocationCode, career.currency, game],
  )

  function submitProfile(event) {
    event.preventDefault()
    const nextName = driverName.trim()
    const nextBio = bio.trim()
    if (nextName.length < 2) {
      toast.error('Informe um nome de motorista com pelo menos 2 caracteres.')
      return
    }
    if (nextName === career.driverName && nextBio === (career.bio || career.biography || '')) {
      toast.info('Nenhuma alteração de perfil para salvar.')
      return
    }
    onUpdateProfile({ driverName: nextName, bio: nextBio, effectiveDate: '' })
  }

  async function submitEmployer(event) {
    event.preventDefault()
    const nextCompany = company.trim()
    if (nextCompany.length < 2) {
      toast.error('Informe o nome da nova empresa.')
      return
    }
    if (nextCompany === career.company) {
      toast.info('A empresa informada já é a empregadora atual.')
      return
    }
    if (!companyEffectiveDay) {
      toast.error('Informe o dia da semana em que a troca de empresa passa a valer.')
      return
    }
    const effectiveDayLabel = weekdayLabel(companyEffectiveDay)
    const confirmed = await confirm({
      title: 'Confirmar troca de empresa?',
      message: `A partir de ${effectiveDayLabel}, a empregadora atual será “${nextCompany}”. “${career.company || 'Não informada'}” continuará preservada nas viagens e nos holerites anteriores.`,
      confirmLabel: 'Trocar empresa',
      tone: 'warning',
    })
    if (!confirmed) return
    onChangeEmployer({ company: nextCompany, effectiveDate: companyEffectiveDay })
    setCompany('')
    setCompanyEffectiveDay('')
  }

  async function submitBase(event) {
    event.preventDefault()
    const nextCity = baseCity.trim()
    if (!baseLocationCode || !nextCity) {
      toast.error(`Escolha o ${game.id === 'ets2' ? 'país' : 'estado'}-sede e informe a nova cidade-base.`)
      return
    }
    const expectedSuffix = game.id === 'ets2' ? `, ${baseGame.countryName}` : `, ${baseGame.stateCode}`
    if (!nextCity.endsWith(expectedSuffix)) {
      toast.error(`A cidade-base precisa pertencer ${game.id === 'ets2' ? `ao país ${baseGame.countryName}` : `ao estado ${baseGame.stateName}`}. Para cidades de mod, use o formato “Cidade${expectedSuffix}”.`)
      return
    }
    if (baseLocationCode === currentLocationCode && nextCity === career.city) {
      toast.info('A sede e a cidade informadas já formam a base atual.')
      return
    }
    if (!baseEffectiveDay) {
      toast.error('Informe o dia da semana em que a mudança de base passa a valer.')
      return
    }
    const effectiveDayLabel = weekdayLabel(baseEffectiveDay)
    const confirmed = await confirm({
      title: 'Confirmar mudança de base?',
      message: `A base mudará de “${career.city}” para “${nextCity}” a partir de ${effectiveDayLabel}. Impostos, salários e despesas padrão novos valerão para os próximos cálculos; períodos já fechados manterão seus snapshots.`,
      confirmLabel: 'Mudar base',
      tone: 'warning',
    })
    if (!confirmed) return
    onChangeBase({ locationCode: baseLocationCode, city: nextCity, effectiveDate: baseEffectiveDay, profile: baseGame })
    setBaseEffectiveDay('')
  }

  return (
    <section className="panel career-management-panel" data-tour="career-management">
      <div className="section-heading compact-heading">
        <span className="eyebrow">Perfil e vínculos</span>
        <h2>Gerenciar carreira</h2>
        <p>Correções e mudanças ficam registradas sem alterar viagens ou holerites anteriores.</p>
      </div>
      <div className="career-management-tabs" role="tablist" aria-label="Alterações da carreira">
        <button className={mode === 'profile' ? 'active' : ''} type="button" role="tab" aria-selected={mode === 'profile'} aria-controls="career-profile-editor" onClick={() => setMode('profile')}>Perfil</button>
        <button className={mode === 'employer' ? 'active' : ''} type="button" role="tab" aria-selected={mode === 'employer'} aria-controls="career-employer-editor" onClick={() => setMode('employer')}>Empresa</button>
        <button className={mode === 'base' ? 'active' : ''} type="button" role="tab" aria-selected={mode === 'base'} aria-controls="career-base-editor" onClick={() => setMode('base')}>Base</button>
      </div>

      {mode === 'profile' && <form className="career-change-form" id="career-profile-editor" role="tabpanel" onSubmit={submitProfile}>
        <label htmlFor="career-edit-driver">Nome do motorista</label>
        <input id="career-edit-driver" value={driverName} maxLength="100" onChange={(event) => setDriverName(event.target.value)} required />
        <label htmlFor="career-edit-bio">Biografia</label>
        <textarea id="career-edit-bio" value={bio} maxLength="800" onChange={(event) => setBio(event.target.value)} placeholder="Deixe vazio para remover a biografia." />
        <button className="button primary compact" type="submit">Salvar perfil</button>
      </form>}

      {mode === 'employer' && <form className="career-change-form" id="career-employer-editor" role="tabpanel" onSubmit={submitEmployer}>
        <div className="career-current-value"><span>Empresa atual</span><strong>{career.company || '—'}</strong></div>
        <label htmlFor="career-new-company">Nova empresa</label>
        <input id="career-new-company" value={company} maxLength="140" onChange={(event) => setCompany(event.target.value)} placeholder={`Ex.: ${game.companyPlaceholder}`} required />
        <label htmlFor="career-company-day">Dia da semana efetivo</label>
        <WeekdaySelect id="career-company-day" value={companyEffectiveDay} onChange={(event) => setCompanyEffectiveDay(event.target.value)} />
        <small>Registros existentes recebem um snapshot da empregadora anterior; somente os próximos usarão a nova empresa.</small>
        <button className="button primary compact" type="submit">Trocar empresa</button>
      </form>}

      {mode === 'base' && <form className="career-change-form" id="career-base-editor" role="tabpanel" onSubmit={submitBase}>
        <div className="two-columns">
          <div>
            <label htmlFor="career-new-location">{game.id === 'ets2' ? 'Novo país-sede' : 'Novo estado-sede'}</label>
            <select id="career-new-location" value={baseLocationCode} onChange={(event) => { setBaseLocationCode(event.target.value); setBaseCity('') }} required>
              <option value="">Selecione</option>
              {(game.id === 'ets2' ? game.countryOptions : game.stateOptions).map((location) => <option value={location.code} key={location.code}>{game.id === 'ets2' ? `${location.flag} ` : ''}{location.name}</option>)}
            </select>
          </div>
          <CityAutocomplete value={baseCity} onChange={setBaseCity} label="Nova cidade-base" required cities={baseGame.baseCities || []} disabled={!baseLocationCode} placeholder={baseGame.cityPlaceholder} />
        </div>
        <label htmlFor="career-base-day">Dia da semana efetivo</label>
        <WeekdaySelect id="career-base-day" value={baseEffectiveDay} onChange={(event) => setBaseEffectiveDay(event.target.value)} />
        {baseLocationCode && <div className="career-base-preview">
          <strong>{baseGame.cityMarketLabel}</strong>
          <span>Custos: {marketFactorText(baseGame.cityCostFactor)} • salários: {marketFactorText(baseGame.citySalaryFactor)}</span>
          <span>Moeda fiscal {baseGame.baseCurrency}; carreira permanece em {baseGame.currency}{baseGame.currency !== baseGame.baseCurrency ? ` (1 ${baseGame.baseCurrency} = ${formatMoney(baseGame.exchangeRate, baseGame)})` : ''}.</span>
        </div>}
        <small>Despesas padrão abertas passam ao perfil novo. Saldo, histórico financeiro, viagens e holerites fechados não são recalculados.</small>
        <button className="button primary compact" type="submit">Mudar base</button>
      </form>}
    </section>
  )
}
