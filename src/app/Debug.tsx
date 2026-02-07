import { useState } from 'react';
import { CoreAdapterWeb } from '../data/coreAdapterWeb';

const core = new CoreAdapterWeb();

export function Debug() {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState('');

  async function handleCall() {
    const res = await core.doThing(message || 'ping');
    setResult(`${res.status}: ${res.message}`);
  }

  return (
    <section className="card">
      <h1>Debug</h1>
      <p>Web adapter call (placeholder for native plugin).</p>
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
    </section>
  );
}
