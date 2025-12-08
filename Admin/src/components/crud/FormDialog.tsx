import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  isEdit?: boolean;
  loading?: boolean;
}

export function FormDialog({
  open,
  onClose,
  onSubmit,
  title,
  description,
  children,
  isEdit = false,
  loading = false,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-4 py-4">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
