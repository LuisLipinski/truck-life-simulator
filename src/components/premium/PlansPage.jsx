import { useAuth } from '../auth/AuthProvider.jsx'
import { useEntitlements } from './EntitlementProvider.jsx'

const FEATURE_LABELS = {
  MAX_ATS_CAREERS: 'Carreiras ATS',
  MAX_ETS2_CAREERS: 'Carreiras ETS2',
  BATCH_EXPORT: 'Exportação em lote',
  XLSX_EXPORT: 'Exportação XLS/XLSX',
  FULL_HISTORY: 'Histórico completo',
  ADVANCED_CHARTS: 'Gráficos e análises avançadas',
}

function featureValue(code, feature) {
  if (!feature?.enabled) return 'Não incluído'
  if (code === 'MAX_ATS_CAREERS' || code === 'MAX_ETS2_CAREERS') {
    return feature.limit == null ? 'Ilimitadas' : String(feature.limit)
  }
  return 'Incluído'
}

function planPrice(plan) {
  if (plan.code === 'FREE') return 'Grátis'
  if (plan.priceCents == null) return 'Preço ainda não definido'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: plan.currency || 'BRL',
  }).format(Number(plan.priceCents) / 100)
}

export default function PlansPage() {
  const auth = useAuth()
  const entitlements = useEntitlements()
  const currentPlan = auth.isAuthenticated ? entitlements.entitlements?.plan : 'GUEST'

  return (
    <main className="page-shell wide-shell premium-plans-shell">
      <a className="back-link" href="#/">← Voltar ao simulador</a>
      <section className="page-heading centered premium-heading">
        <span className="eyebrow">Truck Life Simulator</span>
        <h1>Planos Free e Premium</h1>
        <p>O núcleo da carreira continua disponível no Free. O Premium será focado em limites maiores, conveniência e recursos avançados.</p>
        {auth.isAuthenticated && entitlements.status === 'ready' && (
          <span className="premium-current-plan">Seu plano atual: <strong>{currentPlan === 'PREMIUM' ? 'Premium' : 'Free'}</strong></span>
        )}
      </section>

      <section className="panel premium-core-free">
        <span className="eyebrow">Sempre no Free</span>
        <h2>O gameplay principal não fica atrás de pagamento</h2>
        <p>Viagens, progressão N1–N3, HazMat/ADR, holerite, impostos, jornada, despesas, reserva de emergência, empréstimos e financiamentos e o histórico essencial continuam disponíveis no plano Free.</p>
      </section>

      {entitlements.status === 'loading' && (
        <section className="panel premium-loading"><p>Carregando planos…</p></section>
      )}

      {entitlements.status === 'error' && (
        <section className="panel premium-loading" role="alert">
          <h2>Não foi possível carregar os planos</h2>
          <p>{entitlements.error?.message || 'A API de planos não respondeu.'}</p>
          <button className="button secondary compact" type="button" onClick={() => entitlements.refresh()}>Tentar novamente</button>
        </section>
      )}

      {entitlements.plans.length > 0 && (
        <section className="premium-plan-grid" aria-label="Comparação de planos">
          {entitlements.plans.map((plan) => {
            const isCurrent = auth.isAuthenticated && currentPlan === plan.code
            const premium = plan.code === 'PREMIUM'
            return (
              <article className={`panel premium-plan-card${premium ? ' premium-plan-card-featured' : ''}`} key={plan.code}>
                <div className="premium-plan-top">
                  <div>
                    <span className={premium ? 'premium-badge' : 'tag active'}>{premium ? 'Premium' : 'Free'}</span>
                    <h2>{plan.name}</h2>
                  </div>
                  {isCurrent && <span className="premium-current-badge">Plano atual</span>}
                </div>
                <strong className="premium-price">{planPrice(plan)}</strong>
                {premium && plan.priceCents == null && (
                  <p className="premium-price-note">O preço será definido antes da etapa de pagamento PIX. A P5 não cria cobrança nem ativa Premium por pagamento.</p>
                )}
                <div className="premium-feature-list">
                  {Object.entries(FEATURE_LABELS).map(([code, label]) => {
                    const feature = plan.features?.[code]
                    const included = Boolean(feature?.enabled)
                    return (
                      <div className={included ? 'included' : 'excluded'} key={code}>
                        <span>{label}</span>
                        <strong>{featureValue(code, feature)}</strong>
                      </div>
                    )
                  })}
                </div>
                {premium ? (
                  <div className="notice-box">
                    <strong>Pagamento ainda não disponível</strong>
                    <span>A contratação via PIX será implementada na P6, com ativação somente após confirmação server-to-server.</span>
                  </div>
                ) : (
                  <div className="notice-box">
                    <strong>Conta autenticada Free</strong>
                    <span>Até 2 carreiras ATS e 2 ETS2 server-side. Carreiras locais de convidado continuam separadas.</span>
                  </div>
                )}
              </article>
            )
          })}
        </section>
      )}

      <section className="panel premium-expiration-note">
        <span className="eyebrow">Proteção dos seus dados</span>
        <h2>Se o Premium expirar no futuro</h2>
        <p>Nenhuma carreira existente será apagada. Se a conta estiver acima do limite Free, apenas a criação de novas carreiras ficará bloqueada até renovar o Premium ou voltar ao limite permitido.</p>
      </section>
    </main>
  )
}
