import { GitForkIcon } from "lucide-react";
import { memo } from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export const ForkContextTransferBanner = memo(function ForkContextTransferBanner({
  context,
}: {
  context: string | null;
}) {
  if (!context) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-3 pt-3 sm:px-5">
      <Alert variant="info">
        <GitForkIcon />
        <AlertTitle>Forked chat context is being transferred</AlertTitle>
        <AlertDescription>
          <p>Context from the other chat is being transferred into this new thread.</p>
          <div className="rounded-lg border border-info/20 bg-background/60 p-3">
            <p className="mb-2 font-medium text-foreground text-xs uppercase tracking-wide">
              Transferred context
            </p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-foreground">
              {context}
            </pre>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
});
