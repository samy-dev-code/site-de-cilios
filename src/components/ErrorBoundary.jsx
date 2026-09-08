import { Component } from 'react';

/** Error Boundary global: captura qualquer erro de render e mostra uma
    tela amigável em vez de derrubar o app (tela branca/preta). */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log leve para depuração sem quebrar a UI
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-ambient flex min-h-screen items-center justify-center px-4">
          <div className="glass w-full max-w-md rounded-3xl p-10 text-center animate-fade-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-plum-400/40 bg-plum-600/10 text-3xl">
              ✦
            </div>
            <h1 className="mt-6 font-serif text-3xl text-gradient">Ops! Algo deu errado</h1>
            <p className="mt-3 text-sm text-plum-200/80 leading-relaxed">
              Encontramos um problema inesperado ao exibir esta página.
              Por favor, tente novamente em instantes.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => window.location.reload()}
                className="btn-lux rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-7 py-3 text-sm font-medium text-white shadow-lg shadow-plum-600/30"
              >
                Recarregar página
              </button>
              <a
                href="/"
                className="rounded-full border border-plum-500/25 bg-plum-900/30 px-7 py-3 text-sm font-medium text-plum-200 transition hover:border-plum-400/50 hover:text-plum-300"
              >
                Voltar ao início
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
