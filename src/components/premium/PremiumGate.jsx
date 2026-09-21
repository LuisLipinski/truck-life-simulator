import { useEntitlements } from './EntitlementProvider.jsx'

export default function PremiumGate({ feature, children, fallback = null }) {
  const entitlements = useEntitlements()

  if (entitlements.status === 'loading') return null
  if (entitlements.hasFeature(feature)) return children
  if (fallback) return fallback

  return (
    <section className="panel premium-gate" role="note">
      <span className="premium-badge">Premium</span>
      <h3>Recurso Premium</h3>
      <p>Este recurso depende do plano Premium. A autorização final é sempre validada pelo backend.</p>
      <a className="button secondary compact" href="#/pricing">Ver planos</a>
    </section>
  )
}
