import { createContext, useContext, useMemo } from 'react'
import { getGame } from '../config/games.js'

const GameContext = createContext(getGame('ats'))

export function GameProvider({ gameId = 'ats', countryCode = null, currencyCode = null, exchangeRate = null, exchangeRateAsOf = null, children }) {
  const value = useMemo(
    () => getGame(gameId, countryCode, currencyCode, exchangeRate, exchangeRateAsOf),
    [countryCode, currencyCode, exchangeRate, exchangeRateAsOf, gameId],
  )
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  return useContext(GameContext)
}
