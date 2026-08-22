import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createCareer,
  CAREER_UPDATED_EVENT,
  deleteCareer,
  getActiveCareerId,
  getCareer,
  loadCareers,
  setActiveCareer,
} from './lib/storage.js'
import { downloadCSVTemplate, downloadExcelTemplate, exportCareersCSV, importCareerFile } from './lib/csv.js'
import { formatMoney, gameIdFromPath, getGame, getGameForCareer, GAMES } from './config/games.js'
import { convertAtsCurrency } from './config/atsCurrencies.js'
import { convertEts2Currency, roundCurrency } from './config/ets2Currencies.js'
import Phase1Page from './components/Phase1Page.jsx'
import CityAutocomplete from './components/CityAutocomplete.jsx'
import { GameProvider, useGame } from './components/GameContext.jsx'
import { useConfirm } from './components/ConfirmProvider.jsx'
import { useTutorial } from './components/GuidedTutorial.jsx'
import { useToast } from './components/ToastProvider.jsx'

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '#/')
  const [, setCareerRevision] = useState(0)
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/')
    const onCareerUpdated = () => setCareerRevision((revision) => revision + 1)
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener(CAREER_UPDATED_EVENT, onCareerUpdated)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener(CAREER_UPDATED_EVENT, onCareerUpdated)
    }
  }, [])
  const [path, query = ''] = hash.replace(/^#/, '').split('?')
  return { path: path || '/', params: new URLSearchParams(query) }
}

function AppLink({ to, className = '', children, ...props }) {
  return <a href={`#${to}`} className={className} {...props}>{children}</a>
}

