import { useEffect, useMemo, useState } from 'react'
import {
  createCareer,
  deleteCareer,
  getActiveCareerId,
  getCareer,
  loadCareers,
  setActiveCareer,
} from './lib/storage.js'
import Phase1Page from './components/Phase1Page.jsx'

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
      <footer>Seus dados atuais continuam usando o mesmo armazenamento local da versão clássica.</footer>
    </main>
  )
}

function CareersPage() {
  const [careers, setCareers] = useState(() => loadCareers())

  function removeCareer(career) {
    if (!window.confirm(`Excluir a carreira de ${career.driverName}? Essa ação não pode ser desfeita.`)) return
    deleteCareer(career.id)
    setCareers(loadCareers())
  }

  function openCareer(career) {
    setActiveCareer(career.id)
    window.location.hash = `#/phases?career=${encodeURIComponent(career.id)}`
  }

  return (
    <main className="page-shell wide-shell">
      <AppLink className="back-link" to="/">← Voltar para jogos</AppLink>
      <section className="page-heading centered">
        <img className="ats-logo" src={ATS_IMAGE} alt="American Truck Simulator" />
        <span className="eyebrow">American Truck Simulator</span>
        <h1>Suas carreiras</h1>
        <p>Crie uma nova carreira ou continue um personagem salvo neste navegador.</p>
      </section>

      <div className="action-row">
        <AppLink className="button primary" to="/new">+ Criar nova carreira</AppLink>
        <a className="button success" href="ats.html">Importar carreira CSV</a>
        <a className="button secondary" href="ats.html">Modelo CSV / versão clássica</a>
      </div>

      {careers.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhuma carreira criada</h2>
          <p>Crie seu primeiro motorista para começar a simulação.</p>
          <AppLink className="button primary compact" to="/new">Criar carreira</AppLink>
        </div>
      ) : (
        <section className="career-grid">
          {careers.map((career) => (
            <article className="panel career-card" key={career.id}>
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
              <div className="card-actions">
                <button className="button primary" onClick={() => openCareer(career)}>Continuar</button>
                <button className="button danger" onClick={() => removeCareer(career)}>Excluir</button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

function NewCareerPage() {
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

  function submit(event) {
    event.preventDefault()
    if (!driverName.trim() || !city.trim() || !company.trim()) {
      window.alert('Preencha nome, cidade e empresa.')
      return
    }
    if (remaining < 0 && !window.confirm('Os custos iniciais são maiores que o dinheiro disponível. Criar a carreira com saldo negativo?')) return

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
    window.location.hash = `#/phases?career=${encodeURIComponent(career.id)}`
  }

  return (
    <main className="page-shell form-shell">
      <AppLink className="back-link" to="/ats">← Voltar para carreiras</AppLink>
      <form className="panel form-panel" onSubmit={submit}>
        <div className="section-heading">
          <span className="eyebrow">Novo personagem</span>
          <h1>Criar nova carreira</h1>
          <p>Os dados continuam compatíveis com as carreiras já gravadas pela versão clássica.</p>
        </div>

        <label>Nome do motorista</label>
        <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Ex.: Rafael Silva" required />

        <div className="two-columns">
          <div>
            <label>Cidade inicial</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex.: Los Angeles, CA" required />
            <small>O autocomplete completo será migrado junto com o módulo de cidades.</small>
          </div>
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
          <span className="tag active">Abrir em React</span>
        </AppLink>
        <article className="phase-card disabled"><div><h2>Fase 2</h2><p>Primeiro caminhão próprio e operação como owner-operator.</p></div><span className="tag">Em breve</span></article>
        <article className="phase-card disabled"><div><h2>Fase 3</h2><p>Reservada para uma etapa futura da simulação.</p></div><span className="tag">Em breve</span></article>
      </section>
      <div className="migration-note">Home, carreiras, criação, fases, Visão Geral e Progresso já estão em React. Os demais módulos da Fase 1 continuam disponíveis na versão clássica durante a migração.</div>
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
