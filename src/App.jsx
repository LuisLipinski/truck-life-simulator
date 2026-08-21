import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createCareer,
  deleteCareer,
  getActiveCareerId,
  getCareer,
  loadCareers,
  setActiveCareer,
} from './lib/storage.js'
import { downloadCSVTemplate, downloadExcelTemplate, importCareerFile } from './lib/csv.js'
import { formatMoney, gameIdFromPath, getGame, getGameForCareer, GAMES } from './config/games.js'
import { convertEts2Currency, roundCurrency } from './config/ets2Currencies.js'
import Phase1Page from './components/Phase1Page.jsx'
import CityAutocomplete from './components/CityAutocomplete.jsx'
import { GameProvider, useGame } from './components/GameContext.jsx'
import { useConfirm } from './components/ConfirmProvider.jsx'
import { useTutorial } from './components/GuidedTutorial.jsx'
import { useToast } from './components/ToastProvider.jsx'

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '#/')
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  const [path, query = ''] = hash.replace(/^#/, '').split('?')
  return { path: path || '/', params: new URLSearchParams(query) }
}

function AppLink({ to, className = '', children, ...props }) {
  return <a href={`#${to}`} className={className} {...props}>{children}</a>
}

function HomePage() {
  return (
    <main className="home-shell page-shell">
      <section className="hero">
        <span className="eyebrow">Career companion</span>
        <h1>Truck Life Simulator</h1>
        <p>Escolha o jogo para acessar uma carreira com dados, economia e regras próprias.</p>
      </section>
      <section className="game-grid">
        {Object.values(GAMES).map((game) => (
          <AppLink className="game-card interactive" to={game.routes.careers} aria-label={`Abrir ${game.name}`} key={game.id}>
            <span className="tag active">Disponível</span>
            <img src={game.image} alt={game.name} />
            <h2>{game.name}</h2>
            <p>{game.description}</p>
          </AppLink>
        ))}
      </section>
      <footer>Carreiras de ATS e ETS2 ficam separadas e salvas localmente neste navegador.</footer>
    </main>
  )
}

