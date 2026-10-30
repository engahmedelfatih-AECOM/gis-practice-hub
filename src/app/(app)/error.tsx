"use client";

import { useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Details are available in server logs under this digest; nothing sensitive is shown here.
    console.error("page error", error.digest);
  }, [error]);
  return (
    <div className="mx-auto max-w-lg py-16">
      <Alert tone="danger">
        <p className="font-semibold">Something went wrong</p>
        <p className="mt-1">
          The page could not be displayed. {error.digest ? `Reference: ${error.digest}` : ""}
        </p>
      </Alert>
      <div className="mt-4">
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
