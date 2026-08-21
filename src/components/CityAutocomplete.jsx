import { useMemo, useRef, useState } from 'react'
import { ATS_CITIES, normalizeCitySearch } from '../data/atsCities.js'

export default function CityAutocomplete({ value, onChange, placeholder = 'Digite para pesquisar uma cidade...', label = 'Cidade', required = false }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const blurTimer = useRef(null)
  const raw = String(value || '').trim()
  const query = normalizeCitySearch(raw)

  const matches = useMemo(() => {
    const unique = [...new Set(ATS_CITIES)]
    if (!query) return unique.sort((a, b) => a.localeCompare(b))
    return unique.filter((city) => normalizeCitySearch(city).includes(query)).sort((a, b) => a.localeCompare(b))
  }, [query])

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
      <label>{label}</label>
      <div className="react-city-autocomplete">
        <input
          value={value}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 120) }}
          onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(-1) }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="city-arrow"
          aria-label={open ? 'Fechar lista de cidades' : 'Abrir lista de cidades'}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => { setOpen((current) => !current); setActive(-1) }}
        >▾</button>
        {open && (
          <div className="react-city-results" role="listbox">
            <div className="react-city-results-header">{raw ? `${matches.length} cidade(s) encontrada(s)` : 'Todas as cidades'}</div>
            {matches.map((city, index) => (
              <button
                type="button"
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
                role="option"
                className={`react-city-option manual${matches.length === active ? ' active' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(matches.length)}
                onClick={() => choose(raw)}
              >＋ Adicionar manualmente: “{raw}”</button>
            )}
          </div>
        )}
      </div>
      <small>Digite para pesquisar, use a seta para ver todas ou informe manualmente uma cidade de mod.</small>
    </div>
  )
}
