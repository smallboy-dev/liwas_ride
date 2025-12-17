"use client";

export type DriverStatus = "available" | "busy" | "inactive";

interface StatusSelectorProps {
  status: DriverStatus;
  onChange: (status: DriverStatus) => void;
  disabled?: boolean;
}

const statusConfig: Record<DriverStatus, { label: string; color: string; bgColor: string }> = {
  available: {
    label: "Available",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  busy: {
    label: "Busy",
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  inactive: {
    label: "Not Active",
    color: "text-gray-700 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
  },
};

export function StatusSelector({ status, onChange, disabled = false }: StatusSelectorProps) {
  const statuses: DriverStatus[] = ["available", "busy", "inactive"];

  return (
    <div className="flex items-center space-x-2">
      {statuses.map((s) => (
        <button
          key={s}
          onClick={() => !disabled && onChange(s)}
          disabled={disabled}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            status === s
              ? `${statusConfig[s].color} ${statusConfig[s].bgColor} ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-current`
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {statusConfig[s].label}
        </button>
      ))}
    </div>
  );
}
