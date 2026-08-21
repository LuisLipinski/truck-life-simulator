import { createContext, useContext, useMemo } from 'react'
import { getGame } from '../config/games.js'

const GameContext = createContext(getGame('ats'))

export function GameProvider({ gameId = 'ats', countryCode = null, children }) {
  const value = useMemo(() => getGame(gameId, countryCode), [countryCode, gameId])
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  return useContext(GameContext)
}
