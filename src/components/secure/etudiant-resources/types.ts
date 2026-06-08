/** Mode liste / formulaire — inspiré du pattern PageManager (liste) + PageDetail (fiche). */
export type ResourceWorkspaceMode = "list" | "create" | "edit" | "payment";

export type Paginated<T> = {
  rows: T[];
  total: number;
  page: number;
  limit: number;
};
