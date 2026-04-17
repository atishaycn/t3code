import * as Schema from "effect/Schema";
import { useCallback, useMemo } from "react";

import { useLocalStorage } from "./hooks/useLocalStorage";

export const PROJECT_NEXT_STORAGE_KEY = "t3code:project-next:v1";

const ProjectNextItemSchema = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  completed: Schema.Boolean,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

const ProjectNextListSchema = Schema.Struct({
  projectKey: Schema.String,
  items: Schema.Array(ProjectNextItemSchema),
});

const ProjectNextStorageDocumentSchema = Schema.Struct({
  version: Schema.Literal(1),
  lists: Schema.Array(ProjectNextListSchema),
});

export type ProjectNextItem = typeof ProjectNextItemSchema.Type;
type ProjectNextStorageDocument = typeof ProjectNextStorageDocumentSchema.Type;

const EMPTY_PROJECT_NEXT_DOCUMENT: ProjectNextStorageDocument = {
  version: 1,
  lists: [],
};

function updateProjectList(
  document: ProjectNextStorageDocument,
  projectKey: string,
  nextItems: readonly ProjectNextItem[],
): ProjectNextStorageDocument {
  const remainingLists = document.lists.filter((entry) => entry.projectKey !== projectKey);
  if (nextItems.length === 0) {
    return {
      version: 1,
      lists: remainingLists,
    };
  }

  return {
    version: 1,
    lists: [
      ...remainingLists,
      {
        projectKey,
        items: [...nextItems],
      },
    ],
  };
}

export function useProjectNextItems(
  projectKey: string,
): [
  readonly ProjectNextItem[],
  (
    value:
      | readonly ProjectNextItem[]
      | ((current: readonly ProjectNextItem[]) => readonly ProjectNextItem[]),
  ) => void,
] {
  const [document, setDocument] = useLocalStorage(
    PROJECT_NEXT_STORAGE_KEY,
    EMPTY_PROJECT_NEXT_DOCUMENT,
    ProjectNextStorageDocumentSchema,
  );

  const items = useMemo(
    () => document.lists.find((entry) => entry.projectKey === projectKey)?.items ?? [],
    [document.lists, projectKey],
  );

  const setItems = useCallback(
    (
      value:
        | readonly ProjectNextItem[]
        | ((current: readonly ProjectNextItem[]) => readonly ProjectNextItem[]),
    ) => {
      setDocument((current) => {
        const currentItems =
          current.lists.find((entry) => entry.projectKey === projectKey)?.items ?? [];
        const nextItems = typeof value === "function" ? value(currentItems) : value;
        return updateProjectList(current, projectKey, nextItems);
      });
    },
    [projectKey, setDocument],
  );

  return [items, setItems];
}
