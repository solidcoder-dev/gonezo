export type MovementVoiceEntryCategoryItem = Readonly<{
  id: string;
  name: string;
  status: 'active' | 'archived';
}>;

export type MovementVoiceEntryCategorySourceResult = Readonly<{
  items: ReadonlyArray<MovementVoiceEntryCategoryItem>;
}>;

export type MovementVoiceEntryCategorySourcePort = {
  taxonomyListCategories(input?: {
    includeArchived?: boolean;
  }): Promise<MovementVoiceEntryCategorySourceResult>;
};
