"use client";

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
  const doNotShowAgainId = React.useId();

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
          <div className="mt-2 mb-2 flex items-center gap-2">
            <Checkbox
              id={`do-not-show-again-${doNotShowAgainId}`}
              checked={doNotShowAgain}
              onCheckedChange={(checked) => setDoNotShowAgain(!!checked)}
            />
            <label
              htmlFor={`do-not-show-again-${doNotShowAgainId}`}
              className="cursor-pointer text-sm select-none"
            >
              Do not show this again
            </label>
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {cancelLabel}
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
