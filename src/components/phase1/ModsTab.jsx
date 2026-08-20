const mods = [
  { title: 'Real companies / gas stations / billboards', text: 'Melhora a imersão visual com marcas, empresas, postos e publicidade mais realistas.' },
  { title: 'Realistic traffic', text: 'Ajusta densidade e comportamento geral do tráfego para uma experiência mais crível.' },
  { title: 'Better Raindrops', text: 'Melhora chuva e gotas no para-brisa sem interferir nas regras financeiras da carreira.' },
  { title: 'Realistic AI Traffic', text: 'Pode complementar o tráfego, desde que não conflite com outros mods de IA instalados.' },
]

export default function ModsTab() {
  return (
    <>
      <section className="panel rules-intro">
        <span className="eyebrow">Steam Workshop</span>
        <h2>Mods sugeridos</h2>
        <p>Estas categorias são voltadas à imersão e não fazem parte da lógica financeira do Truck Life Simulator.</p>
        <div className="notice-box"><strong>Evite mods de economia</strong><span>O aplicativo usa uma economia própria de carreira. Mods que alteram pagamento de fretes, salários ou progressão econômica podem atrapalhar o roleplay.</span></div>
      </section>
      <section className="mods-grid">
        {mods.map((mod) => <article className="panel mod-card" key={mod.title}><h2>{mod.title}</h2><p>{mod.text}</p></article>)}
      </section>
      <section className="panel rule-card">
        <span className="eyebrow">Boa prática</span>
        <h2>Teste mudanças de mod com cautela</h2>
        <p>Antes de adicionar ou remover mods importantes, faça um backup da carreira no ATS. Os dados do Truck Life Simulator ficam separados do save do jogo, mas a rota e a disponibilidade de cidades podem mudar com mapas e modificações.</p>
      </section>
    </>
  )
}
