import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ConfirmDialogProps {
  title?: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  trigger?: React.ReactNode;
  variant?: "destructive" | "default";
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDialog({
  title = "Are you sure?",
  description,
  onConfirm,
  trigger,
  variant = "destructive",
  confirmText = "Delete",
  cancelText = "Cancel",
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button size="icon" variant="ghost" data-testid="button-delete-trigger">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent data-testid="dialog-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle data-testid="text-dialog-title">{title}</AlertDialogTitle>
          <AlertDialogDescription data-testid="text-dialog-description">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={loading} data-testid="button-dialog-cancel">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading}
            className={variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            data-testid="button-dialog-confirm"
          >
            {loading ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
