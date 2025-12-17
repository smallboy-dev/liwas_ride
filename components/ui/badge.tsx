import * as React from "react"
import { cn } from "@/lib/utils"

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: "border-transparent bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200",
  secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
  destructive: "border-transparent bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700",
  outline: "text-gray-900 border-gray-300 dark:text-gray-100 dark:border-gray-700",
  success: "border-transparent bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700",
  warning: "border-transparent bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700",
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        badgeVariants[variant],
        className
      )} 
      {...props} 
    />
  )
}

export { Badge }
