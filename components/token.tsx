"use client";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CopyIcon } from "lucide-react";

export const Token = ({ token }: { token: string }) => {
  return (
    <div className="flex gap-2 w-full items-center justify-between">
      <code className="bg-muted relative rounded my-2 px-[0.3rem] py-[0.3rem] font-mono text-sm font-semibold w-full">
        {token}
      </code>
      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => navigator.clipboard.writeText(token)}
          >
            <CopyIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Click to copy</TooltipContent>
      </Tooltip>
    </div>
  );
};
