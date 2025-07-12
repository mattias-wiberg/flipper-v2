"use client";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, ChevronUp } from "lucide-react";
import React from "react";

const TutorialItem = ({
  title,
  listItems,
}: {
  title: string;
  listItems: React.ReactNode[];
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between gap-4 cursor-pointer">
          <h4 className="text-sm font-semibold">{title}</h4>
          <Button variant="ghost" size="icon" className="size-8">
            {isOpen ? <ChevronUp /> : <ChevronDown />}
            <span className="sr-only">Toggle</span>
          </Button>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="ml-8 list-decimal [&>li]:mt-2 text-sm">
          {listItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const TokenTutorial = ({ token }: { token: string }) => {
  return (
    <div className="flex-1 w-full flex flex-col gap-2 ml-2">
      <TutorialItem
        title="Windows"
        listItems={[
          <>
            Open the command prompt (cmd) or PowerShell.
            <br />
            Keybinding{" "}
            <code className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm">
              Win + x A
            </code>
          </>,
          <>
            Copy and paste the following command into the terminal:
            <Tooltip>
              <TooltipTrigger>
                <code
                  className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      "\\Program` Files\\Albion` Data` Client\\albiondata-client.exe -i http://localhost:3000/api/" +
                        token
                    );
                  }}
                >
                  \Program` Files\Albion` Data` Client\albiondata-client.exe -i
                  http://localhost:3000/api/{token}
                </code>
              </TooltipTrigger>
              <TooltipContent>Click to copy</TooltipContent>
            </Tooltip>
            <span className="text-sm text-muted-foreground">
              Tip: You can save the above command as a batch file (.bat) for
              easy access.
            </span>
          </>,
        ]}
      />
      <TutorialItem
        title="Mac OS"
        listItems={[
          <>
            Open the terminal.
            <br />
            Keybinding{" "}
            <code className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm">
              Cmd + Space
            </code>
          </>,
          <>
            Copy and paste the following command into the terminal:
            <Tooltip>
              <TooltipTrigger>
                <code
                  className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      "/Applications/Albion\\ Data\\ Client.app/Contents/MacOS/albiondata-client -i http://localhost:3000/api/" +
                        token
                    );
                  }}
                >
                  /Applications/Albion\ Data\
                  Client.app/Contents/MacOS/albiondata-client -i
                  http://localhost:3000/api/{token}
                </code>
              </TooltipTrigger>
              <TooltipContent>Click to copy</TooltipContent>
            </Tooltip>
            <span className="text-sm text-muted-foreground">
              Tip: You can save the above command as a shell script (.sh) for
              easy access.
            </span>
          </>,
        ]}
      />
      <TutorialItem
        title="Linux"
        listItems={[
          <>
            Open the terminal.
            <br />
            Keybinding{" "}
            <code className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm">
              Ctrl + Alt + T
            </code>
          </>,
          <>
            Copy and paste the following command into the terminal:
            <Tooltip>
              <TooltipTrigger>
                <code
                  className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      "/opt/Albion\\ Data\\ Client/albiondata-client -i http://localhost:3000/api/" +
                        token
                    );
                  }}
                >
                  /opt/Albion\ Data\ Client/albiondata-client -i
                  http://localhost:3000/api/{token}
                </code>
              </TooltipTrigger>
              <TooltipContent>Click to copy</TooltipContent>
            </Tooltip>
            <span className="text-sm text-muted-foreground">
              Tip: You can save the above command as a shell script (.sh) for
              easy access.
            </span>
          </>,
        ]}
      />
    </div>
  );
};
