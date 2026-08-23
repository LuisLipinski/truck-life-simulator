import { useState } from 'react'
import { useAuth } from './AuthProvider.jsx'

function formatInstant(value) {
  if (!value) return 'Ainda não registrado'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function roleLabel(role) {
  if (role === 'ADMIN') return 'Administrador'
  return 'Usuário'
}

export default function AccountPage() {
  const auth = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const user = auth.user

  async function signOut() {
    setSigningOut(true)
    setFeedback(null)
    try {
      await auth.logout()
      window.location.hash = '#/'
    } catch {
      setFeedback('A sessão foi removida deste dispositivo, mas não foi possível confirmar o logout no servidor. Tente novamente quando a API estiver disponível.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="page-shell form-shell">
      <a className="back-link" href="#/">← Voltar ao simulador</a>
      <section className="page-heading centered">
        <span className="eyebrow">Conta Truck Life Simulator</span>
        <h1>Minha Conta</h1>
        <p>Confira os dados vinculados à sua sessão. As carreiras continuam salvas localmente nesta etapa.</p>
      </section>

      {feedback && <div className="auth-feedback auth-feedback-error" role="alert"><span className="auth-feedback-icon">!</span><div><strong>Logout não confirmado</strong><p>{feedback}</p></div></div>}

      <section className="panel">
        <div className="summary-grid">
          <div><span>Nome</span><strong>{user?.displayName || 'Não informado'}</strong></div>
          <div><span>E-mail</span><strong>{user?.email || 'Não informado'}</strong></div>
          <div><span>Perfil</span><strong>{roleLabel(user?.role)}</strong></div>
          <div><span>Status</span><strong>{user?.status === 'ACTIVE' ? 'Ativa' : user?.status || 'Não informado'}</strong></div>
          <div><span>E-mail verificado</span><strong>{user?.emailVerified ? 'Sim' : 'Não'}</strong></div>
          <div><span>Conta criada</span><strong>{formatInstant(user?.createdAt)}</strong></div>
          <div><span>Último login</span><strong>{formatInstant(user?.lastLoginAt)}</strong></div>
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">Sessão</span>
        <h2>Segurança da conta</h2>
        <p>O token de acesso fica somente na memória do aplicativo. O refresh token permanece protegido em cookie seguro e não é salvo no armazenamento local.</p>
        <div className="action-row">
          <button className="button secondary" type="button" onClick={signOut} disabled={signingOut}>
            {signingOut ? 'Saindo…' : 'Sair da conta'}
          </button>
        </div>
      </section>
    </main>
  )
}
