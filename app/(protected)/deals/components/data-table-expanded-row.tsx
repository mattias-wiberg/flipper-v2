import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Row } from "@tanstack/react-table";
import { dealSchema } from "../data/schema";
interface DealExpandedRowProps<TData> {
  row: Row<TData>;
}

export function DealExpandedRow<TData>({ row }: DealExpandedRowProps<TData>) {
  const deal = dealSchema.parse(row.original);
  return (
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
        <TableRow>
          <TableCell className="font-medium">Sell Order</TableCell>
          <TableCell>{deal.sellOrder.qualityLevel}</TableCell>
          <TableCell>{deal.sellOrder.enchantmentLevel}</TableCell>
          <TableCell>{deal.sellOrder.price}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Buy Order</TableCell>
          <TableCell>{deal.buyOrder.qualityLevel}</TableCell>
          <TableCell>{deal.buyOrder.enchantmentLevel}</TableCell>
          <TableCell>{deal.buyOrder.price}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
