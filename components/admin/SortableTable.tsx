"use client";

import { useState, useMemo } from "react";

type SortDirection = "asc" | "desc" | null;
type SortableColumn<T> = keyof T;

interface SortableTableProps<T> {
  data: T[];
  columns: {
    key: SortableColumn<T>;
    label: string;
    sortable?: boolean;
    render?: (value: any, row: T) => React.ReactNode;
  }[];
  searchableFields?: (keyof T)[];
  title: string;
  emptyMessage?: string;
  loading?: boolean;
  onApprove?: (row: T) => Promise<void> | void;
  onReject?: (row: T) => Promise<void> | void;
  processingIds?: Set<string>;
}

export function SortableTable<T extends { id: string; userId: string; isApproved?: boolean }>({
  data,
  columns,
  searchableFields,
  title,
  emptyMessage = "No data available.",
  loading = false,
  onApprove,
  onReject,
  processingIds = new Set(),
}: SortableTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<SortableColumn<T> | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((row) => {
      if (!searchableFields || searchableFields.length === 0) {
        // If no specific fields, search all string values
        return Object.values(row).some((value) =>
          String(value).toLowerCase().includes(query)
        );
      }
      // Search only in specified fields
      return searchableFields.some((field) =>
        String(row[field] || "").toLowerCase().includes(query)
      );
    });
  }, [data, searchQuery, searchableFields]);

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === "asc" ? 1 : -1;
      if (bValue == null) return sortDirection === "asc" ? -1 : 1;

      // Compare values
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === "asc" ? comparison : -comparison;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      // Fallback to string comparison
      const aStr = String(aValue);
      const bStr = String(bValue);
      const comparison = aStr.localeCompare(bStr);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  const handleSort = (column: SortableColumn<T>) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: SortableColumn<T>) => {
    if (sortColumn !== column) {
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    if (sortDirection === "asc") {
      return (
        <svg
          className="w-4 h-4 text-brand-primary-600 dark:text-brand-primary-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      );
    }
    return (
      <svg
        className="w-4 h-4 text-brand-primary-600 dark:text-brand-primary-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-2xl font-semibold mb-4 sm:mb-0">{title}</h2>
          {searchableFields && searchableFields.length > 0 && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent w-full sm:w-64"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary-600"></div>
          </div>
        ) : sortedData.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 py-8 text-center">
            {searchQuery ? "No results found." : emptyMessage}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={String(column.key)}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                        column.sortable !== false
                          ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                          : ""
                      }`}
                      onClick={() =>
                        column.sortable !== false && handleSort(column.key)
                      }
                    >
                      <div className="flex items-center space-x-1">
                        <span>{column.label}</span>
                        {column.sortable !== false && getSortIcon(column.key)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedData.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className="px-6 py-4 whitespace-nowrap text-sm"
                      >
                        {column.render
                          ? column.render(row[column.key], row)
                          : String(row[column.key] || "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {searchQuery && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Showing {sortedData.length} of {data.length} results
          </p>
        )}
      </div>
    </div>
  );
}

