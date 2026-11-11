import { Component } from 'react';

// Évite la page blanche : toute erreur de rendu est affichée (et copiable) au lieu de faire disparaître le site.
export default class ErrorBoundary extends Component {
  state = { error: null, info: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Erreur PIXEL PLAY :', error, info?.componentStack); this.setState({ info }); }
  render() {
    if (!this.state.error) return this.props.children;
    const e = this.state.error, detail = [e?.stack, this.state.info?.componentStack].filter(Boolean).join('\n').split('\n').slice(0, 14).join('\n');
    return (
      <div role="alert" style={{ maxWidth: 640, margin: '10vh auto', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
        <h1 style={{ fontSize: '1.6rem' }}>Une erreur est survenue</h1>
        <p>Le site n'a pas pu s'afficher. Rechargez la page ; si le problème persiste, transmettez ce message :</p>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#F5F4F8', padding: 12 }}>{String(e?.message || e)}</pre>
        {detail && <details><summary>Détails techniques (à joindre au message)</summary><pre style={{ whiteSpace: 'pre-wrap', background: '#F5F4F8', padding: 12, fontSize: '.8rem' }}>{detail}</pre></details>}
        <button type="button" onClick={() => window.location.reload()} style={{ padding: '10px 16px' }}>Recharger</button>
      </div>
    );
  }
}
