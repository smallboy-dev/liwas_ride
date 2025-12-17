"use client";

import { useMemo } from "react";
import { ChartCard } from "./ChartCard";
import { VendorData, DriverData, UserData } from "@/hooks/useAdminData";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface DashboardChartsProps {
  vendors: VendorData[];
  drivers: DriverData[];
  users: UserData[];
  totalUsers: number;
}

export function DashboardCharts({
  vendors,
  drivers,
  users,
  totalUsers,
}: DashboardChartsProps) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const vendorsByMonth = useMemo(() => {
    const data = months.map((month) => ({ month, count: 0 }));
    vendors.forEach((vendor) => {
      if (vendor.createdAt) {
        const date = vendor.createdAt.toDate ? vendor.createdAt.toDate() : new Date(vendor.createdAt);
        const idx = date.getMonth();
        if (idx >= 0 && idx < 12) data[idx].count += 1;
      }
    });
    return data;
  }, [vendors]);

  const driversByMonth = useMemo(() => {
    const data = months.map((month) => ({ month, count: 0 }));
    drivers.forEach((driver) => {
      if (driver.createdAt) {
        const date = driver.createdAt.toDate ? driver.createdAt.toDate() : new Date(driver.createdAt);
        const idx = date.getMonth();
        if (idx >= 0 && idx < 12) data[idx].count += 1;
      }
    });
    return data;
  }, [drivers]);

  const usersByWeekday = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const data = days.map((day) => ({ day, count: 0 }));
    users.forEach((user) => {
      if (user.createdAt) {
        const d = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
        const dayIdx = d.getDay(); // 0 Sun..6 Sat
        const idx = dayIdx === 0 ? 6 : dayIdx - 1;
        data[idx].count += 1;
      }
    });
    return data;
  }, [users]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="Vendors This Year" description="Monthly vendor registrations">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vendorsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Drivers This Year" description="Monthly driver registrations">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={driversByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="User Signups by Weekday" description="New users grouped by weekday">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={usersByWeekday}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Totals Snapshot" description="Quick comparative view">
        <div className="p-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center justify-between">
            <span>Vendors YTD</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {vendorsByMonth.reduce((s, d) => s + d.count, 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Drivers YTD</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {driversByMonth.reduce((s, d) => s + d.count, 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Users (all)</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {users.length}
            </span>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
