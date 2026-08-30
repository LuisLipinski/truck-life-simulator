export * from './phase1Local.js'

import { getCareer } from './storage.js'
import { applyServerTripsToPhase1State } from './careerServerState.js'
import {
  loadPhase1State as loadLocalPhase1State,
  savePhase1State as saveLocalPhase1State,
} from './phase1Local.js'

export function loadPhase1State(careerId, gameId = 'ats') {
  const localState = loadLocalPhase1State(careerId, gameId)
  const career = getCareer(careerId, gameId)
  return applyServerTripsToPhase1State(localState, career, gameId)
}

export function savePhase1State(careerId, state, gameId = 'ats') {
  const career = getCareer(careerId, gameId)
  if (!career?.serverBacked || career.serverTripsStatus !== 'ready') {
    saveLocalPhase1State(careerId, state, gameId)
    return
  }

  const localBackup = loadLocalPhase1State(careerId, gameId)
  saveLocalPhase1State(careerId, {
    ...state,
    trips: localBackup.trips,
    currentWeek: localBackup.currentWeek,
  }, gameId)
}