function CareersPage() {
  const game = useGame()
  const toast = useToast()
  const confirm = useConfirm()
  const [careers, setCareers] = useState(() => loadCareers(game.id))
  const [showCsvHelp, setShowCsvHelp] = useState(false)
  const fileInput = useRef(null)

  async function removeCareer(career) {
    const confirmed = await confirm({
      title: 'Excluir carreira?',
      message: `A carreira de ${career.driverName} em ${game.shortName} será removida. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir carreira',
      tone: 'danger',
    })
    if (!confirmed) return
    deleteCareer(career.id, game.id)
    setCareers(loadCareers(game.id))
    toast.success(`A carreira de ${career.driverName} foi excluída.`)
  }

  function openCareer(career) {
    setActiveCareer(career.id, game.id)
    window.location.hash = `#${game.routes.phases}?career=${encodeURIComponent(career.id)}`
  }

  async function importBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const extension = String(file.name || '').split('.').pop().toUpperCase()
    toast.info('Lendo e validando o backup da carreira...', { title: `Importando ${extension || 'arquivo'}`, duration: 2200 })
    try {
      const result = await importCareerFile(file, game.id)
      setCareers(loadCareers(game.id))
      toast.success(`Carreira “${result.career.driverName}” importada em ${game.shortName} (${extension} • backup v${result.version}).`, { title: 'Importação concluída' })
    } catch (error) {
      toast.error(`Não foi possível importar a carreira: ${error.message}`, { title: 'Erro ao importar arquivo' })
    } finally {
      event.target.value = ''
    }
  }

  return (
    <main className="page-shell wide-shell">
      <AppLink className="back-link" to="/">← Voltar para jogos</AppLink>
      <section className="page-heading centered">
        <img className="ats-logo" src={game.image} alt={game.name} />
        <span className="eyebrow">{game.name}</span>
        <h1>Suas carreiras</h1>
        <p>Crie, importe ou continue uma carreira de {game.shortName}. Dados de outros jogos não são misturados.</p>
        <div className="game-resource-links" aria-label={`Links de ${game.shortName}`}>
          <a href={game.officialUrl} target="_blank" rel="noreferrer">Site oficial</a>
          <a href={game.storeUrl} target="_blank" rel="noreferrer">Steam</a>
          <a href={game.workshopUrl} target="_blank" rel="noreferrer">Workshop</a>
        </div>
      </section>

      <div className="action-row">
        <AppLink className="button primary" to={game.routes.new}>+ Criar nova carreira</AppLink>
        <button className="button success" type="button" onClick={() => fileInput.current?.click()}>Importar carreira</button>
        <button className="button secondary" type="button" onClick={() => setShowCsvHelp((value) => !value)}>Como importar uma carreira</button>
        <input ref={fileInput} type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={importBackup} />
      </div>

      {showCsvHelp && (
        <section className="panel csv-help">
          <span className="eyebrow">Importação de carreira — {game.shortName}</span>
          <h2>Como importar uma carreira</h2>
          <p>Backups CSV, XLS e XLSX desta área usam a identificação <code>{game.backupMarker}</code>. Assim, uma carreira de ATS nunca é importada por engano como ETS2 — ou o contrário.</p>
          <p><strong>CSV:</strong> use ponto para casas decimais e não use separador de milhar nem símbolo de moeda. Exemplos: <code>850</code>, <code>1602.63</code> e <code>0.50</code>.</p>
          <p><strong>XLS/XLSX:</strong> use células numéricas normais. A exibição regional do Excel não altera o valor lido pelo aplicativo.</p>
          <p>A importação cria uma nova carreira com outro ID e preserva perfil, país-sede, moeda, cotação registrada, custos iniciais, viagens, histórico, despesas, ocorrências, períodos fechados e reserva.</p>
          <p>Não altere os nomes da primeira coluna, como <code>CAREER</code>, <code>STATE</code>, <code>TRIP</code> e <code>CLOSED_WEEK</code>.</p>
          <div className="action-row">
            <button className="button secondary" type="button" onClick={() => downloadCSVTemplate(game.id)}>Baixar modelo CSV</button>
            <button className="button secondary" type="button" onClick={() => downloadExcelTemplate('xlsx', game.id)}>Baixar modelo XLSX</button>
            <button className="button secondary" type="button" onClick={() => downloadExcelTemplate('xls', game.id)}>Baixar modelo XLS</button>
          </div>
        </section>
      )}

      {careers.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhuma carreira de {game.shortName} criada</h2>
          <p>Crie seu primeiro motorista ou importe um backup {game.backupMarker}.</p>
          <AppLink className="button primary compact" to={game.routes.new}>Criar carreira</AppLink>
        </div>
      ) : (
        <section className="career-grid">
          {careers.map((career) => {
            const careerGame = getGameForCareer(career, game.id)
            return <article
              className="panel career-card career-card-clickable"
              key={career.id}
              role="button"
              tabIndex={0}
              aria-label={`Abrir carreira ${career.driverName}`}
              onClick={() => openCareer(career)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openCareer(career)
                }
              }}
            >
              <div className="career-card-top">
                <div><span className="eyebrow">{game.shortName} • Nível {career.currentLevel || 1}</span><h2>{career.driverName}</h2></div>
                <span className="pill">{career.city || 'Cidade não informada'}</span>
              </div>
              <div className="career-meta">
                {game.id === 'ets2' && <><span>País-sede</span><strong>{careerGame.countryFlag} {careerGame.countryName}</strong></>}
                {game.id === 'ets2' && <><span>Moeda</span><strong>{careerGame.currency}{careerGame.currency !== careerGame.baseCurrency ? ` • base ${careerGame.baseCurrency}` : ''}</strong></>}
                <span>Empresa</span><strong>{career.company || '—'}</strong>
                <span>Saldo inicial</span><strong>{formatMoney(career.initialBalance ?? career.currentBalance, careerGame)}</strong>
              </div>
              <p className="career-bio">{career.bio || career.biography || 'Sem biografia cadastrada.'}</p>
              <div className="career-card-footer">
                <span className="career-open-hint">Clique no card para continuar</span>
                <button className="career-delete-icon" type="button" aria-label={`Excluir carreira ${career.driverName}`} title="Excluir carreira" onClick={(event) => { event.stopPropagation(); removeCareer(career) }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" /></svg>
                </button>
              </div>
            </article>
          })}
        </section>
      )}
    </main>
  )
}

