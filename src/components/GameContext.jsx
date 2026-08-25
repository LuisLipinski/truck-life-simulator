import { createContext, useContext, useMemo } from 'react'
import { getGame } from '../config/games.js'

const GameContext = createContext(getGame('ats'))

export function GameProvider({ gameId = 'ats', countryCode = null, stateCode = null, currencyCode = null, exchangeRate = null, exchangeRateAsOf = null, city = '', cityCostFactor = null, citySalaryFactor = null, cityMarketLabel = null, children }) {
  const value = useMemo(
    () => getGame(gameId, gameId === 'ets2' ? countryCode : stateCode, currencyCode, exchangeRate, exchangeRateAsOf, city, cityCostFactor, citySalaryFactor, cityMarketLabel),
    [city, cityCostFactor, cityMarketLabel, citySalaryFactor, countryCode, currencyCode, exchangeRate, exchangeRateAsOf, gameId, stateCode],
  )
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  return useContext(GameContext)
}
