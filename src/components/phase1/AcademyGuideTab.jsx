const modules = [
  {
    level: 'Nível 2',
    goal: '10.000 milhas',
    title: 'Truck Driving Proficiency',
    version: 'Disponível no ATS desde a versão 1.55',
    text: 'É o módulo avançado usado pela carreira para validar a passagem do motorista local para Company Driver / OTR. Os cenários testam precisão, controle do caminhão e execução de manobras mais exigentes.',
    careerRule: 'No Truck Life Simulator, conclua o módulo e depois confirme a conclusão na tela Qualificações. A taxa fictícia da promoção é de US$ 300.',
    image: 'https://img.youtube.com/vi/jXEfpl0jWM0/maxresdefault.jpg',
    official: 'https://blog.scssoft.com/2025/06/american-truck-simulator-155-update.html',
  },
  {
    level: 'Nível 3',
    goal: '50.000 milhas totais',
    title: 'Double Trailer Handling',
    version: 'Disponível no ATS desde a versão 1.58',
    text: 'Este módulo é focado em condução, manobras e ré com dois trailers. Ele prepara a carreira para operações avançadas com Doubles.',
    careerRule: 'No Truck Life Simulator, conclua o módulo e depois confirme a conclusão na tela Qualificações. A taxa fictícia da promoção é de US$ 59.',
    image: 'https://img.youtube.com/vi/WS_aCxiCdgM/maxresdefault.jpg',
    official: 'https://blog.scssoft.com/2026/02/american-truck-simulator-158-update.html',
  },
]

export default function AcademyGuideTab({ onOpenQualifications }) {
  return (
    <div className="academy-guide">
      <section className="panel academy-guide-hero" data-tour="academy">
        <div>
          <span className="eyebrow">American Truck Simulator</span>
          <h2>O que é o Driving Academy?</h2>
          <p>Driving Academy é um módulo separado do modo normal de fretes do ATS. Ele reúne cenários de treinamento para direção, controle do caminhão, estacionamento e manobras. Nesta carreira, alguns módulos funcionam como prova prática antes das promoções.</p>
        </div>
        <div className="academy-access-card">
          <span className="metric-label">Como acessar no jogo</span>
          <ol>
            <li>Abra o American Truck Simulator.</li>
            <li>Na tela principal, entre em <strong>Driving Academy</strong>.</li>
            <li>Escolha o módulo exigido pela sua promoção.</li>
            <li>Conclua os cenários usando o mesmo perfil do ATS que você usa na carreira.</li>
            <li>Volte ao Truck Life Simulator e confirme a conclusão em <strong>Qualificações</strong>.</li>
          </ol>
        </div>
      </section>

      <section className="academy-module-grid">
        {modules.map((module) => (
          <article className="panel academy-module-card" key={module.level}>
            <div className="academy-module-image" style={{ backgroundImage: `linear-gradient(180deg,rgba(2,6,23,.08),rgba(2,6,23,.88)),url(${module.image})` }}>
              <span className="academy-level-pill">{module.level}</span>
              <div><span>{module.goal}</span><h3>{module.title}</h3></div>
            </div>
            <div className="academy-module-body">
              <span className="eyebrow">{module.version}</span>
              <p>{module.text}</p>
              <div className="notice-box"><strong>Regra da carreira</strong><span>{module.careerRule}</span></div>
              <a className="button secondary academy-official-link" href={module.official} target="_blank" rel="noreferrer">Ver anúncio oficial da SCS</a>
            </div>
          </article>
        ))}
      </section>

      <section className="panel academy-guide-footer">
        <div><span className="eyebrow">Próximo passo</span><h2>Terminou o treinamento?</h2><p>Abra Qualificações, marque a confirmação correspondente e conclua a promoção quando os outros requisitos estiverem prontos.</p></div>
        <button className="button primary" type="button" onClick={onOpenQualifications}>Ir para Qualificações</button>
      </section>
    </div>
  )
}
