import {
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  stockFeatures,
  sortFns,
  tableFeatures,
  type CellData,
  type Column,
  type ColumnDef,
  type Row,
  type RowData,
  type ReactTable,
} from "@tanstack/react-table";

export const dealTableFeatures = tableFeatures({
  ...stockFeatures,
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  filterFns,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns,
  sortedRowModel: createSortedRowModel(),
});

export type DealTableFeatures = typeof dealTableFeatures;
export type DealColumnDef<
  TData extends RowData,
  TValue extends CellData = CellData,
> = ColumnDef<DealTableFeatures, TData, TValue>;
export type DealColumn<TData extends RowData, TValue = unknown> = Column<
  DealTableFeatures,
  TData,
  TValue
>;
export type DealRow<TData extends RowData> = Row<DealTableFeatures, TData>;
export type DealTable<TData extends RowData> = ReactTable<
  DealTableFeatures,
  TData
>;