function NewCareerPage() {
  const game = useGame()
  const isEts2 = game.id === 'ets2'
  const toast = useToast()
  const confirm = useConfirm()
  const { startTutorial } = useTutorial()
  const [driverName, setDriverName] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [city, setCity] = useState('')
  const [company, setCompany] = useState('')
  const [arrivalBalance, setArrivalBalance] = useState(game.id === 'ats' ? 5000 : 0)
  const [bio, setBio] = useState('')
  const [costs, setCosts] = useState(() => game.id === 'ats' ? { ...game.setupCosts } : {})
  const [showTutorial, setShowTutorial] = useState(false)
  const selectedGame = useMemo(
    () => isEts2 && countryCode ? getGame('ets2', countryCode, currencyCode) : game,
    [countryCode, currencyCode, game, isEts2],
  )
  const financialProfileReady = !isEts2 || Boolean(countryCode && currencyCode)

  const totalCosts = useMemo(() => Object.values(costs).reduce((sum, value) => sum + Number(value || 0), 0), [costs])
  const remaining = Number(arrivalBalance || 0) - totalCosts

  function updateCost(key, value) {
    setCosts((current) => ({ ...current, [key]: Number(value) || 0 }))
  }

  function changeCountry(nextCountryCode) {
    setCountryCode(nextCountryCode)
    setCity('')
    if (!nextCountryCode) {
      setCurrencyCode('')
      setArrivalBalance(0)
      setCosts({})
      return
    }
    const countryGame = getGame('ets2', nextCountryCode)
    setCurrencyCode(countryGame.baseCurrency)
    setArrivalBalance(countryGame.defaultArrivalBalance)
    setCosts({ ...countryGame.setupCosts })
  }

  function changeCurrency(nextCurrencyCode) {
    if (!countryCode || !nextCurrencyCode) return
    const fromCurrency = selectedGame.currency
    setArrivalBalance(roundCurrency(convertEts2Currency(arrivalBalance, fromCurrency, nextCurrencyCode)))
    setCosts((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [
      key,
      roundCurrency(convertEts2Currency(value, fromCurrency, nextCurrencyCode)),
    ])))
    setCurrencyCode(nextCurrencyCode)
  }

  async function submit(event) {
    event.preventDefault()
    if (isEts2 && !countryCode) {
      toast.error('Escolha o país-sede financeiro antes de criar a carreira.')
      return
    }
    if (!driverName.trim() || !city.trim() || !company.trim()) {
      toast.error('Preencha nome, cidade e empresa antes de criar a carreira.')
      return
    }
    if (isEts2 && !city.trim().endsWith(`, ${selectedGame.countryName}`)) {
      toast.error(`A cidade-base precisa pertencer ao país-sede ${selectedGame.countryName}. Para cidades de mod, use o formato “Cidade, ${selectedGame.countryName}”.`)
      return
    }
    if (remaining < 0) {
      const confirmed = await confirm({
        title: 'Criar com saldo negativo?',
        message: `Os custos iniciais são maiores que o dinheiro disponível. A carreira começará com ${formatMoney(remaining, selectedGame)}.`,
        confirmLabel: 'Criar mesmo assim', tone: 'warning',
      })
      if (!confirmed) return
    }

    const career = createCareer({
      driverName: driverName.trim(), city: city.trim(), company: company.trim(), currency: selectedGame.currency,
      countryCode: isEts2 ? countryCode : undefined, countryName: isEts2 ? selectedGame.countryName : undefined,
      baseCurrency: isEts2 ? selectedGame.baseCurrency : undefined,
      exchangeRate: isEts2 ? selectedGame.exchangeRate : undefined,
      exchangeRateAsOf: isEts2 ? selectedGame.exchangeRateAsOf : undefined,
      arrivalBalance: Number(arrivalBalance) || 0, setupCosts: costs, setupCostsTotal: totalCosts,
      initialBalance: remaining, currentBalance: remaining, bio: bio.trim(),
    }, game.id)
    toast.success(`Carreira de ${career.driverName} criada em ${game.shortName}.`, { title: 'Carreira criada' })
    if (showTutorial) startTutorial(career.id, game.id)
    else window.location.hash = `#${game.routes.phases}?career=${encodeURIComponent(career.id)}`
  }

  return (
    <main className="page-shell form-shell">
      <AppLink className="back-link" to={game.routes.careers}>← Voltar para carreiras</AppLink>
      <form className="panel form-panel" onSubmit={submit}>
        <div className="section-heading">
          <span className="eyebrow">Novo personagem • {game.shortName}</span>
          <h1>Criar nova carreira</h1>
          <p>{isEts2 ? 'Escolha o país-sede das regras financeiras e, separadamente, a moeda em que deseja controlar a carreira; as viagens continuam em quilômetros por toda a Europa.' : `${game.region}, ${game.distanceName} e valores em ${game.currencyLabel}.`} Cada jogo mantém progresso separado.</p>
        </div>

        {isEts2 && (
          <div className="country-selector" data-tour="career-country">
            <label htmlFor="career-country">País-sede financeiro</label>
            <select id="career-country" value={countryCode} onChange={(event) => changeCountry(event.target.value)} required>
              <option value="">Selecione o país-sede</option>
              {game.countryOptions.map((country) => <option value={country.code} key={country.code}>{country.flag} {country.name} — {country.currency}</option>)}
            </select>
            <small>O país-sede define impostos, contribuições, salário e custos-base. O destino das viagens não altera sua folha.</small>
          </div>
        )}

        {isEts2 && (
          <div className="country-selector" data-tour="career-currency">
            <label htmlFor="career-currency">Moeda da carreira</label>
            <select id="career-currency" value={currencyCode} onChange={(event) => changeCurrency(event.target.value)} disabled={!countryCode} required>
              <option value="">Selecione primeiro o país-sede</option>
              {game.currencyOptions.map((currency) => <option value={currency.code} key={currency.code}>{currency.code} — {currency.name} ({currency.symbol})</option>)}
            </select>
            <small>{countryCode && currencyCode
              ? selectedGame.currency === selectedGame.baseCurrency
                ? `Valores já estão na moeda-base de ${selectedGame.countryName}.`
                : `Regras de ${selectedGame.countryName} são calculadas em ${selectedGame.baseCurrency} e convertidas para ${selectedGame.currency}. Cotação fixada em ${selectedGame.exchangeRateAsOf}: 1 ${selectedGame.baseCurrency} = ${formatMoney(selectedGame.exchangeRate, selectedGame)}.`
              : 'A moeda escolhida será usada em todas as telas, lançamentos e holerites da carreira.'}</small>
          </div>
        )}

        <label>Nome do motorista</label>
        <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Ex.: Rafael Silva" required />

        <div className="two-columns">
          <CityAutocomplete value={city} onChange={setCity} label="Cidade-base" required cities={isEts2 ? selectedGame.baseCities || [] : null} disabled={!financialProfileReady} placeholder={isEts2 ? selectedGame.cityPlaceholder : undefined} hint={isEts2 ? (financialProfileReady ? `${selectedGame.baseCities.length} cidades disponíveis em ${selectedGame.countryName}. Cidades de viagem continuam abrangendo todo o mapa europeu.` : 'Selecione o país-sede para liberar as cidades-base.') : ''} />
          <div><label>Nome da empresa</label><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={`Ex.: ${selectedGame.companyPlaceholder}`} required /></div>
        </div>

        <label>{selectedGame.arrivalLabel} ({selectedGame.currency})</label>
        <input type="number" min="0" step="0.01" value={arrivalBalance} disabled={!financialProfileReady} onChange={(e) => setArrivalBalance(e.target.value)} />

        {financialProfileReady && <section className="setup-panel">
          <div className="setup-heading">
            <div><h2>Custos iniciais de mudança</h2><p>Valores sugeridos para o roleplay de {game.shortName}; edite conforme a cidade escolhida.</p></div>
            <div className="inline-actions">
              <button type="button" className="button secondary compact" onClick={() => setCosts({ ...selectedGame.setupCosts })}>Restaurar</button>
              <button type="button" className="button secondary compact" onClick={() => setCosts(Object.fromEntries(Object.keys(selectedGame.setupCosts).map((key) => [key, 0])))}>Zerar</button>
            </div>
          </div>
          <div className="cost-grid">
            {Object.entries(costs).map(([key, value]) => (
              <div className="cost-field" key={key}><label>{selectedGame.setupLabels[key]}</label><input type="number" min="0" step="0.01" value={value} onChange={(e) => updateCost(key, e.target.value)} /></div>
            ))}
          </div>
          <div className="summary-grid">
            <div><span>Dinheiro disponível</span><strong>{formatMoney(arrivalBalance, selectedGame)}</strong></div>
            <div><span>Total de custos</span><strong>{formatMoney(totalCosts, selectedGame)}</strong></div>
            <div><span>Saldo inicial</span><strong className={remaining < 0 ? 'negative' : 'positive'}>{formatMoney(remaining, selectedGame)}</strong></div>
          </div>
        </section>}

        <label>Biografia do personagem</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={`Ex.: ${selectedGame.bioPlaceholder}`} />
        <label className="tutorial-opt-in">
          <input type="checkbox" checked={showTutorial} onChange={(event) => setShowTutorial(event.target.checked)} />
          <span><strong>Ver tutorial após criar a carreira</strong><small>O tour usará os textos, unidades e qualificações de {game.shortName} sem alterar seus dados.</small></span>
        </label>
        <button className="button primary submit-button" type="submit">Criar carreira e continuar</button>
      </form>
    </main>
  )
}

