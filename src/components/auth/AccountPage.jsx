import { useState } from 'react'
import { ApiProblemError, authApi } from '../../lib/authApi.js'
import { useAuth } from './AuthProvider.jsx'
import CareerMigrationPanel from './CareerMigrationPanel.jsx'

const PASSWORD_MIN_LENGTH = 12
const PASSWORD_MAX_LENGTH = 128

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

function passwordLengthIsValid(value) {
  return Array.from(value).length >= PASSWORD_MIN_LENGTH && Array.from(value).length <= PASSWORD_MAX_LENGTH
}

export default function AccountPage() {
  const auth = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [logoutFeedback, setLogoutFeedback] = useState(null)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState(null)
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmation: '',
  })
  const user = auth.user

  function updatePasswordField(field, value) {
    setPasswords((current) => ({ ...current, [field]: value }))
    setPasswordFeedback(null)
  }

  async function changePassword(event) {
    event.preventDefault()
    setPasswordFeedback(null)

    if (!passwordLengthIsValid(passwords.currentPassword)) {
      setPasswordFeedback({ type: 'error', message: 'A senha atual deve ter entre 12 e 128 caracteres.' })
      return
    }
    if (!passwordLengthIsValid(passwords.newPassword)) {
      setPasswordFeedback({ type: 'error', message: 'A nova senha deve ter entre 12 e 128 caracteres.' })
      return
    }
    if (passwords.newPassword !== passwords.confirmation) {
      setPasswordFeedback({ type: 'error', message: 'A confirmação precisa ser igual à nova senha.' })
      return
    }

    setChangingPassword(true)
    try {
      await authApi.changePassword(passwords.currentPassword, passwords.newPassword)
      setPasswords({ currentPassword: '', newPassword: '', confirmation: '' })
      setPasswordFeedback({
        type: 'success',
        message: 'Senha alterada. Você continua conectado nesta sessão. Quando ela expirar, entre novamente usando a nova senha.',
      })
    } catch (error) {
      if (error instanceof ApiProblemError && error.code === 'CURRENT_PASSWORD_INVALID') {
        setPasswordFeedback({ type: 'error', message: 'A senha atual informada está incorreta.' })
      } else if (error instanceof ApiProblemError && error.code === 'VALIDATION_FAILED') {
        setPasswordFeedback({ type: 'error', message: 'Confira os campos. As senhas devem ter entre 12 e 128 caracteres.' })
      } else {
        setPasswordFeedback({ type: 'error', message: 'Não foi possível alterar a senha agora. Tente novamente.' })
      }
    } finally {
      setChangingPassword(false)
    }
  }

  async function signOut() {
    setSigningOut(true)
    setLogoutFeedback(null)
    try {
      await auth.logout()
      window.location.hash = '#/'
    } catch {
      setLogoutFeedback('A sessão foi removida deste dispositivo, mas não foi possível confirmar o logout no servidor. Tente novamente quando a API estiver disponível.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="page-shell form-shell account-shell">
      <a className="back-link" href="#/">← Voltar ao simulador</a>
      <section className="page-heading centered">
        <span className="eyebrow">Conta Truck Life Simulator</span>
        <h1>Minha Conta</h1>
        <p>Confira sua sessão e, quando quiser, associe com segurança as carreiras salvas neste navegador à sua conta.</p>
      </section>

      {logoutFeedback && <div className="auth-feedback auth-feedback-error" role="alert"><span className="auth-feedback-icon">!</span><div><strong>Logout não confirmado</strong><p>{logoutFeedback}</p></div></div>}

      <section className="panel account-panel account-details-panel">
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

      <CareerMigrationPanel userId={user?.id} />

      <section className="panel account-panel account-security-panel">
        <span className="eyebrow">Segurança</span>
        <h2>Alterar senha</h2>
        <p>Após a alteração, esta sessão continua ativa até o token atual expirar ou você sair da conta. Depois, use a nova senha para entrar.</p>

        {passwordFeedback && (
          <div className={`auth-feedback ${passwordFeedback.type === 'success' ? 'auth-feedback-success' : 'auth-feedback-error'} account-password-feedback`} role={passwordFeedback.type === 'error' ? 'alert' : 'status'}>
            <span className="auth-feedback-icon">{passwordFeedback.type === 'success' ? '✓' : '!'}</span>
            <div>
              <strong>{passwordFeedback.type === 'success' ? 'Senha alterada' : 'Não foi possível alterar'}</strong>
              <p>{passwordFeedback.message}</p>
            </div>
          </div>
        )}

        <form className="auth-form account-security-form" onSubmit={changePassword} noValidate>
          <div className="auth-field">
            <label htmlFor="account-current-password">Senha atual</label>
            <input
              id="account-current-password"
              type="password"
              autoComplete="current-password"
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              value={passwords.currentPassword}
              onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
              disabled={changingPassword}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="account-new-password">Nova senha</label>
            <input
              id="account-new-password"
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              value={passwords.newPassword}
              onChange={(event) => updatePasswordField('newPassword', event.target.value)}
              disabled={changingPassword}
              required
            />
            <small>Use entre 12 e 128 caracteres.</small>
          </div>

          <div className="auth-field">
            <label htmlFor="account-confirm-password">Confirmar nova senha</label>
            <input
              id="account-confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              value={passwords.confirmation}
              onChange={(event) => updatePasswordField('confirmation', event.target.value)}
              disabled={changingPassword}
              required
            />
          </div>

          <button className="button primary auth-submit" type="submit" disabled={changingPassword}>
            {changingPassword ? 'Alterando…' : 'Alterar senha'}
          </button>
        </form>
      </section>

      <section className="panel account-panel account-session-panel">
        <span className="eyebrow">Sessão</span>
        <h2>Sair da conta</h2>
        <p>Encerra a sessão neste dispositivo imediatamente.</p>
        <div className="action-row">
          <button className="button secondary" type="button" onClick={signOut} disabled={signingOut}>
            {signingOut ? 'Saindo…' : 'Sair da conta'}
          </button>
        </div>
      </section>
    </main>
  )
}
