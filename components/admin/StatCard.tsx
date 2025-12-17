"use client";

import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconBgColor?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  className,
  iconBgColor = "bg-brand-primary-100 dark:bg-brand-primary-900",
}: StatCardProps) {
  return (
    <Card className={cn("hover:shadow-lg transition-shadow duration-300", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              {title}
            </p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
              {trend && (
                <span
                  className={cn(
                    "text-sm font-medium whitespace-nowrap",
                    trend.isPositive
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
              )}
            </div>
          </div>
          <div
            className={cn(
              "p-3 rounded-lg flex-shrink-0",
              iconBgColor
            )}
          >
            <div className="text-brand-primary-600 dark:text-brand-primary-400">
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

