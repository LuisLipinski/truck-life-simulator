import { formatDistance, formatMoney } from '../../config/games.js'
import { useGame } from '../GameContext.jsx'

export default function AcademyGuideTab({ onOpenQualifications }) {
  const game = useGame()
  return (
    <div className="academy-guide">
      <section className="panel academy-guide-hero" data-tour="academy">
        <div>
          <span className="eyebrow">{game.name}</span>
          <h2>O que é o Driving Academy?</h2>
          <p>Driving Academy é um módulo separado dos fretes de {game.shortName}. Ele reúne cenários de direção, controle do caminhão, estacionamento e manobras. Nesta carreira, módulos oficiais funcionam como provas práticas antes das promoções.</p>
        </div>
        <div className="academy-access-card">
          <span className="metric-label">Como acessar no jogo</span>
          <ol>
            <li>Abra o {game.name}.</li>
            <li>Na tela principal, entre em <strong>Driving Academy</strong>.</li>
            <li>Escolha o módulo exigido pela promoção.</li>
            <li>Conclua os cenários usando o mesmo perfil de {game.shortName} da carreira.</li>
            <li>Volte ao Truck Life Simulator e confirme em <strong>Qualificações</strong>.</li>
          </ol>
        </div>
      </section>

      <section className="academy-module-grid">
        {game.academyModules.map((module) => (
          <article className="panel academy-module-card" key={module.level}>
            <div className="academy-module-image" style={{ backgroundImage: `linear-gradient(180deg,rgba(2,6,23,.08),rgba(2,6,23,.88)),url(${game.image})` }}>
              <span className="academy-level-pill">{module.level}</span>
              <div><span>{formatDistance(module.goal, game, true)}</span><h3>{module.title}</h3></div>
            </div>
            <div className="academy-module-body">
              <span className="eyebrow">{module.version}</span>
              <p>{module.text}</p>
              <div className="notice-box"><strong>Regra da carreira</strong><span>Conclua o módulo, confirme em Qualificações e pague a taxa fictícia de {formatMoney(module.cost, game)}.</span></div>
              <a className="button secondary academy-official-link" href={module.official} target="_blank" rel="noreferrer">Ver anúncio oficial da SCS</a>
            </div>
          </article>
        ))}
      </section>

      <section className="panel academy-guide-footer">
        <div><span className="eyebrow">Próximo passo</span><h2>Terminou o treinamento?</h2><p>Abra Qualificações, marque a confirmação correspondente e conclua a promoção quando os demais requisitos estiverem prontos.</p></div>
        <button className="button primary" type="button" onClick={onOpenQualifications}>Ir para Qualificações</button>
      </section>
    </div>
  )
}
