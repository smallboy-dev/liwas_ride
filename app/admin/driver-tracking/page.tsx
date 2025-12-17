"use client";

import { useEffect, useMemo, useState } from "react";
import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import { firestore } from "@/firebase/init";
import { Badge } from "@/components/ui/badge";

interface DriverLocation {
  id: string;
  driverId: string;
  driverEmail?: string;
  lat: number;
  lng: number;
  updatedAt?: any;
  status?: string;
}

export default function DriverTrackingPage() {
  const { loading: authLoading, isFullyAuthorized } = useRequireRoleAndApproval(
    ["admin"],
    false
  );
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = collection(firestore, "driverLocations");
    const q = query(ref, orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        try {
          const data = snapshot.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              driverId: d.driverId || doc.id,
              driverEmail: d.driverEmail || "",
              lat: d.lat,
              lng: d.lng,
              updatedAt: d.updatedAt,
              status: d.status || "unknown",
            } as DriverLocation;
          });
          setLocations(data);
          setLoading(false);
          setError(null);
        } catch (err: any) {
          console.error("Error processing driver locations:", err);
          setError(err.message || "Failed to process driver locations");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Driver locations snapshot error:", err);
        setError(err.message || "Failed to fetch driver locations");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    const total = locations.length;
    const active = locations.filter((l) => l.status === "available" || l.status === "busy").length;
    return { total, active };
  }, [locations]);

  if (authLoading || !isFullyAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {authLoading ? "Loading..." : "Redirecting..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout pageTitle="Driver Tracking">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Driver Tracking</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time driver locations (requires drivers to publish location)
            </p>
          </div>
          <div className="flex space-x-3 text-sm">
            <span className="px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              Total: {stats.total}
            </span>
            <span className="px-3 py-1 rounded-lg bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
              Active: {stats.active}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary-600" />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
            <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
              Note: Map view not enabled. Add NEXT_PUBLIC_MAPS_API_KEY and driver location publishing to enable maps.
            </div>
            {locations.map((loc) => {
              const updated =
                loc.updatedAt?.toDate?.() instanceof Date
                  ? loc.updatedAt.toDate()
                  : loc.updatedAt
                  ? new Date(loc.updatedAt)
                  : null;
              return (
                <div key={loc.id} className="px-4 py-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {loc.driverEmail || loc.driverId}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {loc.lat?.toFixed?.(5)}, {loc.lng?.toFixed?.(5)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {updated ? updated.toLocaleString() : "—"}
                    </div>
                  </div>
                  <Badge variant={loc.status === "available" ? "success" : loc.status === "busy" ? "warning" : "default"}>
                    {loc.status || "unknown"}
                  </Badge>
                </div>
              );
            })}
            {locations.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-400">
                No driver locations found. Ensure drivers publish location to the `driverLocations` collection.
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

