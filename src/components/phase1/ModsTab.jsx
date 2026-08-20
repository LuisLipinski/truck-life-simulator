const mods = [
  {
    priority: 1,
    title: 'Real Companies, Gas Stations & Billboards',
    text: 'Substitui várias empresas, postos e propagandas fictícias por marcas reais e melhora bastante a ambientação.',
    tip: 'Prioridade alta e baixo risco de conflito com os demais desta lista. É visual e não muda salário, progressão ou regras financeiras.',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2316796205',
    linkLabel: 'Abrir no Steam Workshop',
  },
  {
    priority: 2,
    title: 'Real Traffic Density ATS',
    text: 'Ajusta a densidade do tráfego conforme horários e condições, deixando cidades e rodovias mais movimentadas.',
    tip: 'Use como seu mod principal de densidade de tráfego. Pode exigir mais CPU e reduzir FPS; evite outro mod que altere a mesma densidade.',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1213282672',
    linkLabel: 'Abrir no Steam Workshop',
  },
  {
    priority: 3,
    title: 'Realistic AI Traffic Pack',
    text: 'Adiciona mais variedade e combinações realistas de caminhões, trailers e outros veículos ao tráfego de IA.',
    tip: 'Complementa o Real Traffic Density porque o foco é variedade de veículos, não ser o mod principal de densidade. Se houver conflito com outro pack de IA, mantenha apenas um pack.',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3713185881',
    linkLabel: 'Abrir no Steam Workshop',
  },
  {
    priority: 4,
    title: 'Better Raindrops',
    text: 'Melhora chuva, gotas no para-brisa e a percepção do clima sem interferir na economia da carreira.',
    tip: 'É visual/climático e normalmente pode ficar depois dos mods de tráfego. Confira a compatibilidade com sua versão atual do ATS.',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2980935675',
    linkLabel: 'Abrir no Steam Workshop',
  },
  {
    priority: 5,
    title: 'Mods de som / motor',
    text: 'Um bom mod de som específico para o caminhão usado na carreira pode melhorar muito a imersão da cabine e do motor.',
    tip: 'Deixe por último entre estas sugestões porque depende do modelo de caminhão usado. Se instalar mais de um mod para o mesmo som/motor, escolha apenas um deles.',
    url: 'https://steamcommunity.com/workshop/browse/?appid=270880&searchtext=engine+sound',
    linkLabel: 'Pesquisar sons no Workshop',
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
          <strong className="line-label-with-tip">Ordem recomendada de prioridade <Tip text="A lista abaixo já está ordenada da prioridade 1 para a 5. Ela serve como guia prático para reduzir conflitos entre os mods sugeridos." /></strong>
          <span>Use a ordem mostrada abaixo como referência no Mod Manager. Real Companies primeiro; depois Real Traffic Density; em seguida Realistic AI Traffic Pack; depois Better Raindrops; e por último o mod de som/motor específico do caminhão.</span>
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
