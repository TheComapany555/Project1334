import { AlertCircle } from "lucide-react";

type FieldErrorProps = {
  message?: string;
};

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}
