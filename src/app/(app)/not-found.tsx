import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <Alert tone="info">
        <p className="font-semibold">Not found</p>
        <p className="mt-1">The record or page you asked for does not exist or has been removed.</p>
      </Alert>
      <div className="mt-4">
        <ButtonLink href="/" variant="secondary">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}
