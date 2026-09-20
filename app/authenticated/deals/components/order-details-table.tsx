import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { getEnchantmentName, getQualityName } from "@/lib/items";
import { formatNumber, formatTimeDelta } from "@/lib/locale";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { Deal } from "../data/schema";

interface DealOrderTableProps {
  deal: Deal;
}

export const DealOrderTable = ({ deal }: DealOrderTableProps) => {
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Handler for mouse move to update preview position
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  // Render the preview image near the mouse
  const renderPreview = () => {
    if (!previewImg) return null;
    return (
      <div
        style={{
          position: "fixed",
          left: mousePos.x + 2,
          top: mousePos.y + 2,
          pointerEvents: "none",
          zIndex: 1000,
        }}
      >
        <img width={128} height={128} src={previewImg} alt="Preview" />
      </div>
    );
  };

  return (
    <>
      {renderPreview()}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Enchantment</TableHead>
            <TableHead>Quality</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                Age
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 cursor-help"
                        aria-label="About order age"
                      />
                    }
                  >
                    <HelpCircle aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Shows how long ago the order was added to the database.
                  </TooltipContent>
                </Tooltip>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            { text: "Sell Order", order: deal.sellOrder },
            { text: "Buy Order", order: deal.buyOrder },
          ].map(({ text, order }, index) => (
            <TableRow key={index}>
              <TableCell className="text-muted-foreground font-medium">
                <div
                  className="flex w-fit items-center gap-2"
                  onMouseEnter={() =>
                    setPreviewImg(
                      `https://render.albiononline.com/v1/item/${order.itemTypeId}.png`,
                    )
                  }
                  onMouseLeave={() => setPreviewImg(null)}
                  onMouseMove={handleMouseMove}
                >
                  <img
                    width={24}
                    height={24}
                    src={`https://render.albiononline.com/v1/item/${order.itemTypeId}.png`}
                    alt={order.itemTypeId}
                  />
                  {text}
                </div>
              </TableCell>
              <TableCell>
                {getEnchantmentName(order.enchantmentLevel)}{" "}
                <span className="text-muted-foreground">
                  ({order.enchantmentLevel})
                </span>
              </TableCell>
              <TableCell>
                {getQualityName(order.qualityLevel)}{" "}
                <span className="text-muted-foreground">
                  ({order.qualityLevel})
                </span>
              </TableCell>
              <TableCell>{formatNumber(order.price)}</TableCell>
              <TableCell>
                {formatTimeDelta(Date.now() - order.createdAt.getTime())}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};