function PhasesPage({ careerId }) {
  const game = useGame()
  const id = careerId || getActiveCareerId(game.id)
  const career = id ? getCareer(id, game.id) : null

  useEffect(() => {
    if (career?.id) setActiveCareer(career.id, game.id)
  }, [career?.id, game.id])

  if (!career) {
    return <main className="page-shell form-shell"><AppLink className="back-link" to={game.routes.careers}>← Voltar para carreiras</AppLink><div className="empty-state"><h2>Carreira não encontrada</h2><p>Escolha uma carreira de {game.shortName} salva para continuar.</p></div></main>
  }

  return (
    <main className="page-shell phase-shell">
      <AppLink className="back-link" to={game.routes.careers}>← Voltar para carreiras</AppLink>
      <section className="page-heading centered"><span className="eyebrow">{game.name}</span><h1>Fases da carreira</h1><p>Escolha a etapa da vida profissional do motorista.</p></section>
      <div className="profile-strip"><strong>{career.driverName}</strong><span>{career.city}</span><span>{career.company}</span><span>{game.countryFlag ? `${game.countryFlag} ${game.countryName} • ` : ''}{game.currency} • {game.distanceUnit}</span></div>
      <section className="phase-list" data-tour="career-phases">
        <AppLink className="phase-card interactive" data-tour="phase-one" to={`${game.routes.phase1}?career=${encodeURIComponent(career.id)}`}>
          <div><span className="eyebrow">Fase ativa</span><h2>Fase 1 — Motorista Empregado</h2><p>{game.levelRoles[0]} • Níveis 1, 2 e 3 • Sem caminhão próprio.</p></div><span className="tag active">Abrir</span>
        </AppLink>
        <article className="phase-card disabled"><div><h2>Fase 2</h2><p>Primeiro caminhão próprio e operação como autônomo.</p></div><span className="tag">Em breve</span></article>
        <article className="phase-card disabled"><div><h2>Fase 3</h2><p>Reservada para uma etapa futura da simulação.</p></div><span className="tag">Em breve</span></article>
      </section>
    </main>
  )
}

