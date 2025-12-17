"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { ChartCard } from "@/components/admin/ChartCard";
import { DriverOrder } from "@/hooks/useDriverData";
import { DriverTransaction } from "@/hooks/useDriverData";

interface DriverChartsProps {
  activeDeliveries: DriverOrder[];
  transactions: DriverTransaction[];
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function DriverCharts({ activeDeliveries, transactions }: DriverChartsProps) {
  const deliveriesByMonth = useMemo(() => {
    const map = new Map<string, number>();
    activeDeliveries.forEach((o) => {
      if (!o.createdAt) return;
      const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      const key = getMonthKey(d);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort()
      .map(([month, count]) => ({ month, count }));
  }, [activeDeliveries]);

  const earningsByMonth = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => {
      if (!t.createdAt) return;
      const d = t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      const key = getMonthKey(d);
      const net = Number(t.netAmount || 0);
      map.set(key, (map.get(key) || 0) + net);
    });
    return Array.from(map.entries())
      .sort()
      .map(([month, value]) => ({ month, value }));
  }, [transactions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="Deliveries by Month" description="Deliveries per month">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deliveriesByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Earnings by Month" description="Net earnings per month">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={earningsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