function marketFactorText(factor) {
  const percentage = Math.round((Number(factor || 1) - 1) * 100)
  if (percentage === 0) return 'na referência da sede'
  return `${Math.abs(percentage)}% ${percentage > 0 ? 'acima' : 'abaixo'} da referência da sede`
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
  const [selectingForExport, setSelectingForExport] = useState(false)
  const [selectedCareerIds, setSelectedCareerIds] = useState([])
  const fileInput = useRef(null)
  const selectedCareers = useMemo(
    () => careers.filter((career) => selectedCareerIds.includes(career.id)),
    [careers, selectedCareerIds],
  )
  const allCareersSelected = careers.length > 0 && selectedCareers.length === careers.length

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
    setSelectedCareerIds((current) => current.filter((id) => id !== career.id))
    toast.success(`A carreira de ${career.driverName} foi excluída.`)
  }

  function openCareer(career) {
    setActiveCareer(career.id, game.id)
    window.location.hash = `#${game.routes.phases}?career=${encodeURIComponent(career.id)}`
  }

  function toggleCareerSelection(careerId) {
    setSelectedCareerIds((current) => current.includes(careerId)
      ? current.filter((id) => id !== careerId)
      : [...current, careerId])
  }

  function closeExportSelection() {
    setSelectingForExport(false)
    setSelectedCareerIds([])
  }

  function exportSelectedCareers() {
    try {
      exportCareersCSV(selectedCareers, game.id)
      toast.success(`${selectedCareers.length} ${selectedCareers.length === 1 ? 'carreira exportada' : 'carreiras exportadas'} em um único arquivo CSV.`, { title: 'Exportação concluída' })
      closeExportSelection()
    } catch (error) {
      toast.error(error.message, { title: 'Erro ao exportar carreiras' })
    }
  }

  async function importBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const extension = String(file.name || '').split('.').pop().toUpperCase()
    toast.info('Lendo e validando o backup da carreira...', { title: `Importando ${extension || 'arquivo'}`, duration: 2200 })
    try {
      const result = await importCareerFile(file, game.id)
      setCareers(loadCareers(game.id))
      const count = result.count || result.careers?.length || 1
      const message = count === 1
        ? `Carreira “${result.career.driverName}” importada em ${game.shortName} (${extension} • formato v${result.version}).`
        : `${count} carreiras importadas em ${game.shortName} a partir do mesmo arquivo ${extension} (formato v${result.version}).`
      toast.success(message, { title: 'Importação concluída' })
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
        {careers.length > 0 && <button className="button secondary" type="button" onClick={() => { setSelectingForExport(true); setSelectedCareerIds([]) }}>Exportar carreiras</button>}
        <button className="button secondary" type="button" onClick={() => setShowCsvHelp((value) => !value)}>Como importar uma carreira</button>
        <input ref={fileInput} type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={importBackup} />
      </div>

      {showCsvHelp && (
        <section className="panel csv-help">
          <span className="eyebrow">Importação de carreira — {game.shortName}</span>
          <h2>Como importar uma carreira</h2>
          <p>A primeira linha contém os títulos dos campos. A segunda linha é uma carreira; para importar outras de uma vez, adicione uma carreira por linha abaixo dela.</p>
          <p>Os campos com <code>*</code> são obrigatórios. O código da sede financeira é a sigla do estado no ATS, como <code>CA</code> ou <code>TX</code>, e a sigla do país no ETS2, como <code>DE</code> ou <code>GB</code>.</p>
          <p><strong>CSV:</strong> use ponto para casas decimais e não use separador de milhar nem símbolo de moeda. Exemplos: <code>850</code>, <code>1602.63</code> e <code>0.50</code>.</p>
          <p><strong>XLS/XLSX:</strong> use células numéricas normais. A exibição regional do Excel não altera o valor lido pelo aplicativo.</p>
          <p>As colunas marcadas como <code>JSON [não editar]</code> são preenchidas nas exportações e preservam viagens, histórico, despesas, ocorrências, holerites e reserva. No modelo novo elas ficam vazias e a aplicação calcula os padrões pela sede e cidade.</p>
          <p>Não altere os títulos nem as colunas <code>Formato</code>, <code>Versão</code> e <code>Jogo</code>. Backups antigos com linhas <code>CAREER</code>, <code>STATE</code> e <code>TRIP</code> continuam aceitos.</p>
          <div className="action-row">
            <button className="button secondary" type="button" onClick={() => downloadCSVTemplate(game.id)}>Baixar modelo CSV</button>
            <button className="button secondary" type="button" onClick={() => downloadExcelTemplate('xlsx', game.id)}>Baixar modelo XLSX</button>
            <button className="button secondary" type="button" onClick={() => downloadExcelTemplate('xls', game.id)}>Baixar modelo XLS</button>
          </div>
        </section>
      )}

      {selectingForExport && careers.length > 0 && (
        <section className="panel career-export-bar" aria-label="Selecionar carreiras para exportação">
          <div>
            <span className="eyebrow">Exportação em lote</span>
            <strong>{selectedCareers.length} de {careers.length} {careers.length === 1 ? 'carreira selecionada' : 'carreiras selecionadas'}</strong>
            <small>Toque nos cards que deseja reunir no mesmo arquivo.</small>
          </div>
          <div className="career-export-actions">
            <button className="button secondary compact" type="button" onClick={() => setSelectedCareerIds(allCareersSelected ? [] : careers.map((career) => career.id))}>{allCareersSelected ? 'Limpar seleção' : 'Selecionar todas'}</button>
            <button className="button success compact" type="button" disabled={selectedCareers.length === 0} onClick={exportSelectedCareers}>Exportar selecionadas</button>
            <button className="button secondary compact" type="button" onClick={closeExportSelection}>Cancelar</button>
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
            const selected = selectedCareerIds.includes(career.id)
            return <article
              className={`panel career-card career-card-clickable${selectingForExport ? ' career-card-selecting' : ''}${selected ? ' career-card-selected' : ''}`}
              key={career.id}
              role="button"
              tabIndex={0}
              aria-label={selectingForExport ? `${selected ? 'Desmarcar' : 'Selecionar'} carreira ${career.driverName}` : `Abrir carreira ${career.driverName}`}
              aria-pressed={selectingForExport ? selected : undefined}
              onClick={() => selectingForExport ? toggleCareerSelection(career.id) : openCareer(career)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  if (selectingForExport) toggleCareerSelection(career.id)
                  else openCareer(career)
                }
              }}
            >
              <div className="career-card-top">
                <div><span className="eyebrow">{game.shortName} • Nível {career.currentLevel || 1}</span><h2>{career.driverName}</h2></div>
                <span className="pill">{career.city || 'Cidade não informada'}</span>
              </div>
              <div className="career-meta">
                {game.id === 'ets2' && <><span>País-sede</span><strong>{careerGame.countryFlag} {careerGame.countryName}</strong></>}
                {game.id === 'ats' && <><span>Estado-sede</span><strong>{careerGame.stateName} ({careerGame.stateCode})</strong></>}
                <span>Mercado da cidade</span><strong>{careerGame.cityMarketLabel}</strong>
                <span>Moeda</span><strong>{careerGame.currency}{careerGame.currency !== careerGame.baseCurrency ? ` • base ${careerGame.baseCurrency}` : ''}</strong>
                <span>Empresa</span><strong>{career.company || '—'}</strong>
                <span>Saldo inicial</span><strong>{formatMoney(career.initialBalance ?? career.currentBalance, careerGame)}</strong>
              </div>
              <p className="career-bio">{career.bio || career.biography || 'Sem biografia cadastrada.'}</p>
              <div className="career-card-footer">
                <span className="career-open-hint">{selectingForExport ? 'Clique no card para selecionar' : 'Clique no card para continuar'}</span>
                {selectingForExport ? (
                  <input className="career-select-checkbox" type="checkbox" checked={selected} aria-label={`Selecionar carreira ${career.driverName}`} onClick={(event) => event.stopPropagation()} onChange={() => toggleCareerSelection(career.id)} />
                ) : (
                  <button className="career-delete-icon" type="button" aria-label={`Excluir carreira ${career.driverName}`} title="Excluir carreira" onClick={(event) => { event.stopPropagation(); removeCareer(career) }}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" /></svg>
                  </button>
                )}
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
  const [stateCode, setStateCode] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [city, setCity] = useState('')
  const [company, setCompany] = useState('')
  const [arrivalBalance, setArrivalBalance] = useState(0)
  const [bio, setBio] = useState('')
  const [costs, setCosts] = useState({})
  const [showTutorial, setShowTutorial] = useState(false)
  const locationCode = isEts2 ? countryCode : stateCode
  const selectedGame = useMemo(
    () => locationCode ? getGame(game.id, locationCode, currencyCode, null, null, city) : game,
    [city, currencyCode, game, locationCode],
  )
  const financialProfileReady = Boolean(locationCode && currencyCode)
  const cityMarketReady = Boolean(selectedGame.cityMarketKnown && selectedGame.city === city.trim())

  const totalCosts = useMemo(() => Object.values(costs).reduce((sum, value) => sum + Number(value || 0), 0), [costs])
  const remaining = Number(arrivalBalance || 0) - totalCosts

  function updateCost(key, value) {
    setCosts((current) => ({ ...current, [key]: Number(value) || 0 }))
  }

  function changeLocation(nextLocationCode) {
    if (isEts2) setCountryCode(nextLocationCode)
    else setStateCode(nextLocationCode)
    setCity('')
    if (!nextLocationCode) {
      setCurrencyCode('')
      setArrivalBalance(0)
      setCosts({})
      return
    }
    const locationGame = getGame(game.id, nextLocationCode)
    setCurrencyCode(locationGame.baseCurrency)
    setArrivalBalance(locationGame.defaultArrivalBalance)
    setCosts({ ...locationGame.setupCosts })
  }

  function changeCurrency(nextCurrencyCode) {
    if (!locationCode || !nextCurrencyCode) return
    const fromCurrency = selectedGame.currency
    const convert = isEts2 ? convertEts2Currency : convertAtsCurrency
    setArrivalBalance(roundCurrency(convert(arrivalBalance, fromCurrency, nextCurrencyCode)))
    setCosts((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [
      key,
      roundCurrency(convert(value, fromCurrency, nextCurrencyCode)),
    ])))
    setCurrencyCode(nextCurrencyCode)
  }

  function changeCity(nextCity) {
    setCity(nextCity)
    if (!locationCode || !currencyCode) return
    const locationGame = getGame(game.id, locationCode, currencyCode)
    if (!locationGame.baseCities?.includes(String(nextCity || '').trim())) return
    const cityGame = getGame(game.id, locationCode, currencyCode, null, null, nextCity)
    setArrivalBalance(cityGame.defaultArrivalBalance)
    setCosts({ ...cityGame.setupCosts })
  }

  async function submit(event) {
    event.preventDefault()
    if (!locationCode) {
      toast.error(`Escolha o ${isEts2 ? 'país' : 'estado'}-sede financeiro antes de criar a carreira.`)
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
    if (!isEts2 && !city.trim().endsWith(`, ${selectedGame.stateCode}`)) {
      toast.error(`A cidade-base precisa pertencer ao estado-sede ${selectedGame.stateName}. Para cidades de mod, use o formato “Cidade, ${selectedGame.stateCode}”.`)
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
      stateCode: !isEts2 ? stateCode : undefined, stateName: !isEts2 ? selectedGame.stateName : undefined,
      baseCurrency: selectedGame.baseCurrency,
      exchangeRate: selectedGame.exchangeRate,
      exchangeRateAsOf: selectedGame.exchangeRateAsOf,
      cityMarketVersion: selectedGame.cityMarketVersion,
      cityMarketLabel: selectedGame.cityMarketLabel,
      cityCostFactor: selectedGame.cityCostFactor,
      citySalaryFactor: selectedGame.citySalaryFactor,
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
          <p>{isEts2 ? 'Escolha o país-sede das regras financeiras e, separadamente, a moeda em que deseja controlar a carreira; as viagens continuam em quilômetros por toda a Europa.' : 'Escolha o estado-sede para usar custos e impostos locais e selecione dólar ou euro como moeda de exibição; as viagens continuam em milhas por todos os Estados Unidos.'} Cada jogo mantém progresso separado.</p>
        </div>

        <div className="country-selector" data-tour={isEts2 ? 'career-country' : 'career-state'}>
            <label htmlFor={isEts2 ? 'career-country' : 'career-state'}>{isEts2 ? 'País-sede financeiro' : 'Estado-sede financeiro'}</label>
            <select id={isEts2 ? 'career-country' : 'career-state'} value={locationCode} onChange={(event) => changeLocation(event.target.value)} required>
              <option value="">Selecione o {isEts2 ? 'país' : 'estado'}-sede</option>
              {(isEts2 ? game.countryOptions : game.stateOptions).map((location) => <option value={location.code} key={location.code}>{isEts2 ? `${location.flag} ` : ''}{location.name} — {location.currency}</option>)}
            </select>
            <small>O {isEts2 ? 'país' : 'estado'}-sede define impostos, contribuições e referências financeiras. A cidade-base ajusta aluguel, despesas urbanas e os salários dos três níveis; o destino das viagens não altera sua folha.</small>
          </div>

        <div className="country-selector" data-tour="career-currency">
            <label htmlFor="career-currency">Moeda da carreira</label>
            <select id="career-currency" value={currencyCode} onChange={(event) => changeCurrency(event.target.value)} disabled={!locationCode} required>
              <option value="">Selecione primeiro o {isEts2 ? 'país' : 'estado'}-sede</option>
              {game.currencyOptions.map((currency) => <option value={currency.code} key={currency.code}>{currency.code} — {currency.name} ({currency.symbol})</option>)}
            </select>
            <small>{locationCode && currencyCode
              ? selectedGame.currency === selectedGame.baseCurrency
                ? `Valores já estão na moeda-base de ${isEts2 ? selectedGame.countryName : selectedGame.stateName}.`
                : `Regras de ${isEts2 ? selectedGame.countryName : selectedGame.stateName} são calculadas em ${selectedGame.baseCurrency} e convertidas para ${selectedGame.currency}. Cotação fixada em ${selectedGame.exchangeRateAsOf}: 1 ${selectedGame.baseCurrency} = ${formatMoney(selectedGame.exchangeRate, selectedGame)}.`
              : 'A moeda escolhida será usada em todas as telas, lançamentos e holerites da carreira.'}</small>
          </div>

        <label>Nome do motorista</label>
        <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Ex.: Rafael Silva" required />

        <div className="two-columns">
          <CityAutocomplete value={city} onChange={changeCity} label="Cidade-base" required cities={selectedGame.baseCities || []} disabled={!financialProfileReady} placeholder={selectedGame.cityPlaceholder} hint={financialProfileReady ? `${selectedGame.baseCities.length} cidades disponíveis em ${isEts2 ? selectedGame.countryName : `${selectedGame.stateName} (${selectedGame.stateCode})`}. ${cityMarketReady ? `${selectedGame.cityMarketLabel}: custos urbanos ${marketFactorText(selectedGame.cityCostFactor)} e salários ${marketFactorText(selectedGame.citySalaryFactor)}.` : 'Selecione uma cidade da lista para aplicar o mercado local; cidades de mod usam a referência da sede.'} As viagens continuam abrangendo todo o mapa.` : `Selecione o ${isEts2 ? 'país' : 'estado'}-sede para liberar as cidades-base.`} />
          <div><label>Nome da empresa</label><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={`Ex.: ${selectedGame.companyPlaceholder}`} required /></div>
        </div>

        <label>{selectedGame.arrivalLabel} ({selectedGame.currency})</label>
        <input type="number" min="0" step="0.01" value={arrivalBalance} disabled={!financialProfileReady} onChange={(e) => setArrivalBalance(e.target.value)} />

        {financialProfileReady && <section className="setup-panel">
          <div className="setup-heading">
            <div><h2>Custos iniciais de mudança</h2><p>Valores sugeridos para o roleplay de {game.shortName}{cityMarketReady ? `, ajustados para ${selectedGame.cityMarketLabel.toLowerCase()}` : ''}; continuam editáveis.</p></div>
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
      <div className="profile-strip"><strong>{career.driverName}</strong><span>{career.city}</span><span>{career.company}</span><span>{game.countryFlag ? `${game.countryFlag} ${game.countryName}` : `${game.stateName} (${game.stateCode})`} • {game.cityMarketLabel} • {game.currency} • {game.distanceUnit}</span></div>
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
      key={`${game.id}:${path}:${career?.countryCode || career?.stateCode || ''}:${career?.city || ''}:${career?.currency || ''}:${career?.exchangeRate || ''}`}
      gameId={game.id}
      countryCode={career?.countryCode || null}
      stateCode={career?.stateCode || null}
      currencyCode={career?.currency || null}
      exchangeRate={career?.exchangeRate || null}
      exchangeRateAsOf={career?.exchangeRateAsOf || null}
      city={career?.city || ''}
      cityCostFactor={career?.cityCostFactor || null}
      citySalaryFactor={career?.citySalaryFactor || null}
      cityMarketLabel={career?.cityMarketLabel || null}
    >
      {page}
    </GameProvider>
  ) : <HomePage />
}
