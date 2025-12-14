import { AlertCircle, CheckCircle2 } from "lucide-react";

interface FormFieldErrorProps {
  error?: string;
  isValid?: boolean;
  hint?: string;
}

export function FormFieldError({ error, isValid, hint }: FormFieldErrorProps) {
  if (isValid) {
    return (
      <div className="flex items-center gap-2 mt-1 text-green-600 text-xs">
        <CheckCircle2 className="h-3 w-3" />
        <span>Looks good!</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 mt-1 text-red-600 text-xs">
        <AlertCircle className="h-3 w-3" />
        <span>{error}</span>
      </div>
    );
  }

  if (hint) {
    return (
      <p className="text-xs text-gray-500 mt-1">{hint}</p>
    );
  }

  return null;
}
