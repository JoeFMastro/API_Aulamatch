import { Component } from 'react'

/**
 * ErrorBoundary — red de seguridad global de React.
 * Captura cualquier excepción de render en el árbol de componentes hijos
 * y muestra un mensaje de error legible en lugar de dejar la pantalla en blanco.
 *
 * Uso: envolver <AppRoutes /> (o cualquier subárbol) en <ErrorBoundary>.
 *
 * No puede ser un componente funcional: React requiere clase para
 * componentDidCatch / getDerivedStateFromError.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack)
  }

  handleReset() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg, #0f172a)',
          padding: '32px',
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: 'var(--color-surface, #1e293b)',
            border: '1px solid var(--color-border, #334155)',
            borderRadius: '12px',
            padding: '40px 32px',
            textAlign: 'center',
            fontFamily: 'var(--font-body, Inter, sans-serif)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💥</div>
            <h2 style={{
              color: 'var(--color-text, #f1f5f9)',
              fontSize: '20px',
              fontWeight: 700,
              marginBottom: '12px',
            }}>
              Algo salió mal
            </h2>
            <p style={{
              color: 'var(--color-text-muted, #94a3b8)',
              fontSize: '14px',
              marginBottom: '8px',
              lineHeight: '1.6',
            }}>
              Se produjo un error inesperado al renderizar esta pantalla.
            </p>
            {this.state.error?.message && (
              <pre style={{
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '12px',
                color: '#fca5a5',
                textAlign: 'left',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                marginBottom: '24px',
              }}>
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                🔄 Recargar página
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => this.handleReset()}
              >
                Intentar continuar
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
