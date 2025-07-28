import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";

import { getEnchantmentName, getQualityName } from "@/lib/items";
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
        <Image width={128} height={128} src={previewImg} alt="Preview" />
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
            <TableHead>Quality</TableHead>
            <TableHead>Enchantment</TableHead>
            <TableHead>Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            { text: "Sell Order", order: deal.sellOrder },
            { text: "Buy Order", order: deal.buyOrder },
          ].map(({ text, order }, index) => (
            <TableRow key={index}>
              <TableCell
                className="text-muted-foreground font-medium flex items-center gap-2 w-fit"
                onMouseEnter={() =>
                  setPreviewImg(
                    `https://render.albiononline.com/v1/item/${order.itemTypeId}.png`
                  )
                }
                onMouseLeave={() => setPreviewImg(null)}
                onMouseMove={handleMouseMove}
              >
                <Image
                  width={24}
                  height={24}
                  src={`https://render.albiononline.com/v1/item/${order.itemTypeId}.png`}
                  alt={order.itemTypeId}
                />
                {text}
              </TableCell>
              <TableCell>
                {getQualityName(order.qualityLevel)} ({order.qualityLevel})
              </TableCell>
              <TableCell>
                {getEnchantmentName(order.enchantmentLevel)} (
                {order.enchantmentLevel})
              </TableCell>
              <TableCell>{order.price}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};
