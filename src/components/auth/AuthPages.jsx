import { useState } from 'react'
import { ApiProblemError, authApi } from '../../lib/authApi.js'
import { useAuth } from './AuthProvider.jsx'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VERIFICATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

function HashLink({ to, className = '', children }) {
  return <a className={className} href={`#${to}`}>{children}</a>
}

function AuthLayout({ eyebrow, title, description, children }) {
  return (
    <main className="auth-shell">
      <section className="auth-brand-panel" aria-label="Truck Life Simulator">
        <HashLink className="auth-back-link" to="/">← Voltar ao simulador</HashLink>
        <div className="auth-brand-copy">
          <span className="eyebrow">Truck Life Simulator</span>
          <h1>Sua carreira, em qualquer estrada.</h1>
          <p>Crie sua conta para preparar a sincronização das carreiras de ATS e ETS2 sem apagar os dados que já estão neste dispositivo.</p>
          <ul className="auth-trust-list">
            <li><span aria-hidden="true">✓</span> Senha protegida e nunca exibida nos registros</li>
            <li><span aria-hidden="true">✓</span> Token de acesso nunca salvo no armazenamento local</li>
            <li><span aria-hidden="true">✓</span> Seus dados locais continuam preservados durante a transição</li>
          </ul>
        </div>
        <small>ATS e ETS2 continuam com carreiras e regras independentes.</small>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-heading">
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {children}
      </section>
    </main>
  )
}

function Feedback({ feedback }) {
  if (!feedback) return null
  return (
    <div
      className={`auth-feedback auth-feedback-${feedback.type}`}
      role={feedback.type === 'error' ? 'alert' : 'status'}
      aria-live={feedback.type === 'error' ? 'assertive' : 'polite'}
    >
      <span className="auth-feedback-icon" aria-hidden="true">{feedback.type === 'success' ? '✓' : feedback.type === 'error' ? '!' : 'i'}</span>
      <div>
        <strong>{feedback.title}</strong>
        <p>{feedback.message}</p>
      </div>
    </div>
  )
}

