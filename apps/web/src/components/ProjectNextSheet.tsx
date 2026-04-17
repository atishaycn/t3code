import { ListTodoIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { useProjectNextItems, type ProjectNextItem } from "../projectNextState";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { RightPanelSheet } from "./RightPanelSheet";
import { SheetDescription, SheetHeader, SheetPanel, SheetTitle } from "./ui/sheet";

function buildProjectNextItem(text: string): ProjectNextItem {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    text,
    completed: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function ProjectNextSheet(props: {
  open: boolean;
  projectKey: string;
  projectName: string;
  onClose: () => void;
}) {
  const [draftText, setDraftText] = useState("");
  const [items, setItems] = useProjectNextItems(props.projectKey);

  const remainingCount = useMemo(() => items.filter((item) => !item.completed).length, [items]);
  const completedCount = items.length - remainingCount;

  const handleAddItem = useCallback(() => {
    const trimmedText = draftText.trim();
    if (trimmedText.length === 0) {
      return;
    }
    setItems((current) => [...current, buildProjectNextItem(trimmedText)]);
    setDraftText("");
  }, [draftText, setItems]);

  const handleToggleItem = useCallback(
    (itemId: string, completed: boolean) => {
      setItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                completed,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    },
    [setItems],
  );

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      setItems((current) => current.filter((item) => item.id !== itemId));
    },
    [setItems],
  );

  const handleClearCompleted = useCallback(() => {
    setItems((current) => current.filter((item) => !item.completed));
  }, [setItems]);

  return (
    <RightPanelSheet open={props.open} onClose={props.onClose}>
      <div className="flex min-h-0 flex-1 flex-col" data-testid="project-next-sheet">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <ListTodoIcon className="size-4" />
              </div>
              <div className="min-w-0 space-y-1">
                <SheetTitle>{props.projectName} Next</SheetTitle>
                <SheetDescription>
                  Keep a lightweight project todo list beside the active threads.
                </SheetDescription>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={props.onClose}
              aria-label="Close next list"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </SheetHeader>

        <SheetPanel className="flex min-h-0 flex-1 flex-col gap-4">
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              handleAddItem();
            }}
          >
            <Input
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              placeholder="Add the next thing to work on"
              aria-label={`Add next item for ${props.projectName}`}
              data-testid="project-next-input"
            />
            <Button
              type="submit"
              size="sm"
              className="shrink-0"
              disabled={draftText.trim().length === 0}
            >
              <PlusIcon className="size-3.5" />
              Add
            </Button>
          </form>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {remainingCount} left
              {completedCount > 0 ? `, ${completedCount} done` : ""}
            </span>
            {completedCount > 0 ? (
              <button
                type="button"
                className="cursor-pointer rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={handleClearCompleted}
              >
                Clear done
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/30 px-6 text-center text-sm text-muted-foreground">
              Nothing queued yet for this project.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background px-3 py-2.5"
                  data-testid="project-next-item"
                >
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={(checked) => handleToggleItem(item.id, checked === true)}
                    aria-label={`Mark "${item.text}" ${item.completed ? "not done" : "done"}`}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    <p
                      className={
                        item.completed ? "text-muted-foreground line-through" : "text-foreground"
                      }
                    >
                      {item.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
                    onClick={() => handleDeleteItem(item.id)}
                    aria-label={`Delete "${item.text}"`}
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SheetPanel>
      </div>
    </RightPanelSheet>
  );
}
