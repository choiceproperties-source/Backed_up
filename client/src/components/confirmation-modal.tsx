import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2, type LucideIcon } from "lucide-react";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "danger" | "warning" | "default";
  icon?: LucideIcon;
  loading?: boolean;
}

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
  icon,
  loading = false,
}: ConfirmationModalProps) {
  const Icon = icon || (variant === "danger" ? Trash2 : variant === "warning" ? AlertTriangle : null);
  
  const getConfirmButtonClass = () => {
    if (variant === "danger") return "bg-destructive text-destructive-foreground";
    if (variant === "warning") return "bg-yellow-500 text-white";
    return "";
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="modal-confirmation">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`p-2 rounded-full ${
                variant === "danger" ? "bg-destructive/10" : 
                variant === "warning" ? "bg-yellow-100 dark:bg-yellow-900/20" : 
                "bg-muted"
              }`}>
                <Icon className={`h-5 w-5 ${
                  variant === "danger" ? "text-destructive" : 
                  variant === "warning" ? "text-yellow-600 dark:text-yellow-500" : 
                  "text-muted-foreground"
                }`} />
              </div>
            )}
            <AlertDialogTitle data-testid="text-modal-title">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription data-testid="text-modal-description" className="mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-modal-cancel" disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={getConfirmButtonClass()}
            disabled={loading}
            data-testid="button-modal-confirm"
          >
            {loading ? "Processing..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteConfirmationModal({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${itemName}?`}
      description={`This action cannot be undone. ${itemName} will be permanently removed from the system.`}
      confirmLabel="Delete"
      variant="danger"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}
