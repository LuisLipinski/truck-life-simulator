const mods = [
  {
    title: 'Real Companies, Gas Stations & Billboards',
    text: 'Substitui várias empresas, postos e propagandas fictícias por marcas reais e melhora bastante a ambientação.',
    tip: 'É um mod visual. Não muda salário, progressão ou regras financeiras do Truck Life Simulator.',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2316796205',
    linkLabel: 'Abrir no Steam Workshop',
  },
  {
    title: 'Real Traffic Density ATS',
    text: 'Ajusta a densidade do tráfego conforme horários e condições, deixando cidades e rodovias mais movimentadas.',
    tip: 'Pode exigir mais CPU e reduzir FPS. Evite combinar com outro mod principal de densidade de tráfego.',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1213282672',
    linkLabel: 'Abrir no Steam Workshop',
  },
  {
    title: 'More Realistic Traffic',
    text: 'Alternativa para comportamento e distribuição de tráfego mais natural. Use apenas um mod principal de tráfego por vez.',
    tip: 'A página específica que existia foi marcada pela Steam como removida/incompatível. O botão abre a busca do Workshop para você conferir alternativas compatíveis com sua versão do ATS.',
    url: 'https://steamcommunity.com/workshop/browse/?appid=270880&searchtext=More+realistic+traffic',
    linkLabel: 'Pesquisar no Steam Workshop',
  },
  {
    title: 'Better Raindrops',
    text: 'Melhora chuva, gotas no para-brisa e a percepção do clima sem interferir na economia da carreira.',
    tip: 'Mod visual/climático. Confira a compatibilidade com o caminhão e a versão atual do ATS antes de ativar.',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2980935675',
    linkLabel: 'Abrir no Steam Workshop',
  },
  {
    title: 'Realistic AI Traffic Pack',
    text: 'Adiciona mais variedade e combinações realistas de caminhões, trailers e outros veículos ao tráfego de IA.',
    tip: 'É voltado à variedade visual do tráfego. Ainda assim, confira conflitos com outros packs de IA antes de usar.',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3713185881',
    linkLabel: 'Abrir no Steam Workshop',
  },
  {
    title: 'Mods de som / motor',
    text: 'Um bom mod de som específico para o caminhão usado na carreira pode melhorar muito a imersão da cabine e do motor.',
    tip: 'Como o melhor mod depende do modelo de caminhão e da versão do ATS, este botão abre uma busca em vez de indicar um único pacote.',
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
        <div className="notice-box"><strong className="line-label-with-tip">Evite mods de economia <Tip text="O aplicativo já possui sua própria economia. Mods que mudam pagamento de fretes, salários ou XP podem deixar o roleplay inconsistente." /></strong><span>O aplicativo usa uma economia própria de carreira. Mods que alteram pagamento de fretes, salários ou progressão econômica podem atrapalhar o roleplay.</span></div>
      </section>

      <section className="mods-grid">
        {mods.map((mod) => (
          <article className="panel mod-card" key={mod.title}>
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
