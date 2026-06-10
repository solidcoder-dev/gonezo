import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { TaxonomyTagItem } from './taxonomy.port';
import { SheetView } from '../../shared/ui/SheetView';
import type { TaxonomyGatewayPort } from './taxonomyGateway.port';
import './TaxonomyPage.css';

export type TaxonomyPagePort = Pick<
  TaxonomyGatewayPort,
  'taxonomyListTags' | 'taxonomyRenameTag'
>;

type TaxonomyPageProps = {
  required: {
    core: TaxonomyPagePort;
  };
};

type RenameTarget = { kind: 'tag'; item: TaxonomyTagItem };

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function TaxonomyPage({ required }: TaxonomyPageProps) {
  const [tags, setTags] = useState<TaxonomyTagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  async function loadTaxonomy() {
    setLoading(true);
    setError('');
    try {
      const tagsResult = await required.core.taxonomyListTags({ includeArchived: false });
      setTags(tagsResult.items);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTaxonomy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [required.core]);

  function openRename(target: RenameTarget) {
    setRenameTarget(target);
    setRenameDraft(target.item.name);
    setError('');
  }

  async function submitRename(event: FormEvent) {
    event.preventDefault();
    if (!renameTarget || renameDraft.trim().length === 0) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await required.core.taxonomyRenameTag({
        tagId: renameTarget.item.id,
        name: renameDraft.trim(),
      });
      setRenameTarget(null);
      await loadTaxonomy();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="app-screen">
      <div className="inline-header">
        <h2>Taxonomy</h2>
        <Link to="/" className="text-button icon-button" aria-label="Close taxonomy">
          <i className="bi bi-x-lg" aria-hidden />
        </Link>
      </div>

      {error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p role="status">Loading taxonomy...</p> : null}
      {!loading && tags.length === 0 ? <p>No tags available.</p> : null}

      {!loading && tags.length > 0 ? (
        <div className="taxonomy-section-header">
          <h3 id="taxonomy-list-title">Tags</h3>
          <span>{tags.length}</span>
        </div>
      ) : null}

      {!loading && tags.length > 0 ? (
        <ul className="taxonomy-list" aria-labelledby="taxonomy-list-title">
          {tags.map((tag) => (
            <li key={tag.id} className="taxonomy-token taxonomy-row">
              <div className="taxonomy-row-main">
                <strong className="taxonomy-token-name">#{tag.name}</strong>
                <span className="taxonomy-token-meta">Tag</span>
              </div>
              <button
                type="button"
                className="text-button icon-button taxonomy-edit-button"
                aria-label={`Rename tag ${tag.name}`}
                onClick={() => openRename({ kind: 'tag', item: tag })}
              >
                <i className="bi bi-pencil" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {renameTarget ? (
        <SheetView
          required={{
            config: {
              ariaLabel: 'Rename tag',
              title: 'Rename tag',
              closeLabel: 'Close rename',
            },
            data: {
              body: (
                <form className="stack" onSubmit={submitRename} aria-busy={saving}>
                  <label className="stack">
                    Name
                    <input
                      aria-label="Taxonomy name"
                      value={renameDraft}
                      onChange={(event) => setRenameDraft(event.target.value)}
                      autoComplete="off"
                    />
                  </label>

                  <div className="quick-row">
                    <button type="submit" disabled={saving || renameDraft.trim().length === 0}>
                      Save name
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      disabled={saving}
                      onClick={() => setRenameTarget(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ),
            },
            state: { open: true },
            status: {},
          }}
          provided={{ commands: { close: () => setRenameTarget(null) } }}
        />
      ) : null}
    </section>
  );
}
