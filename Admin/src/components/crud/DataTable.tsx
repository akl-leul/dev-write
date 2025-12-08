import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Edit,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onRowClick?: (item: T) => void;
  onBulkDelete?: (items: T[]) => void;
  onBulkActions?: (items: T[]) => { label: string; action: () => void; variant?: "default" | "destructive" | "outline" }[];
  title: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  onRowClick,
  onBulkDelete,
  onBulkActions,
  title,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredData = data.filter((item) =>
    Object.values(item).some((value) =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  const getValue = (item: T, key: string) => {
    const keys = key.split(".");
    let value: unknown = item;
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }
    return value;
  };

  const allSelected = paginatedData.length > 0 && paginatedData.every((item) => selectedIds.has(item.id));
  const someSelected = paginatedData.some((item) => selectedIds.has(item.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map((item) => item.id)));
    }
  };

  const toggleOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = () => {
    const selectedItems = data.filter((item) => selectedIds.has(item.id));
    if (onBulkDelete) {
      onBulkDelete(selectedItems);
    }
    setSelectedIds(new Set());
  };

  const exportToCSV = () => {
    const headers = columns.map((col) => col.header).join(",");
    const rows = filteredData.map((item) =>
      columns
        .map((col) => {
          const value = getValue(item, String(col.key));
          return `"${String(value ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase()}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV");
  };

  const exportToJSON = () => {
    const json = JSON.stringify(filteredData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase()}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to JSON");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 sm:w-64"
            />
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              {onBulkActions && (
                <div className="flex items-center gap-1">
                  {onBulkActions(data.filter((item) => selectedIds.has(item.id))).map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant || "outline"}
                      size="sm"
                      onClick={action.action}
                      className="gap-1"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
              {onBulkDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToCSV}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToJSON}>
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={onAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add {title}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                  className={someSelected && !allSelected ? "opacity-50" : ""}
                />
              </TableHead>
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className="font-semibold text-card-foreground"
                >
                  {column.header}
                </TableHead>
              ))}
              <TableHead className="w-24 text-right font-semibold text-card-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 2}
                  className="h-32 text-center text-muted-foreground"
                >
                  No data found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow
                  key={item.id}
                  className={`hover:bg-muted/30 ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={(e) => {
                    if (
                      (e.target as HTMLElement).closest("button") ||
                      (e.target as HTMLElement).closest('[role="checkbox"]')
                    ) {
                      return;
                    }
                    onRowClick?.(item);
                  }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleOne(item.id)}
                      aria-label={`Select row ${item.id}`}
                    />
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      {column.render
                        ? column.render(item)
                        : String(getValue(item, String(column.key)) ?? "-")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(item)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(startIndex + pageSize, filteredData.length)}{" "}
            of {filteredData.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(1)}
            disabled={page === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = page <= 3 ? i + 1 : page - 2 + i;
            if (pageNum > totalPages || pageNum < 1) return null;
            return (
              <Button
                key={pageNum}
                variant={pageNum === page ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
