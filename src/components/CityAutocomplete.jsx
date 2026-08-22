import { useId, useMemo, useRef, useState } from 'react'
import { normalizeCitySearch } from '../data/atsCities.js'
import { useGame } from './GameContext.jsx'

export default function CityAutocomplete({ value, onChange, placeholder = 'Digite para pesquisar uma cidade...', label = 'Cidade', required = false, cities = null, disabled = false, hint = '' }) {
  const game = useGame()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const blurTimer = useRef(null)
  const inputId = useId()
  const listboxId = useId()
  const raw = String(value || '').trim()
  const query = normalizeCitySearch(raw)

  const matches = useMemo(() => {
    const unique = [...new Set(cities || game.cities)]
    if (!query) return unique.sort((a, b) => a.localeCompare(b))
    return unique.filter((city) => normalizeCitySearch(city).includes(query)).sort((a, b) => a.localeCompare(b))
  }, [cities, game.cities, query])

  const showManual = Boolean(raw && matches.length === 0)
  const options = showManual ? [...matches, raw] : matches

  function choose(city) {
    onChange(city)
    setOpen(false)
    setActive(-1)
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false)
      setActive(-1)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        setActive(0)
      } else if (options.length) {
        setActive((current) => (current + 1 + options.length) % options.length)
      }
      return
    }
    if (event.key === 'ArrowUp' && open && options.length) {
      event.preventDefault()
      setActive((current) => (current - 1 + options.length) % options.length)
      return
    }
    if (event.key === 'Enter' && open && active >= 0 && options[active]) {
      event.preventDefault()
      choose(options[active])
    }
  }

  return (
    <div className="city-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="react-city-autocomplete">
        <input
          id={inputId}
          value={value}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={open && active >= 0 ? `${listboxId}-option-${active}` : undefined}
          onFocus={() => { if (!disabled) setOpen(true) }}
          onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 120) }}
          onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(-1) }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="city-arrow"
          aria-label={open ? 'Fechar lista de cidades' : 'Abrir lista de cidades'}
          onMouseDown={(event) => event.preventDefault()}
          disabled={disabled}
          onClick={() => { setOpen((current) => !current); setActive(-1) }}
        >▾</button>
        {open && (
          <div className="react-city-results" id={listboxId} role="listbox">
            <div className="react-city-results-header">{raw ? `${matches.length} cidade(s) encontrada(s)` : 'Todas as cidades'}</div>
            {matches.map((city, index) => (
              <button
                type="button"
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={index === active}
                className={`react-city-option${index === active ? ' active' : ''}`}
                key={city}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(city)}
              >{city}</button>
            ))}
            {showManual && (
              <button
                type="button"
                id={`${listboxId}-option-${matches.length}`}
                role="option"
                aria-selected={matches.length === active}
                className={`react-city-option manual${matches.length === active ? ' active' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(matches.length)}
                onClick={() => choose(raw)}
              >＋ Adicionar manualmente: “{raw}”</button>
            )}
          </div>
        )}
      </div>
      <small>{hint || `${(cities || game.cities).length} cidades de ${game.shortName}; pesquise na lista ou informe manualmente uma cidade de mod.`}</small>
    </div>
  )
}
