import { cloneElement, isValidElement } from 'react'
import { useEntitlements } from './EntitlementProvider.jsx'

export const PREMIUM_LOCK_TEXT = 'Disponível apenas no Premium'

function disabledControl(children) {
  if (!isValidElement(children)) return children
  return cloneElement(children, {
    disabled: true,
    'aria-disabled': true,
    onClick: undefined,
    className: `${children.props.className || ''} premium-locked-button`.trim(),
  })
}

export default function PremiumGate({
  feature,
  children,
  fallback = null,
  variant = 'content',
  locked,
}) {
  const entitlements = useEntitlements()

  const loading = entitlements.status === 'loading'
  const denied = locked === undefined
    ? !entitlements.hasFeature(feature)
    : Boolean(locked)

  if (!loading && !denied) return children
  if (!loading && fallback) return fallback

  if (variant === 'control') {
    return (
      <div className="premium-lock-control" role="note" aria-label={PREMIUM_LOCK_TEXT}>
        <div className="premium-lock-copy">
          <span className="premium-badge">Premium</span>
          <span>{PREMIUM_LOCK_TEXT}</span>
        </div>
        {disabledControl(children)}
      </div>
    )
  }

  return (
    <section className={`panel premium-gate premium-gate-locked${variant === 'chart' ? ' premium-gate-chart' : ''}`} role="note">
      <span className="premium-badge">Premium</span>
      <strong>{PREMIUM_LOCK_TEXT}</strong>
      <a className="button secondary compact" href="#/pricing">Ver Premium</a>
    </section>
  )
}
