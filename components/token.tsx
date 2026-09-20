"use client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Token = ({ token }: { token: string }) => {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label="Copy database token"
              className="my-2 w-full overflow-x-auto rounded bg-muted px-[0.3rem] py-[0.3rem] text-left"
              onClick={() => navigator.clipboard.writeText(token)}
            />
          }
        >
          <code className="break-all font-mono text-sm font-semibold">
            {token}
          </code>
        </TooltipTrigger>
        <TooltipContent>Click to copy</TooltipContent>
      </Tooltip>
    </div>
  );
};
