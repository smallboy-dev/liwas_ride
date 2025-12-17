"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { VendorTransaction } from "@/hooks/useVendorData";
import { Badge } from "@/components/ui/badge";

interface RemitDriverCashModalProps {
  transaction: VendorTransaction | null;
  onClose: () => void;
  onRemit: (transaction: VendorTransaction, signature: Blob) => Promise<void>;
}

function formatCurrency(amount?: number | null) {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "N/A";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

export function RemitDriverCashModal({ transaction, onClose, onRemit }: RemitDriverCashModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialiseCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = window.devicePixelRatio || 1;
    const { offsetWidth, offsetHeight } = canvas;
    canvas.width = offsetWidth * dpr;
    canvas.height = offsetHeight * dpr;
    context.resetTransform?.();
    context.scale(dpr, dpr);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, offsetWidth, offsetHeight);
    context.strokeStyle = "#111827";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    setHasSignature(false);
  }, []);

  useEffect(() => {
    if (!transaction) return;
    const frame = requestAnimationFrame(() => {
      initialiseCanvas();
      setError(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [transaction, initialiseCanvas]);

  const getPoint = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;
      const context = canvasRef.current.getContext("2d");
      if (!context) return;

      const point = getPoint(event);
      if (!point) return;

      event.preventDefault();
      canvasRef.current.setPointerCapture?.(event.pointerId);

      context.beginPath();
      context.moveTo(point.x, point.y);
      setIsDrawing(true);
      setHasSignature(true);
    },
    [getPoint]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !canvasRef.current) return;
      const context = canvasRef.current.getContext("2d");
      if (!context) return;
      const point = getPoint(event);
      if (!point) return;

      event.preventDefault();
      context.lineTo(point.x, point.y);
      context.stroke();
    },
    [isDrawing, getPoint]
  );

  const endDrawing = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !canvasRef.current) return;
      const context = canvasRef.current.getContext("2d");
      if (!context) return;

      event.preventDefault();
      context.closePath();
      setIsDrawing(false);
    },
    [isDrawing]
  );

  const handleClear = useCallback(() => {
    initialiseCanvas();
    setError(null);
  }, [initialiseCanvas]);

  const getSignatureBlob = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Signature pad not ready.");

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob || blob.size === 0) {
          reject(new Error("Signature is empty."));
        } else {
          resolve(blob);
        }
      }, "image/png");
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!transaction) return;

    if (!hasSignature) {
      setError("Capture your signature before submitting the remittance.");
      return;
    }

    try {
      setIsSubmitting(true);
      const signatureBlob = await getSignatureBlob();
      await onRemit(transaction, signatureBlob);
      onClose();
    } catch (err) {
      console.error(err);
      setError((err as Error)?.message ?? "Failed to submit remittance. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [transaction, hasSignature, getSignatureBlob, onRemit, onClose]);

  if (!transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Confirm Remittance</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sign below to confirm cash receipt from the driver.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Transaction ID</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100" title={transaction.id}>
                {transaction.id}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Status</p>
              <Badge className="mt-1 capitalize">
                {(transaction.status || "pending").replace(/-/g, " ")}
              </Badge>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Order</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {transaction.orderCode || transaction.orderId}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Driver</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {transaction.driverName || transaction.driverId || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Net Amount</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(transaction.netAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Commission</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {transaction.commissionAmount ? formatCurrency(transaction.commissionAmount) : "—"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Vendor Signature</p>
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/70 p-3">
              <canvas
                ref={canvasRef}
                className="h-48 w-full touch-none"
                style={{ touchAction: "none" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrawing}
                onPointerLeave={endDrawing}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Use your finger or mouse to sign.</span>
              <button
                type="button"
                onClick={handleClear}
                className="text-sm font-medium text-brand-primary-600 hover:text-brand-primary-700"
              >
                Clear signature
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-primary-600 rounded-lg hover:bg-brand-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit remittance"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
