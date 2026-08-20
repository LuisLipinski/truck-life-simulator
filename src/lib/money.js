export function toCents(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return NaN
  return Math.round((number + Number.EPSILON) * 100)
}

export function fromCents(value) {
  return Number(value || 0) / 100
}

export function transferFromReserve({ balance, reserve, amount }) {
  const amountCents = toCents(amount)
  const reserveCents = toCents(reserve)
  const balanceCents = toCents(balance)

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { ok: false, reason: 'invalid_amount' }
  }
  if (!Number.isFinite(reserveCents) || reserveCents < 0) {
    return { ok: false, reason: 'invalid_reserve' }
  }
  if (!Number.isFinite(balanceCents)) {
    return { ok: false, reason: 'invalid_balance' }
  }
  if (amountCents > reserveCents) {
    return { ok: false, reason: 'insufficient_reserve' }
  }

  return {
    ok: true,
    amount: fromCents(amountCents),
    balance: fromCents(balanceCents + amountCents),
    reserve: fromCents(reserveCents - amountCents),
  }
}

export function transferToReserve({ balance, reserve, amount }) {
  const amountCents = toCents(amount)
  const reserveCents = toCents(reserve)
  const balanceCents = toCents(balance)

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { ok: false, reason: 'invalid_amount' }
  }
  if (!Number.isFinite(reserveCents) || reserveCents < 0) {
    return { ok: false, reason: 'invalid_reserve' }
  }
  if (!Number.isFinite(balanceCents)) {
    return { ok: false, reason: 'invalid_balance' }
  }
  if (amountCents > balanceCents) {
    return { ok: false, reason: 'insufficient_balance' }
  }

  return {
    ok: true,
    amount: fromCents(amountCents),
    balance: fromCents(balanceCents - amountCents),
    reserve: fromCents(reserveCents + amountCents),
  }
}
