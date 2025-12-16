import { AlertTriangle, RefreshCw, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  fullPage?: boolean;
}

export function ErrorState({
  icon: Icon = AlertTriangle,
  title = "Something went wrong",
  description = "We encountered an error loading this content. Please try again.",
  onRetry,
  retryLabel = "Try Again",
  fullPage = false,
}: ErrorStateProps) {
  const content = (
    <Card data-testid="error-state">
      <CardContent className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-error-title">
          {title}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto" data-testid="text-error-description">
          {description}
        </p>
        {onRetry && (
          <Button onClick={onRetry} data-testid="button-error-retry">
            <RefreshCw className="h-4 w-4 mr-2" />
            {retryLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (fullPage) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full">{content}</div>
      </div>
    );
  }

  return content;
}

export const ErrorStatePresets = {
  network: {
    title: "Connection Error",
    description: "Unable to connect to the server. Please check your internet connection.",
  },
  notFound: {
    title: "Not Found",
    description: "The requested resource could not be found.",
  },
  unauthorized: {
    title: "Access Denied",
    description: "You don't have permission to view this content.",
  },
  serverError: {
    title: "Server Error",
    description: "Something went wrong on our end. Please try again later.",
  },
} as const;
