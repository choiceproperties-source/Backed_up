import { useState, useMemo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from './empty-state';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Trash2,
  Edit,
  Eye,
  FileText,
  RefreshCw,
  Loader2,
  type LucideIcon,
} from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: T) => ReactNode;
  editable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  searchKeys?: string[];
  pageSize?: number;
  selectable?: boolean;
  onRowSelect?: (selectedIds: string[]) => void;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onView?: (row: T) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  customActions?: (row: T) => ReactNode;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  headerActions?: ReactNode;
  getRowId?: (row: T) => string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  title,
  description,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  pageSize = 10,
  selectable = false,
  onRowSelect,
  onRowClick,
  onEdit,
  onDelete,
  onView,
  onRefresh,
  onExport,
  customActions,
  emptyIcon = FileText,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no items to display.',
  headerActions,
  getRowId = (row) => row.id,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredData = useMemo(() => {
    if (!search) return data;

    const searchLower = search.toLowerCase();
    const keys = searchKeys.length > 0 ? searchKeys : columns.map((c) => c.key);

    return data.filter((row) =>
      keys.some((key) => {
        const value = row[key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchLower);
      })
    );
  }, [data, search, searchKeys, columns]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = String(aVal).localeCompare(String(bVal), undefined, {
        numeric: true,
        sensitivity: 'base',
      });

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    let updatedSelected: Set<string>;
    if (selectedIds.size === paginatedData.length) {
      updatedSelected = new Set();
    } else {
      updatedSelected = new Set(paginatedData.map((row) => getRowId(row)));
    }
    setSelectedIds(updatedSelected);
    onRowSelect?.(Array.from(updatedSelected));
  };

  const toggleSelect = (id: string) => {
    const updatedSelected = new Set(selectedIds);
    if (updatedSelected.has(id)) {
      updatedSelected.delete(id);
    } else {
      updatedSelected.add(id);
    }
    setSelectedIds(updatedSelected);
    onRowSelect?.(Array.from(updatedSelected));
  };

  const hasActions = onEdit || onDelete || onView || customActions;

  if (loading) {
    return (
      <Card data-testid="data-table-loading">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            {title && <Skeleton className="h-6 w-40" />}
            {description && <Skeleton className="h-4 w-60" />}
          </div>
          <Skeleton className="h-10 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="data-table">
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          {title && <CardTitle data-testid="table-title">{title}</CardTitle>}
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 w-64"
              data-testid="input-table-search"
            />
          </div>

          {onRefresh && (
            <Button variant="outline" size="icon" onClick={onRefresh} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}

          {headerActions}
        </div>
      </CardHeader>

      <CardContent>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-4 p-3 mb-4 rounded-lg bg-muted" data-testid="bulk-actions">
            <span className="text-sm font-medium">
              {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  selectedIds.forEach((id) => {
                    const row = data.find((r) => getRowId(r) === id);
                    if (row) onDelete(row);
                  });
                  setSelectedIds(new Set());
                }}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              data-testid="button-clear-selection"
            >
              Clear
            </Button>
          </div>
        )}

        {sortedData.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectable && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            paginatedData.length > 0 &&
                            selectedIds.size === paginatedData.length
                          }
                          onCheckedChange={toggleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                    )}
                    {columns.map((column) => (
                      <TableHead
                        key={column.key}
                        style={{ width: column.width }}
                        className={cn(column.sortable && 'cursor-pointer select-none')}
                        onClick={() => column.sortable && handleSort(column.key)}
                        data-testid={`header-${column.key}`}
                      >
                        <div className="flex items-center gap-1">
                          {column.header}
                          {column.sortable && (
                            <>
                              {sortKey === column.key ? (
                                sortDirection === 'asc' ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : (
                                  <ArrowDown className="h-4 w-4" />
                                )
                              ) : (
                                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </>
                          )}
                        </div>
                      </TableHead>
                    ))}
                    {hasActions && <TableHead className="w-12" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row) => {
                    const rowId = getRowId(row);
                    return (
                      <TableRow
                        key={rowId}
                        className={cn(
                          onRowClick && 'cursor-pointer',
                          selectedIds.has(rowId) && 'bg-muted/50'
                        )}
                        onClick={() => onRowClick?.(row)}
                        data-testid={`row-${rowId}`}
                      >
                        {selectable && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(rowId)}
                              onCheckedChange={() => toggleSelect(rowId)}
                              data-testid={`checkbox-${rowId}`}
                            />
                          </TableCell>
                        )}
                        {columns.map((column) => (
                          <TableCell key={column.key} data-testid={`cell-${column.key}-${rowId}`}>
                            {column.render
                              ? column.render(row[column.key], row)
                              : row[column.key] ?? '-'}
                          </TableCell>
                        ))}
                        {hasActions && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  data-testid={`button-actions-${rowId}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {onView && (
                                  <DropdownMenuItem onClick={() => onView(row)} data-testid="action-view">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                )}
                                {onEdit && (
                                  <DropdownMenuItem onClick={() => onEdit(row)} data-testid="action-edit">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {customActions?.(row)}
                                {onDelete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => onDelete(row)}
                                      className="text-destructive focus:text-destructive"
                                      data-testid="action-delete"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4" data-testid="pagination">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, sortedData.length)} of{' '}
                {sortedData.length} results
              </p>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  data-testid="button-first-page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  data-testid="button-last-page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
