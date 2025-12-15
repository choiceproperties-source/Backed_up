import { type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Home, 
  Search, 
  Users, 
  CreditCard, 
  MessageSquare,
  Building2,
  type LucideIcon 
} from "lucide-react";
import { Link } from "wouter";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  children,
}: EmptyStateProps) {
  return (
    <Card data-testid="empty-state">
      <CardContent className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-empty-title">
          {title}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto" data-testid="text-empty-description">
          {description}
        </p>
        {actionLabel && actionHref && (
          <Link href={actionHref}>
            <Button data-testid="button-empty-action">{actionLabel}</Button>
          </Link>
        )}
        {actionLabel && onAction && !actionHref && (
          <Button onClick={onAction} data-testid="button-empty-action">
            {actionLabel}
          </Button>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

export const EmptyStatePresets = {
  noApplications: {
    icon: FileText,
    title: "No Applications Yet",
    description: "You haven't submitted any rental applications. Browse properties to get started.",
    actionLabel: "Browse Properties",
    actionHref: "/properties",
  },
  noProperties: {
    icon: Building2,
    title: "No Properties Found",
    description: "There are no properties matching your criteria. Try adjusting your filters.",
    actionLabel: "Clear Filters",
  },
  noUsers: {
    icon: Users,
    title: "No Users Found",
    description: "No users match your search criteria.",
  },
  noPayments: {
    icon: CreditCard,
    title: "No Payments Found",
    description: "There are no payment records to display.",
  },
  noMessages: {
    icon: MessageSquare,
    title: "No Messages",
    description: "You don't have any messages yet.",
  },
  noResults: {
    icon: Search,
    title: "No Results",
    description: "We couldn't find what you're looking for. Try a different search.",
  },
} as const;
