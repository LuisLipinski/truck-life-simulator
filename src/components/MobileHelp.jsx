import { useEffect, useState } from 'react'

export default function MobileHelp() {
  const [text, setText] = useState('')

  useEffect(() => {
    function handleClick(event) {
      if (!window.matchMedia('(max-width: 760px)').matches) return
      const tip = event.target.closest?.('.react-info-tip')
      if (!tip) return
      const message = tip.getAttribute('data-tip') || tip.getAttribute('title') || ''
      if (message) {
        event.preventDefault()
        setText(message)
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  if (!text) return null

  return (
    <div className="mobile-help-layer" role="presentation" onClick={() => setText('')}>
      <section className="mobile-help-sheet" role="dialog" aria-modal="true" aria-label="Ajuda" onClick={(event) => event.stopPropagation()}>
        <div className="mobile-help-handle" />
        <button className="mobile-help-close" type="button" aria-label="Fechar ajuda" onClick={() => setText('')}>×</button>
        <span className="eyebrow">Ajuda</span>
        <p>{text}</p>
      </section>
    </div>
  )
}
