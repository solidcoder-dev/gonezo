import { useState } from 'react';
import type { FormEvent } from 'react';
import { SheetView } from '../../shared/ui/SheetView';

type ApplicationBackupRestoreComponentProps = {
  required: { isOpen: boolean };
  provided: { close: () => void; restore: (file: File) => Promise<void> };
};

export function ApplicationBackupRestoreComponent({ required, provided }: ApplicationBackupRestoreComponentProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);

  if (!required.isOpen) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError('Select a Gonezo application backup JSON file first.');
      return;
    }
    setError('');
    setCompleted(false);
    setIsRestoring(true);
    try {
      await provided.restore(file);
      setCompleted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Restore failed.');
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <SheetView
      required={{
        config: {
          ariaLabel: 'Restore backup',
          title: 'Restore backup',
          closeLabel: 'Close restore sheet',
          panelClassName: 'import-sheet',
        },
        data: {
          body: (
            <div className="import-sheet-content">
              <form className="vstack gap-3" onSubmit={(event) => { void submit(event); }} aria-busy={isRestoring}>
                <label className="d-grid gap-2">
                  Application backup file (JSON)
                  <input
                    className="form-control"
                    aria-label="Application backup file (JSON)"
                    type="file"
                    accept=".json,application/json"
                    onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(''); setCompleted(false); }}
                  />
                </label>
                {file ? <p className="gz-hint">Selected: {file.name}</p> : null}
                <button type="submit" className="btn btn-primary w-100" disabled={isRestoring}>
                  {isRestoring ? 'Restoring...' : 'Restore backup'}
                </button>
              </form>
              {error ? <div className="alert alert-danger mt-3" role="alert">{error}</div> : null}
              {completed ? <div className="alert alert-success mt-3" role="status">Restore completed.</div> : null}
            </div>
          ),
        },
        state: { open: true },
        status: {},
      }}
      provided={{ commands: { close: provided.close } }}
    />
  );
}
