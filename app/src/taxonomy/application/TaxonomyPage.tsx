import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { TaxonomyCategoryItem, TaxonomyTagItem } from '../../shared/domain/corePort';
import { SheetView } from '../../shared/ui/SheetView';
import type { TaxonomyGatewayPort } from './taxonomyGateway.port';

export type TaxonomyPagePort = Pick<
  TaxonomyGatewayPort,
  'taxonomyListCategories' | 'taxonomyRenameCategory' | 'taxonomyListTags' | 'taxonomyRenameTag'
>;

type TaxonomyPageProps = {
  required: {
    core: TaxonomyPagePort;
  };
};

type TaxonomyTab = 'categories' | 'tags';

type RenameTarget =
  | { kind: 'category'; item: TaxonomyCategoryItem }
  | { kind: 'tag'; item: TaxonomyTagItem };

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function categoryScopeLabel(appliesTo: TaxonomyCategoryItem['appliesTo']): string {
  return appliesTo === 'income' ? 'Income' : 'Expense';
}

export function TaxonomyPage({ required }: TaxonomyPageProps) {
  const [activeTab, setActiveTab] = useState<TaxonomyTab>('categories');
  const [categories, setCategories] = useState<TaxonomyCategoryItem[]>([]);
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
      const [categoriesResult, tagsResult] = await Promise.all([
        required.core.taxonomyListCategories({ includeArchived: false }),
        required.core.taxonomyListTags({ includeArchived: false }),
      ]);
      setCategories(categoriesResult.items);
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
      if (renameTarget.kind === 'category') {
        await required.core.taxonomyRenameCategory({
          categoryId: renameTarget.item.id,
          name: renameDraft.trim(),
        });
      } else {
        await required.core.taxonomyRenameTag({
          tagId: renameTarget.item.id,
          name: renameDraft.trim(),
        });
      }
      setRenameTarget(null);
      await loadTaxonomy();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const visibleItems = activeTab === 'categories' ? categories : tags;
  const activeLabel = activeTab === 'categories' ? 'Categories' : 'Tags';

  return (
    <section className="app-screen">
      <div className="inline-header">
        <h2>Taxonomy</h2>
        <Link to="/" className="text-button icon-button" aria-label="Close taxonomy">
          <i className="bi bi-x-lg" aria-hidden />
        </Link>
      </div>

      <div className="segmented taxonomy-tabs" role="tablist" aria-label="Taxonomy sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'categories'}
          className={activeTab === 'categories' ? 'selected' : ''}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'tags'}
          className={activeTab === 'tags' ? 'selected' : ''}
          onClick={() => setActiveTab('tags')}
        >
          Tags
        </button>
      </div>

      {error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p role="status">Loading taxonomy...</p> : null}
      {!loading && visibleItems.length === 0 ? <p>No {activeTab} available.</p> : null}

      {!loading && visibleItems.length > 0 ? (
        <div className="taxonomy-section-header">
          <h3 id="taxonomy-list-title">{activeLabel}</h3>
          <span>{visibleItems.length}</span>
        </div>
      ) : null}

      {!loading && activeTab === 'categories' && categories.length > 0 ? (
        <ul className="taxonomy-list" aria-labelledby="taxonomy-list-title">
          {categories.map((category) => (
            <li key={category.id} className="taxonomy-token taxonomy-row">
              <div className="taxonomy-row-main">
                <strong className="taxonomy-token-name">{category.name}</strong>
                <span className="taxonomy-token-meta">{categoryScopeLabel(category.appliesTo)} category</span>
              </div>
              <button
                type="button"
                className="text-button icon-button taxonomy-edit-button"
                aria-label={`Rename category ${category.name}`}
                onClick={() => openRename({ kind: 'category', item: category })}
              >
                <i className="bi bi-pencil" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && activeTab === 'tags' && tags.length > 0 ? (
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
              ariaLabel: renameTarget.kind === 'category' ? 'Rename category' : 'Rename tag',
              title: renameTarget.kind === 'category' ? 'Rename category' : 'Rename tag',
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
