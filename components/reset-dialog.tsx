import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as React from "react";
import { useEffect } from "react";

interface ResetDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (doNotShowAgain: boolean) => void;
  onOpenChange: (open: boolean) => void;
  showDoNotShowAgain?: boolean;
}

export function ResetDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onOpenChange,
  showDoNotShowAgain = true,
}: ResetDialogProps) {
  const [doNotShowAgain, setDoNotShowAgain] = React.useState(false);

  useEffect(() => {
    if (!open) setDoNotShowAgain(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {showDoNotShowAgain && (
          <div className="flex items-center gap-2 mb-2 mt-2">
            <Checkbox
              id="do-not-show-again"
              checked={doNotShowAgain}
              onCheckedChange={(checked) => setDoNotShowAgain(!!checked)}
            />
            <label
              htmlFor="do-not-show-again"
              className="text-sm select-none cursor-pointer"
            >
              Do not show this again
            </label>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{cancelLabel}</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm(doNotShowAgain);
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
