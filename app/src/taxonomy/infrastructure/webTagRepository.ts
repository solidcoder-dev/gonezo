import type {
  TaxonomyListTagsInput,
  TaxonomyListTagsResult,
  TaxonomyRenameTagInput,
} from '../application/taxonomy.port';
import type { WebRuntimeDependencies } from '../../core/infrastructure/webRuntimeDependencies';
import type {
  WebAppState,
  WebTaxonomyTag,
} from '../../core/infrastructure/webAppState';
import { normalizeWebTaxonomyTagName } from './webTaxonomyNames';

export type WebTagAssignmentResult =
  | { status: 'assigned'; tagIds: string[] }
  | { status: 'failed'; errorCode: string; errorMessage: string };

export type WebTagAssignmentPort = {
  assignActiveTagNames(tagNames: Map<string, string>): WebTagAssignmentResult;
};

export type WebTagRepositoryOptions = {
  state: WebAppState;
  dependencies: WebRuntimeDependencies;
};

export class WebTagRepository implements WebTagAssignmentPort {
  private readonly state: WebAppState;

  private readonly dependencies: WebRuntimeDependencies;

  constructor(options: WebTagRepositoryOptions) {
    this.state = options.state;
    this.dependencies = options.dependencies;
  }

  private nowIso(): string {
    return this.dependencies.clock.nowIso();
  }

  private nextId(): string {
    return this.dependencies.idGenerator.nextId();
  }

  private findTagByNormalizedName(normalizedName: string): WebTaxonomyTag | undefined {
    return this.state.taxonomyTags.find((tag) => tag.normalizedName === normalizedName);
  }

  async listTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult> {
    const includeArchived = input?.includeArchived === true;
    const items = this.state.taxonomyTags
      .filter((tag) => includeArchived || tag.status !== 'archived')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        status: tag.status,
      }));

    return { items };
  }

  async renameTag(input: TaxonomyRenameTagInput): Promise<void> {
    const tag = this.state.taxonomyTags.find((item) => item.id === input.tagId);
    if (!tag) {
      throw new Error(`Tag not found: ${input.tagId}`);
    }
    const name = input.name.trim();
    if (!name) {
      throw new Error('Tag name is required');
    }
    const normalizedName = normalizeWebTaxonomyTagName(name);
    const duplicate = this.state.taxonomyTags.find(
      (item) => item.id !== tag.id && item.normalizedName === normalizedName,
    );
    if (duplicate) {
      throw new Error(`Tag already exists: ${name}`);
    }
    tag.name = name;
    tag.normalizedName = normalizedName;
  }

  assignActiveTagNames(tagNames: Map<string, string>): WebTagAssignmentResult {
    const tagIds: string[] = [];
    for (const [normalizedName, originalName] of tagNames) {
      const existing = this.findTagByNormalizedName(normalizedName);
      if (existing) {
        if (existing.status !== 'active') {
          return {
            status: 'failed',
            errorCode: 'TAG_ARCHIVED',
            errorMessage: `Tag is archived: ${existing.name}`,
          };
        }
        tagIds.push(existing.id);
        continue;
      }

      const id = this.nextId();
      this.state.taxonomyTags.push({
        id,
        name: originalName,
        normalizedName,
        status: 'active',
        createdAt: this.nowIso(),
      });
      tagIds.push(id);
    }
    return {
      status: 'assigned',
      tagIds,
    };
  }
}