export default function App() {
  const { path, params } = useHashRoute()
  if (path === '/') return <HomePage />

  const gameId = gameIdFromPath(path)
  const game = getGame(gameId)
  let career = null
  let page = null
  if (path === game.routes.careers) page = <CareersPage />
  else if (path === game.routes.new) page = <NewCareerPage />
  else if (path === game.routes.phases) {
    const careerId = params.get('career') || getActiveCareerId(game.id)
    career = getCareer(careerId, game.id)
    page = <PhasesPage careerId={careerId} />
  }
  else if (path === game.routes.phase1) {
    const careerId = params.get('career') || getActiveCareerId(game.id)
    career = getCareer(careerId, game.id)
    page = <Phase1Page gameId={game.id} careerId={careerId} onBack={() => { window.location.hash = `#${game.routes.phases}?career=${encodeURIComponent(careerId || '')}` }} />
  }

  return page ? (
    <GameProvider
      key={`${game.id}:${path}:${career?.countryCode || ''}:${career?.currency || ''}:${career?.exchangeRate || ''}`}
      gameId={game.id}
      countryCode={career?.countryCode || null}
      currencyCode={career?.currency || null}
      exchangeRate={career?.exchangeRate || null}
      exchangeRateAsOf={career?.exchangeRateAsOf || null}
    >
      {page}
    </GameProvider>
  ) : <HomePage />
}
