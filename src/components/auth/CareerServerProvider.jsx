import { Fragment, useCallback, useEffect, useState } from 'react'
import { careerApi } from '../../lib/careerApi.js'
import {
  CAREER_IMPORT_ASSOCIATION_UPDATED_EVENT,
  listCompletedCareerImportAssociations,
} from '../../lib/careerMigration.js'
import {
  clearServerCareerState,
  markServerCareerTripsUnavailable,
  markServerCareerUnavailable,
  replaceServerCareerBindings,
  setServerCareerEvents,
  setServerCareerSnapshot,
  setServerCareerTrips,
} from '../../lib/careerServerState.js'
import { tripApi } from '../../lib/tripApi.js'
import { CAREER_UPDATED_EVENT, getActiveCareerId } from '../../lib/storage.js'
import { useAuth } from './AuthProvider.jsx'

function associationSyncKey(userId, associations) {
  if (!userId || !associations.length) return null
  const bindings = associations
    .map((association) => `${association.gameId}:${association.sourceCareerId}:${association.serverCareerId}`)
    .sort()
    .join('|')
  return `${userId}:${bindings}`
}

function ServerCareerHydrationGate() {
  return (
    <div className="backend-loading-overlay" role="status" aria-live="polite" aria-label="Sincronizando carreira">
      <div className="backend-loading-card">
        <span className="eyebrow">Carreira conectada</span>
        <h2>Sincronizando com o servidor…</h2>
        <p>Aguarde a confirmação do backend antes de continuar. O backup local não será usado como fallback durante esta sincronização.</p>
      </div>
    </div>
  )
}

export default function CareerServerProvider({ children }) {
  const auth = useAuth()
  const [revision, setRevision] = useState(0)
  const [readyKey, setReadyKey] = useState(null)

  const authenticatedUserId = auth.isAuthenticated && auth.user?.id ? String(auth.user.id) : ''
  const currentAssociations = authenticatedUserId
    ? listCompletedCareerImportAssociations(authenticatedUserId)
    : []
  const currentSyncKey = associationSyncKey(authenticatedUserId, currentAssociations)
  const waitingForServerCareer = Boolean(currentSyncKey && readyKey !== currentSyncKey)

  const sync = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.user?.id) {
      clearServerCareerState()
      setReadyKey(null)
      setRevision((value) => value + 1)
      return
    }

    const userId = String(auth.user.id)
    const associations = listCompletedCareerImportAssociations(userId)
    const syncKey = associationSyncKey(userId, associations)

    if (syncKey) setReadyKey(null)

    replaceServerCareerBindings(associations)
    getActiveCareerId('ats')
    getActiveCareerId('ets2')

    await Promise.all(associations.map(async (association) => {
      try {
        const career = await careerApi.get(association.gameId, association.serverCareerId)
        setServerCareerSnapshot(association.gameId, association.sourceCareerId, career)

        try {
          const trips = await tripApi.list(association.gameId, association.serverCareerId)
          setServerCareerTrips(association.gameId, association.sourceCareerId, trips)
        } catch {
          markServerCareerTripsUnavailable(association.gameId, association.sourceCareerId)
        }

        try {
          const events = await careerApi.events(association.gameId, association.serverCareerId)
          setServerCareerEvents(association.gameId, association.sourceCareerId, events)
        } catch {
          // O perfil server-side continua válido; o histórico será tentado novamente no próximo sync.
        }
      } catch {
        markServerCareerUnavailable(association.gameId, association.sourceCareerId)
      }
    }))

    setReadyKey(syncKey)
    setRevision((value) => value + 1)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CAREER_UPDATED_EVENT, { detail: { source: 'server-sync' } }))
    }
  }, [auth.isAuthenticated, auth.user?.id])

  useEffect(() => {
    sync()
  }, [sync])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onAssociationUpdated = (event) => {
      if (String(event.detail?.userId || '') === String(auth.user?.id || '')) sync()
    }
    window.addEventListener(CAREER_IMPORT_ASSOCIATION_UPDATED_EVENT, onAssociationUpdated)
    return () => window.removeEventListener(CAREER_IMPORT_ASSOCIATION_UPDATED_EVENT, onAssociationUpdated)
  }, [auth.user?.id, sync])

  if (waitingForServerCareer) return <ServerCareerHydrationGate />

  return <Fragment key={revision}>{children}</Fragment>
}
