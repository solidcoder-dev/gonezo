import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CoreAdapter } from '../data/coreAdapter';

const core = new CoreAdapter();

export function Debug() {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [accountName, setAccountName] = useState('Main account');
  const [accountResult, setAccountResult] = useState('');

  async function handleCall() {
    setError('');
    try {
      const res = await core.doThing(message || 'ping');
      setResult(`${res.status}: ${res.message}`);
    } catch (err) {
      setResult('');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleCreateAccount() {
    setError('');
    try {
      const res = await core.createAccount({ name: accountName });
      setAccountResult(`created: ${res.id}`);
    } catch (err) {
      setAccountResult('');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  return (
    <section className="card">
      <h1>Debug</h1>
      <p>Calls CorePlugin on native, web adapter in browser.</p>
      <p>
        Platform: <strong>{Capacitor.getPlatform()}</strong>
      </p>
      <div className="row">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="type a message"
        />
        <button type="button" onClick={handleCall}>
          Call core
        </button>
      </div>
      {result ? <pre className="result">{result}</pre> : null}
      <div className="row">
        <input
          value={accountName}
          onChange={(event) => setAccountName(event.target.value)}
          placeholder="account name"
        />
        <button type="button" onClick={handleCreateAccount}>
          Create account
        </button>
      </div>
      {accountResult ? <pre className="result">{accountResult}</pre> : null}
      {error ? <pre className="result error">{error}</pre> : null}
    </section>
  );
}
