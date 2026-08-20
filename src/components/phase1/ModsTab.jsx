const mods = [
  {
    priority: 1,
    title: 'Sound Fixes Pack',
    text: 'Melhora sons gerais do ATS, como suspensão, pneus, postos, ambiente, acoplamento de trailer, buzinas e vários detalhes de imersão.',
    tip: 'Este mod deve ficar com prioridade alta no Mod Manager. O autor recomenda colocá-lo acima de mods de chuva, tráfego de IA e mapas. Ele não substitui os sons individuais do caminhão, então pode ser usado junto com um mod específico de motor.',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=830663438',
    linkLabel: 'Abrir no Steam Workshop',
  },
  {
    priority: 2,
    title: 'Cummins Signature Gen II Sounds',
    text: 'Opção atual de som de motor para quem quiser usar um Cummins Signature Gen II, com versões straight pipe e sport mufflers.',
    tip: 'É uma sugestão específica de motor, não obrigatória. Use apenas se o caminhão/motor da sua carreira for compatível e confira a versão suportada na página do Workshop antes de ativar.',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3536394213',
    linkLabel: 'Abrir no Steam Workshop',
  },
  {
    priority: 3,
    title: 'Real Companies, Gas Stations & Billboards',
    text: 'Substitui várias empresas, postos e propagandas fictícias por marcas reais e melhora bastante a ambientação.',
    tip: 'Baixo risco de conflito com os demais desta lista. É visual e não muda salário, progressão ou regras financeiras.',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2316796205',
    linkLabel: 'Abrir no Steam Workshop',
  },
  {
    priority: 4,
    title: 'Real Traffic Density ATS',
    text: 'Ajusta a densidade do tráfego conforme horários e condições, deixando cidades e rodovias mais movimentadas.',
    tip: 'Use como seu mod principal de densidade de tráfego. Pode exigir mais CPU e reduzir FPS; evite outro mod que altere a mesma densidade.',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1213282672',
    linkLabel: 'Abrir no Steam Workshop',
  },
  {
    priority: 5,
    title: 'Realistic AI Traffic Pack',
    text: 'Adiciona mais variedade e combinações realistas de caminhões, trailers e outros veículos ao tráfego de IA.',
    tip: 'Complementa o Real Traffic Density porque o foco é variedade de veículos, não ser o mod principal de densidade. Se houver conflito com outro pack de IA, mantenha apenas um pack.',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3713185881',
    linkLabel: 'Abrir no Steam Workshop',
  },
  {
    priority: 6,
    title: 'Better Raindrops',
    text: 'Melhora chuva, gotas no para-brisa e a percepção do clima sem interferir na economia da carreira.',
    tip: 'É visual/climático. Como o Sound Fixes Pack pede prioridade maior que mods de chuva, mantenha o Better Raindrops abaixo dele no Mod Manager.',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2980935675',
    linkLabel: 'Abrir no Steam Workshop',
  },
]

function Tip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}

export default function ModsTab() {
  return (
    <>
      <section className="panel rules-intro">
        <span className="eyebrow">Steam Workshop</span>
        <h2 className="line-label-with-tip">Mods sugeridos <Tip text="São sugestões para aumentar a imersão. Nenhum mod desta lista é obrigatório para usar a carreira." /></h2>
        <p>Estas categorias são voltadas à imersão e não fazem parte da lógica financeira do Truck Life Simulator.</p>
        <div className="notice-box">
          <strong className="line-label-with-tip">Ordem recomendada no Mod Manager <Tip text="A numeração representa a ordem sugerida de cima para baixo no Mod Manager. O Sound Fixes Pack fica acima dos mods de chuva e tráfego de IA, conforme orientação do próprio mod." /></strong>
          <span>1. Sound Fixes Pack → 2. som de motor específico → 3. Real Companies → 4. Real Traffic Density → 5. Realistic AI Traffic Pack → 6. Better Raindrops.</span>
        </div>
        <div className="notice-box"><strong className="line-label-with-tip">Evite mods de economia <Tip text="O aplicativo já possui sua própria economia. Mods que mudam pagamento de fretes, salários ou XP podem deixar o roleplay inconsistente." /></strong><span>O aplicativo usa uma economia própria de carreira. Mods que alteram pagamento de fretes, salários ou progressão econômica podem atrapalhar o roleplay.</span></div>
      </section>

      <section className="mods-grid">
        {mods.map((mod) => (
          <article className="panel mod-card" key={mod.title}>
            <span className="eyebrow">Prioridade {mod.priority}</span>
            <h2 className="line-label-with-tip">{mod.title} <Tip text={mod.tip} /></h2>
            <p>{mod.text}</p>
            <a className="button secondary mod-workshop-link" href={mod.url} target="_blank" rel="noreferrer">{mod.linkLabel}</a>
          </article>
        ))}
      </section>

      <section className="panel rule-card">
        <span className="eyebrow">Boa prática</span>
        <h2 className="line-label-with-tip">Teste mudanças de mod com cautela <Tip text="Faça backup antes de mudanças grandes. Mods de mapa e cidades podem alterar rotas e disponibilidade de locais no ATS." /></h2>
        <p>Antes de adicionar ou remover mods importantes, faça um backup da carreira no ATS. Os dados do Truck Life Simulator ficam separados do save do jogo, mas a rota e a disponibilidade de cidades podem mudar com mapas e modificações.</p>
      </section>
    </>
  )
}
