"use client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Token = ({ token }: { token: string }) => {
  return (
    <div className="flex gap-2 w-full items-center justify-between">
      <Tooltip>
        <TooltipTrigger className="w-full bg-muted rounded my-2 px-[0.3rem] py-[0.3rem] ">
          <code
            className="font-mono text-sm font-semibold"
            onClick={() => navigator.clipboard.writeText(token)}
          >
            {token}
          </code>
        </TooltipTrigger>
        <TooltipContent>Click to copy</TooltipContent>
      </Tooltip>
    </div>
  );
};
