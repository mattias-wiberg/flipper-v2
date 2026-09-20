"use client";

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

const website_url = "https://flipper.mattiaswiberg.com";

function CopyCommand({
  command,
  display,
  platform,
}: {
  command: string;
  display: string;
  platform: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`Copy ${platform} command`}
            className="max-w-full overflow-x-auto rounded bg-muted px-[0.3rem] py-[0.2rem] text-left font-mono text-sm break-all"
            onClick={() => {
              navigator.clipboard.writeText(command);
            }}
          />
        }
      >
        <code>{display}</code>
      </TooltipTrigger>
      <TooltipContent>Click to copy</TooltipContent>
    </Tooltip>
  );
}

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
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center justify-between gap-4 rounded px-2 py-2 text-left transition hover:bg-muted"
          />
        }
      >
        <span className="text-sm font-semibold">{title}</span>
        <span className="flex size-8 items-center justify-center rounded transition hover:bg-accent">
          {isOpen ? <ChevronUp /> : <ChevronDown />}
          <span className="sr-only">Toggle {title}</span>
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="ml-8 list-decimal text-sm [&>li]:mt-2">
          {listItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const TokenTutorial = ({ token }: { token: string }) => {
  const windowsCommand =
    "\\Program` Files\\Albion` Data` Client\\albiondata-client.exe -i " +
    website_url +
    "/api/" +
    token;
  const macCommand =
    "/Applications/Albion\\ Data\\ Client.app/Contents/MacOS/albiondata-client -i " +
    website_url +
    "/api/" +
    token;
  const macDisplay = String.raw`/Applications/Albion\ Data\ Client.app/Contents/MacOS/albiondata-client -i ${website_url}/api/${token}`;
  const linuxCommand =
    "/opt/Albion\\ Data\\ Client/albiondata-client -i " +
    website_url +
    "/api/" +
    token;
  const linuxDisplay = String.raw`/opt/Albion\ Data\ Client/albiondata-client -i ${website_url}/api/${token}`;

  return (
    <div className="flex w-full flex-1 flex-col gap-2">
      <TutorialItem
        title="Windows"
        listItems={[
          <>
            Open Windows PowerShell. Keybinding
            <code className="ml-1 rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
              Win + x A
            </code>
          </>,
          <div className="flex flex-col items-start gap-1">
            Copy and paste the following command into the terminal:
            <CopyCommand
              command={windowsCommand}
              display={`\\Program Files\\Albion Data Client\\albiondata-client.exe -i ${website_url}/api/${token}`}
              platform="Windows"
            />
            <span className="text-sm text-muted-foreground">
              Tip: You can save the above command as a batch file (.bat) for
              easy access.
            </span>
          </div>,
        ]}
      />
      <TutorialItem
        title="Mac OS"
        listItems={[
          <>
            Open the terminal. Keybinding{" "}
            <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
              Cmd + Space
            </code>
          </>,
          <div className="flex flex-col items-start gap-1">
            Copy and paste the following command into the terminal:
            <CopyCommand
              command={macCommand}
              display={macDisplay}
              platform="macOS"
            />
            <span className="text-sm text-muted-foreground">
              Tip: You can save the above command as a shell script (.sh) for
              easy access.
            </span>
          </div>,
        ]}
      />
      <TutorialItem
        title="Linux"
        listItems={[
          <>
            Open the terminal. Keybinding{" "}
            <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
              Ctrl + Alt + T
            </code>
          </>,
          <div className="flex flex-col items-start gap-1">
            Copy and paste the following command into the terminal:
            <CopyCommand
              command={linuxCommand}
              display={linuxDisplay}
              platform="Linux"
            />
            <span className="text-sm text-muted-foreground">
              Tip: You can save the above command as a shell script (.sh) for
              easy access.
            </span>
          </div>,
        ]}
      />
    </div>
  );
};
