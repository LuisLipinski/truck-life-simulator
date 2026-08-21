import { useGame } from '../GameContext.jsx'

function Tip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}

export default function ModsTab() {
  const game = useGame()
  return (
    <>
      <section className="panel rules-intro" data-tour="mods">
        <span className="eyebrow">Steam Workshop • {game.shortName}</span>
        <h2 className="line-label-with-tip">Mods sugeridos <Tip text={`Todos os links abaixo estão filtrados para o Workshop do ${game.name}.`} /></h2>
        <p>As categorias aumentam a imersão e não fazem parte da lógica financeira do Truck Life Simulator. Confira sempre a versão suportada e as dependências na página do mod.</p>
        <div className="notice-box"><strong className="line-label-with-tip">Ordem recomendada <Tip text="Leia a descrição de cada mod: o autor pode exigir posição específica no Mod Manager." /></strong><span>Sons gerais → som do caminhão → empresas → tráfego → clima → mapas. Use apenas um mod principal para cada sistema.</span></div>
        <div className="notice-box"><strong className="line-label-with-tip">Evite mods de economia <Tip text="O aplicativo já calcula salários, qualificações, impostos e progressão." /></strong><span>Mods que alteram pagamento, salário ou XP podem deixar o roleplay inconsistente com esta carreira.</span></div>
        <a className="button secondary mod-workshop-link" href={game.workshopUrl} target="_blank" rel="noreferrer">Abrir o Workshop oficial de {game.shortName}</a>
      </section>

      <section className="mods-grid">
        {game.mods.map(([title, text, url], index) => (
          <article className="panel mod-card" key={title}>
            <span className="eyebrow">Prioridade {index + 1}</span>
            <h2 className="line-label-with-tip">{title} <Tip text={`Busca limitada ao aplicativo ${game.name} (Steam app ${game.id === 'ats' ? '270880' : '227300'}). Verifique compatibilidade antes de assinar.`} /></h2>
            <p>{text}</p>
            <a className="button secondary mod-workshop-link" href={url} target="_blank" rel="noreferrer">Pesquisar no Workshop de {game.shortName}</a>
          </article>
        ))}
      </section>

      <section className="panel rule-card">
        <span className="eyebrow">Boa prática</span>
        <h2 className="line-label-with-tip">Teste mudanças de mod com cautela <Tip text={`Faça backup antes de alterações grandes. Mods de mapa podem mudar rotas e cidades no ${game.shortName}.`} /></h2>
        <p>Faça backup do perfil dentro do {game.shortName} e exporte também a carreira desta aplicação. O save do jogo e os dados do Truck Life Simulator são separados.</p>
      </section>
    </>
  )
}
