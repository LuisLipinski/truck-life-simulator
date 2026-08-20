const mods = [
  { title: 'Real companies / gas stations / billboards', text: 'Melhora a imersão visual com marcas, empresas, postos e publicidade mais realistas.', tip: 'É uma categoria visual. Não muda salário, progressão ou regras financeiras do Truck Life Simulator.' },
  { title: 'Realistic traffic', text: 'Ajusta densidade e comportamento geral do tráfego para uma experiência mais crível.', tip: 'Pode aumentar dificuldade e tempo de rota. Use com atenção para não gerar conflitos com outros mods de tráfego.' },
  { title: 'Better Raindrops', text: 'Melhora chuva e gotas no para-brisa sem interferir nas regras financeiras da carreira.', tip: 'Mod puramente visual/climático; não precisa alterar nenhum valor dentro do aplicativo.' },
  { title: 'Realistic AI Traffic', text: 'Pode complementar o tráfego, desde que não conflite com outros mods de IA instalados.', tip: 'Evite usar dois mods que alterem a mesma IA de tráfego ao mesmo tempo, pois isso pode causar comportamento estranho ou incompatibilidade.' },
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
        {mods.map((mod) => <article className="panel mod-card" key={mod.title}><h2 className="line-label-with-tip">{mod.title} <Tip text={mod.tip} /></h2><p>{mod.text}</p></article>)}
      </section>
      <section className="panel rule-card">
        <span className="eyebrow">Boa prática</span>
        <h2 className="line-label-with-tip">Teste mudanças de mod com cautela <Tip text="Faça backup antes de mudanças grandes. Mods de mapa e cidades podem alterar rotas e disponibilidade de locais no ATS." /></h2>
        <p>Antes de adicionar ou remover mods importantes, faça um backup da carreira no ATS. Os dados do Truck Life Simulator ficam separados do save do jogo, mas a rota e a disponibilidade de cidades podem mudar com mapas e modificações.</p>
      </section>
    </>
  )
}
