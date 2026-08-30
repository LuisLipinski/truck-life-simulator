import { Fragment, useCallback, useEffect, useState } from 'react'
import { careerApi } from '../../lib/careerApi.js'
import {
  CAREER_IMPORT_ASSOCIATION_UPDATED_EVENT,
  listCompletedCareerImportAssociations,
} from '../../lib/careerMigration.js'
import {
  clearServerCareerState,
  markServerCareerUnavailable,
  replaceServerCareerBindings,
  setServerCareerEvents,
  setServerCareerSnapshot,
} from '../../lib/careerServerState.js'
import { CAREER_UPDATED_EVENT, getActiveCareerId } from '../../lib/storage.js'
import { useAuth } from './AuthProvider.jsx'

export default function CareerServerProvider({ children }) {
  const auth = useAuth()
  const [revision, setRevision] = useState(0)

  const sync = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.user?.id) {
      clearServerCareerState()
      setRevision((value) => value + 1)
      return
    }

    const associations = listCompletedCareerImportAssociations(auth.user.id)
    replaceServerCareerBindings(associations)
    getActiveCareerId('ats')
    getActiveCareerId('ets2')

    await Promise.all(associations.map(async (association) => {
      try {
        const career = await careerApi.get(association.gameId, association.serverCareerId)
        setServerCareerSnapshot(association.gameId, association.sourceCareerId, career)
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

  return <Fragment key={revision}>{children}</Fragment>
}