function PasswordField({ id, label, value, onChange, autoComplete, help, disabled = false }) {
  const [visible, setVisible] = useState(false)
  const helpId = help ? `${id}-help` : undefined
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-password-control">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-describedby={helpId}
          minLength="12"
          maxLength="128"
          required
          disabled={disabled}
        />
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`} disabled={disabled}>
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {help && <small id={helpId}>{help}</small>}
    </div>
  )
}

function retryText(error) {
  const seconds = Number(error.retryAfter || 0)
  if (!seconds) return 'Aguarde um pouco e tente novamente.'
  if (seconds < 60) return `Tente novamente em aproximadamente ${seconds} segundos.`
  const minutes = Math.ceil(seconds / 60)
  return `Tente novamente em aproximadamente ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`
}

export function authErrorFeedback(error, action) {
  const problem = error instanceof ApiProblemError ? error : new ApiProblemError('', { code: 'UNKNOWN' })
  if (problem.code === 'API_UNAVAILABLE' || problem.status === 0 || problem.status >= 500) {
    return {
      type: 'error',
      title: 'Serviço temporariamente indisponível',
      message: 'Não foi possível falar com a API. Seus dados digitados foram mantidos; tente novamente em instantes.',
    }
  }
  if (problem.status === 429) {
    return { type: 'error', title: 'Muitas tentativas', message: retryText(problem) }
  }
  if (problem.code === 'EMAIL_NOT_VERIFIED') {
    return { type: 'error', title: 'E-mail ainda não verificado', message: 'Confirme seu e-mail ou solicite uma nova mensagem de verificação.' }
  }
  if (problem.code === 'ACCOUNT_LOCKED' || problem.code === 'ACCOUNT_DISABLED') {
    return { type: 'error', title: 'Conta indisponível', message: 'Esta conta não pode iniciar uma sessão no momento.' }
  }
  if (problem.code === 'EMAIL_VERIFICATION_TOKEN_EXPIRED') {
    return { type: 'error', title: 'Código expirado', message: 'Solicite uma nova mensagem de verificação para continuar.' }
  }
  if (problem.code === 'EMAIL_VERIFICATION_TOKEN_INVALID') {
    return { type: 'error', title: 'Código inválido', message: 'Confira o link recebido ou solicite uma nova mensagem.' }
  }
  if (action === 'login' && (problem.status === 401 || problem.code === 'INVALID_CREDENTIALS')) {
    return { type: 'error', title: 'Não foi possível entrar', message: 'E-mail ou senha inválidos.' }
  }
  if ((action === 'forgot-password' || action === 'reset-password') && (problem.status === 404 || problem.status === 405)) {
    return { type: 'error', title: 'Recuperação ainda em ativação', message: 'Este fluxo está preparado no aplicativo e será liberado assim que a API concluir a recuperação de senha.' }
  }
  if (problem.status === 400 || problem.code === 'VALIDATION_FAILED') {
    return { type: 'error', title: 'Revise os dados', message: 'Um ou mais campos não foram aceitos. Confira as informações e tente novamente.' }
  }
  return { type: 'error', title: 'Não foi possível concluir', message: 'Tente novamente. Se o problema continuar, aguarde alguns instantes.' }
}

function validateEmail(email) {
  return EMAIL_PATTERN.test(String(email || '').trim())
}

function validatePassword(password, confirmation) {
  if (password.length < 12 || password.length > 128) return 'A senha deve ter entre 12 e 128 caracteres.'
  if (confirmation !== undefined && password !== confirmation) return 'As senhas digitadas não são iguais.'
  return null
}

function safeReturnTo(value) {
  const target = String(value || '').trim()
  if (!target.startsWith('/') || target.startsWith('//')) return null
  if (target === '/login' || target === '/register' || target === '/forgot-password' || target === '/reset-password') return null
  return target
}

export function LoginPage({ params }) {
  const auth = useAuth()
  const registered = params?.get('registered') === '1'
  const [email, setEmail] = useState(params?.get('email') || '')
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState(() => registered ? {
    type: 'success',
    title: 'Conta criada',
    message: 'Cadastro concluído. Verifique seu e-mail antes de entrar; depois use suas credenciais normalmente.',
  } : null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setFeedback(null)
    if (!validateEmail(email) || !password) {
      setFeedback({ type: 'error', title: 'Revise os dados', message: 'Informe um e-mail válido e sua senha.' })
      return
    }
    setSubmitting(true)
    try {
      await auth.login({ email: email.trim(), password })
      setPassword('')
      setFeedback({ type: 'success', title: 'Login realizado', message: 'Sua sessão foi criada com segurança.' })
      const destination = safeReturnTo(params?.get('returnTo')) || '/account'
      window.location.hash = `#${destination}`
    } catch (error) {
      setFeedback(authErrorFeedback(error, 'login'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout eyebrow="Acessar conta" title="Entre para continuar" description="Use o mesmo e-mail cadastrado para acessar sua carreira.">
      <Feedback feedback={feedback} />
      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="auth-field">
          <label htmlFor="login-email">E-mail</label>
          <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" maxLength="320" required disabled={submitting} placeholder="voce@exemplo.com" />
        </div>
        <PasswordField id="login-password" label="Senha" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" disabled={submitting} />
        <div className="auth-form-links"><HashLink to="/forgot-password">Esqueci minha senha</HashLink></div>
        <button className="button primary auth-submit" type="submit" disabled={submitting}>{submitting ? 'Entrando…' : 'Entrar'}</button>
      </form>
      {feedback?.title === 'E-mail ainda não verificado' && <HashLink className="auth-inline-cta" to={`/verify-email?email=${encodeURIComponent(email.trim())}`}>Verificar ou reenviar e-mail</HashLink>}
      <p className="auth-switch">Ainda não tem uma conta? <HashLink to="/register">Criar conta</HashLink></p>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setFeedback(null)
    const cleanName = displayName.trim()
    if (cleanName.length < 2 || cleanName.length > 120 || !validateEmail(email)) {
      setFeedback({ type: 'error', title: 'Revise os dados', message: 'Informe um nome entre 2 e 120 caracteres e um e-mail válido.' })
      return
    }
    const passwordError = validatePassword(password, confirmation)
    if (passwordError) {
      setFeedback({ type: 'error', title: 'Revise a senha', message: passwordError })
      return
    }
    setSubmitting(true)
    try {
      const cleanEmail = email.trim()
      await authApi.register({ displayName: cleanName, email: cleanEmail, password })
      setPassword('')
      setConfirmation('')
      setFeedback({
        type: 'success',
        title: 'Solicitação recebida',
        message: 'Cadastro concluído. Redirecionando para o login.',
      })
      window.location.hash = `#/login?registered=1&email=${encodeURIComponent(cleanEmail)}`
    } catch (error) {
      setFeedback(authErrorFeedback(error, 'register'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout eyebrow="Nova conta" title="Comece sua jornada" description="Sua conta será criada como Free e poderá receber suas carreiras locais em uma etapa posterior.">
      <Feedback feedback={feedback} />
      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="auth-field">
          <label htmlFor="register-name">Como quer ser chamado</label>
          <input id="register-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" minLength="2" maxLength="120" required disabled={submitting} placeholder="Ex.: Rafael Silva" />
        </div>
        <div className="auth-field">
          <label htmlFor="register-email">E-mail</label>
          <input id="register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" maxLength="320" required disabled={submitting} placeholder="voce@exemplo.com" />
        </div>
        <PasswordField id="register-password" label="Senha" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" disabled={submitting} help="Use entre 12 e 128 caracteres. Espaços, colagem e caracteres Unicode são permitidos." />
        <PasswordField id="register-confirmation" label="Confirmar senha" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" disabled={submitting} />
        <button className="button primary auth-submit" type="submit" disabled={submitting}>{submitting ? 'Criando conta…' : 'Criar conta'}</button>
      </form>
      <p className="auth-switch">Já possui uma conta? <HashLink to="/login">Entrar</HashLink></p>
    </AuthLayout>
  )
}

export function VerifyEmailPage({ params }) {
  const linkToken = params?.get('token') || ''
  const [token, setToken] = useState(linkToken)
  const [email, setEmail] = useState(params?.get('email') || '')
  const [feedback, setFeedback] = useState(null)
  const [resendFeedback, setResendFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  async function verify(event) {
    event.preventDefault()
    setFeedback(null)
    if (!VERIFICATION_TOKEN_PATTERN.test(token.trim())) {
      setFeedback({ type: 'error', title: 'Código incompleto', message: 'Abra novamente o link recebido ou cole o código de verificação completo.' })
      return
    }
    setSubmitting(true)
    try {
      await authApi.verifyEmail(token.trim())
      setToken('')
      setFeedback({ type: 'success', title: 'E-mail verificado', message: 'Sua conta está pronta para receber um login.' })
    } catch (error) {
      setFeedback(authErrorFeedback(error, 'verify-email'))
    } finally {
      setSubmitting(false)
    }
  }

  async function resend(event) {
    event.preventDefault()
    setResendFeedback(null)
    if (!validateEmail(email)) {
      setResendFeedback({ type: 'error', title: 'E-mail inválido', message: 'Informe o e-mail usado no cadastro.' })
      return
    }
    setResending(true)
    try {
      await authApi.resendVerification(email.trim())
      setResendFeedback({ type: 'success', title: 'Solicitação recebida', message: 'Se houver uma conta aguardando verificação, uma nova mensagem será enviada.' })
    } catch (error) {
      setResendFeedback(authErrorFeedback(error, 'resend-verification'))
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout eyebrow="Verificação" title="Confirme seu e-mail" description="Use o link recebido para ativar a conta. O código é usado uma única vez.">
      <Feedback feedback={feedback} />
      <form className="auth-form" onSubmit={verify} noValidate>
        {linkToken ? (
          <div className="auth-token-ready"><span aria-hidden="true">✓</span><div><strong>Código recebido pelo link</strong><small>Confirme abaixo para concluir a verificação com segurança.</small></div></div>
        ) : (
          <div className="auth-field">
            <label htmlFor="verification-token">Código de verificação</label>
            <input id="verification-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" minLength="43" maxLength="43" required disabled={submitting} />
          </div>
        )}
        <button className="button primary auth-submit" type="submit" disabled={submitting}>{submitting ? 'Verificando…' : 'Verificar e-mail'}</button>
      </form>
      {feedback?.type === 'success' && <HashLink className="button success auth-continue" to="/login">Entrar na conta</HashLink>}

      <div className="auth-divider"><span>Não recebeu?</span></div>
      <Feedback feedback={resendFeedback} />
      <form className="auth-form auth-secondary-form" onSubmit={resend} noValidate>
        <div className="auth-field">
          <label htmlFor="resend-email">E-mail do cadastro</label>
          <input id="resend-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" maxLength="320" required disabled={resending} placeholder="voce@exemplo.com" />
        </div>
        <button className="button secondary auth-submit" type="submit" disabled={resending}>{resending ? 'Solicitando…' : 'Reenviar verificação'}</button>
      </form>
      <p className="auth-switch"><HashLink to="/login">Voltar para o login</HashLink></p>
    </AuthLayout>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setFeedback(null)
    if (!validateEmail(email)) {
      setFeedback({ type: 'error', title: 'E-mail inválido', message: 'Informe um e-mail válido para continuar.' })
      return
    }
    setSubmitting(true)
    try {
      await authApi.forgotPassword(email.trim())
      setFeedback({ type: 'success', title: 'Solicitação recebida', message: 'Se o e-mail estiver vinculado a uma conta, enviaremos as instruções para criar uma nova senha.' })
    } catch (error) {
      setFeedback(authErrorFeedback(error, 'forgot-password'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout eyebrow="Recuperar acesso" title="Esqueceu sua senha?" description="Informe o e-mail da conta. A resposta será sempre neutra para proteger seus dados.">
      <Feedback feedback={feedback} />
      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="auth-field">
          <label htmlFor="forgot-email">E-mail</label>
          <input id="forgot-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" maxLength="320" required disabled={submitting} placeholder="voce@exemplo.com" />
        </div>
        <button className="button primary auth-submit" type="submit" disabled={submitting}>{submitting ? 'Enviando…' : 'Enviar instruções'}</button>
      </form>
      <p className="auth-switch"><HashLink to="/login">Voltar para o login</HashLink></p>
    </AuthLayout>
  )
}

export function ResetPasswordPage({ params }) {
  const linkToken = params?.get('token') || ''
  const [token, setToken] = useState(linkToken)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setFeedback(null)
    if (!token.trim() || token.trim().length > 512) {
      setFeedback({ type: 'error', title: 'Código inválido', message: 'Abra novamente o link de recuperação recebido por e-mail.' })
      return
    }
    const passwordError = validatePassword(password, confirmation)
    if (passwordError) {
      setFeedback({ type: 'error', title: 'Revise a senha', message: passwordError })
      return
    }
    setSubmitting(true)
    try {
      await authApi.resetPassword(token.trim(), password)
      setToken('')
      setPassword('')
      setConfirmation('')
      setFeedback({ type: 'success', title: 'Senha redefinida', message: 'As sessões anteriores serão encerradas. Entre novamente usando sua nova senha.' })
    } catch (error) {
      setFeedback(authErrorFeedback(error, 'reset-password'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout eyebrow="Nova senha" title="Redefina seu acesso" description="Crie uma nova senha para encerrar as sessões anteriores e recuperar sua conta.">
      <Feedback feedback={feedback} />
      <form className="auth-form" onSubmit={submit} noValidate>
        {!linkToken && (
          <div className="auth-field">
            <label htmlFor="reset-token">Código de recuperação</label>
            <input id="reset-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" maxLength="512" required disabled={submitting} />
          </div>
        )}
        <PasswordField id="reset-password" label="Nova senha" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" disabled={submitting} help="Use entre 12 e 128 caracteres." />
        <PasswordField id="reset-confirmation" label="Confirmar nova senha" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" disabled={submitting} />
        <button className="button primary auth-submit" type="submit" disabled={submitting}>{submitting ? 'Redefinindo…' : 'Redefinir senha'}</button>
      </form>
      {feedback?.type === 'success' && <HashLink className="button success auth-continue" to="/login">Entrar com a nova senha</HashLink>}
      <p className="auth-switch"><HashLink to="/login">Voltar para o login</HashLink></p>
    </AuthLayout>
  )
}

export default function PublicAuthPage({ path, params }) {
  if (path === '/login') return <LoginPage params={params} />
  if (path === '/register') return <RegisterPage />
  if (path === '/verify-email') return <VerifyEmailPage params={params} />
  if (path === '/forgot-password') return <ForgotPasswordPage />
  if (path === '/reset-password') return <ResetPasswordPage params={params} />
  return null
}

export const PUBLIC_AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
])
