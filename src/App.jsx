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
import Phase1Page from './components/Phase1Page.jsx'
import CityAutocomplete from './components/CityAutocomplete.jsx'
import { useConfirm } from './components/ConfirmProvider.jsx'
import { useToast } from './components/ToastProvider.jsx'

const ATS_IMAGE = 'https://cdn.cloudflare.steamstatic.com/steam/apps/270880/header.jpg'
const ETS_IMAGE = 'https://cdn.cloudflare.steamstatic.com/steam/apps/227300/header.jpg'

const DEFAULT_COSTS = {
  rent: 1650,
  deposit: 1650,
  license: 100,
  groceries: 250,
  home: 350,
  phone: 60,
  internet: 75,
  transit: 72,
}

const COST_LABELS = {
  rent: 'Primeiro mês de aluguel',
  deposit: 'Depósito caução',
  license: 'Licença / CDL inicial',
  groceries: 'Mercado inicial',
  home: 'Itens básicos da casa',
  phone: 'Celular / chip',
  internet: 'Internet / instalação',
  transit: 'Transporte público inicial',
}

function money(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

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
        <p>Escolha o jogo para acessar sua carreira realista.</p>
      </section>
      <section className="game-grid">
        <AppLink className="game-card interactive" to="/ats" aria-label="Abrir American Truck Simulator">
          <span className="tag active">Disponível</span>
          <img src={ATS_IMAGE} alt="American Truck Simulator" />
          <h2>American Truck Simulator</h2>
          <p>Carreira nos Estados Unidos, começando como motorista empregado.</p>
        </AppLink>
        <article className="game-card disabled" aria-disabled="true">
          <span className="tag">Em breve</span>
          <img src={ETS_IMAGE} alt="Euro Truck Simulator 2" />
          <h2>Euro Truck Simulator 2</h2>
          <p>Área reservada para a futura simulação de carreira na Europa.</p>
        </article>
      </section>
      <footer>Seus dados continuam salvos localmente neste navegador.</footer>
    </main>
  )
}

function CareersPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [careers, setCareers] = useState(() => loadCareers())
  const [showCsvHelp, setShowCsvHelp] = useState(false)
  const fileInput = useRef(null)

  async function removeCareer(career) {
    const confirmed = await confirm({
      title: 'Excluir carreira?',
      message: `A carreira de ${career.driverName} será removida desta lista. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir carreira',
      tone: 'danger',
    })
    if (!confirmed) return
    deleteCareer(career.id)
    setCareers(loadCareers())
    toast.success(`A carreira de ${career.driverName} foi excluída.`)
  }

  function openCareer(career) {
    setActiveCareer(career.id)
    window.location.hash = `#/phases?career=${encodeURIComponent(career.id)}`
  }

  async function importBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const extension = String(file.name || '').split('.').pop().toUpperCase()
    toast.info('Lendo e validando o backup da carreira...', { title: `Importando ${extension || 'arquivo'}`, duration: 2200 })
    try {
      const result = await importCareerFile(file)
      setCareers(loadCareers())
      toast.success(`Carreira “${result.career.driverName}” importada com sucesso (${extension} • backup v${result.version}).`, { title: 'Importação concluída' })
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
        <img className="ats-logo" src={ATS_IMAGE} alt="American Truck Simulator" />
        <span className="eyebrow">American Truck Simulator</span>
        <h1>Suas carreiras</h1>
        <p>Crie uma nova carreira, importe um backup CSV, XLS ou XLSX, ou continue um personagem salvo neste navegador.</p>
      </section>

      <div className="action-row">
        <AppLink className="button primary" to="/new">+ Criar nova carreira</AppLink>
        <button className="button success" type="button" onClick={() => fileInput.current?.click()}>Importar carreira</button>
        <button className="button secondary" type="button" onClick={() => setShowCsvHelp((value) => !value)}>Como importar uma carreira</button>
        <input ref={fileInput} type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={importBackup} />
      </div>

      {showCsvHelp && (
        <section className="panel csv-help">
          <span className="eyebrow">Importação de carreira</span>
          <h2>Como importar uma carreira</h2>
          <p>Você pode importar backups nos formatos <strong>CSV, XLS ou XLSX</strong>. Os três usam a identificação <code>ATS_CAREER_BACKUP</code> e podem guardar perfil, custos iniciais, estado, viagens, histórico, gastos personalizados, ocorrências e semanas fechadas.</p>
          <p><strong>CSV:</strong> valores numéricos devem usar <strong>ponto</strong> para casas decimais e não devem ter separador de milhar. Exemplos válidos: <code>850</code>, <code>1602.63</code>, <code>0.50</code> e <code>21.25</code>. Não use <code>1602,63</code>, <code>1,602.63</code>, <code>1.602,63</code> ou símbolo de dólar.</p>
          <p><strong>XLS/XLSX:</strong> preencha valores como células numéricas normais do Excel. A exibição pode usar vírgula ou ponto conforme a configuração regional do Excel; o app lê o valor numérico da célula.</p>
          <p>Campos numéricos com letras ou formatos inválidos são recusados. A mensagem de erro informa o tipo, o campo e a linha que precisa ser corrigida antes da importação.</p>
          <p>Ao importar, o React cria uma <strong>nova carreira</strong> com um novo ID. Backups antigos continuam aceitos e são normalizados para a estrutura atual.</p>
          <p>Não altere os nomes da primeira coluna, como <code>CAREER</code>, <code>STATE</code>, <code>TRIP</code> e <code>CLOSED_WEEK</code>.</p>
          <p><strong>Quer começar por um arquivo pronto?</strong> Baixe um dos modelos abaixo, preencha os dados e depois use o botão <strong>Importar carreira</strong>.</p>
          <div className="action-row">
            <button className="button secondary" type="button" onClick={downloadCSVTemplate}>Baixar modelo CSV</button>
            <button className="button secondary" type="button" onClick={() => downloadExcelTemplate('xlsx')}>Baixar modelo XLSX</button>
            <button className="button secondary" type="button" onClick={() => downloadExcelTemplate('xls')}>Baixar modelo XLS</button>
          </div>
        </section>
      )}

      {careers.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhuma carreira criada</h2>
          <p>Crie seu primeiro motorista ou importe um backup CSV, XLS ou XLSX.</p>
          <AppLink className="button primary compact" to="/new">Criar carreira</AppLink>
        </div>
      ) : (
        <section className="career-grid">
          {careers.map((career) => (
            <article
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
                <div>
                  <span className="eyebrow">Nível {career.currentLevel || 1}</span>
                  <h2>{career.driverName}</h2>
                </div>
                <span className="pill">{career.city || 'Cidade não informada'}</span>
              </div>
              <div className="career-meta">
                <span>Empresa</span><strong>{career.company || '—'}</strong>
                <span>Saldo inicial</span><strong>{money(career.initialBalance ?? career.currentBalance)}</strong>
              </div>
              <p className="career-bio">{career.bio || career.biography || 'Sem biografia cadastrada.'}</p>
              <div className="career-card-footer">
                <span className="career-open-hint">Clique no card para continuar</span>
                <button
                  className="career-delete-icon"
                  type="button"
                  aria-label={`Excluir carreira ${career.driverName}`}
                  title="Excluir carreira"
                  onClick={(event) => {
                    event.stopPropagation()
                    removeCareer(career)
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" />
                  </svg>
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

function NewCareerPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [driverName, setDriverName] = useState('')
  const [city, setCity] = useState('')
  const [company, setCompany] = useState('')
  const [arrivalBalance, setArrivalBalance] = useState(5000)
  const [bio, setBio] = useState('')
  const [costs, setCosts] = useState(DEFAULT_COSTS)

  const totalCosts = useMemo(() => Object.values(costs).reduce((sum, value) => sum + Number(value || 0), 0), [costs])
  const remaining = Number(arrivalBalance || 0) - totalCosts

  function updateCost(key, value) {
    setCosts((current) => ({ ...current, [key]: Number(value) || 0 }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!driverName.trim() || !city.trim() || !company.trim()) {
      toast.error('Preencha nome, cidade e empresa antes de criar a carreira.')
      return
    }
    if (remaining < 0) {
      const confirmed = await confirm({
        title: 'Criar com saldo negativo?',
        message: `Os custos iniciais são maiores que o dinheiro disponível. A carreira começará com ${money(remaining)}.`,
        confirmLabel: 'Criar mesmo assim',
        tone: 'warning',
      })
      if (!confirmed) return
    }

    const career = createCareer({
      driverName: driverName.trim(),
      city: city.trim(),
      company: company.trim(),
      arrivalBalance: Number(arrivalBalance) || 0,
      setupCosts: costs,
      setupCostsTotal: totalCosts,
      initialBalance: remaining,
      currentBalance: remaining,
      bio: bio.trim(),
    })
    toast.success(`Carreira de ${career.driverName} criada com sucesso.`, { title: 'Carreira criada' })
    window.location.hash = `#/phases?career=${encodeURIComponent(career.id)}`
  }

  return (
    <main className="page-shell form-shell">
      <AppLink className="back-link" to="/ats">← Voltar para carreiras</AppLink>
      <form className="panel form-panel" onSubmit={submit}>
        <div className="section-heading">
          <span className="eyebrow">Novo personagem</span>
          <h1>Criar nova carreira</h1>
          <p>Cada carreira mantém progresso e finanças separados.</p>
        </div>

        <label>Nome do motorista</label>
        <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Ex.: Rafael Silva" required />

        <div className="two-columns">
          <CityAutocomplete value={city} onChange={setCity} label="Cidade inicial" required />
          <div>
            <label>Nome da empresa</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Ex.: Pacific Horizon Logistics" required />
          </div>
        </div>

        <label>Dinheiro ao chegar aos EUA (US$)</label>
        <input type="number" min="0" step="0.01" value={arrivalBalance} onChange={(e) => setArrivalBalance(e.target.value)} />

        <section className="setup-panel">
          <div className="setup-heading">
            <div>
              <h2>Custos iniciais de mudança</h2>
              <p>Edite os valores antes de criar a carreira.</p>
            </div>
            <div className="inline-actions">
              <button type="button" className="button secondary compact" onClick={() => setCosts(DEFAULT_COSTS)}>Restaurar</button>
              <button type="button" className="button secondary compact" onClick={() => setCosts(Object.fromEntries(Object.keys(DEFAULT_COSTS).map((key) => [key, 0])))}>Zerar</button>
            </div>
          </div>
          <div className="cost-grid">
            {Object.entries(costs).map(([key, value]) => (
              <div className="cost-field" key={key}>
                <label>{COST_LABELS[key]}</label>
                <input type="number" min="0" step="0.01" value={value} onChange={(e) => updateCost(key, e.target.value)} />
              </div>
            ))}
          </div>
          <div className="summary-grid">
            <div><span>Dinheiro ao chegar</span><strong>{money(arrivalBalance)}</strong></div>
            <div><span>Total de custos</span><strong>{money(totalCosts)}</strong></div>
            <div><span>Saldo inicial</span><strong className={remaining < 0 ? 'negative' : 'positive'}>{money(remaining)}</strong></div>
          </div>
        </section>

        <label>Biografia do personagem</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Ex.: Brasileiro que imigrou legalmente para os EUA..." />
        <button className="button primary submit-button" type="submit">Criar carreira e continuar</button>
      </form>
    </main>
  )
}

function PhasesPage({ careerId }) {
  const id = careerId || getActiveCareerId()
  const career = id ? getCareer(id) : null

  useEffect(() => {
    if (career?.id) setActiveCareer(career.id)
  }, [career?.id])

  if (!career) {
    return (
      <main className="page-shell form-shell">
        <AppLink className="back-link" to="/ats">← Voltar para carreiras</AppLink>
        <div className="empty-state"><h2>Carreira não encontrada</h2><p>Escolha uma carreira salva para continuar.</p></div>
      </main>
    )
  }

  return (
    <main className="page-shell phase-shell">
      <AppLink className="back-link" to="/ats">← Voltar para carreiras</AppLink>
      <section className="page-heading centered">
        <span className="eyebrow">American Truck Simulator</span>
        <h1>Fases da carreira</h1>
        <p>Escolha a etapa da sua vida profissional.</p>
      </section>
      <div className="profile-strip">
        <strong>{career.driverName}</strong>
        <span>{career.city}</span>
        <span>{career.company}</span>
      </div>
      <section className="phase-list">
        <AppLink className="phase-card interactive" to={`/phase1?career=${encodeURIComponent(career.id)}`}>
          <div><span className="eyebrow">Fase ativa</span><h2>Fase 1 — Motorista Empregado</h2><p>Company Driver • Níveis 1, 2 e 3 • Sem caminhão próprio.</p></div>
          <span className="tag active">Abrir</span>
        </AppLink>
        <article className="phase-card disabled"><div><h2>Fase 2</h2><p>Primeiro caminhão próprio e operação como owner-operator.</p></div><span className="tag">Em breve</span></article>
        <article className="phase-card disabled"><div><h2>Fase 3</h2><p>Reservada para uma etapa futura da simulação.</p></div><span className="tag">Em breve</span></article>
      </section>
    </main>
  )
}

export default function App() {
  const { path, params } = useHashRoute()

  if (path === '/ats') return <CareersPage />
  if (path === '/new') return <NewCareerPage />
  if (path === '/phases') return <PhasesPage careerId={params.get('career')} />
  if (path === '/phase1') {
    const careerId = params.get('career') || getActiveCareerId()
    return <Phase1Page careerId={careerId} onBack={() => { window.location.hash = `#/phases?career=${encodeURIComponent(careerId || '')}` }} />
  }
  return <HomePage />
}
