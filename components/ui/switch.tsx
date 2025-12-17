import * as React from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Switch({
  checked = false,
  onCheckedChange,
  disabled,
  className,
  onClick,
  onKeyDown,
  ...props
}: SwitchProps) {
  const handleToggle = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      onCheckedChange?.(!checked);
    },
    [checked, disabled, onCheckedChange]
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      handleToggle(event);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      handleToggle(event);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      data-state={checked ? "checked" : "unchecked"}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full border border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",
        "bg-gray-200 dark:bg-gray-700",
        checked && "bg-blue-600",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
}
