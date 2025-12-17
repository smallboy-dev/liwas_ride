"use client";

import { firestore, storage } from "@/firebase/init";
import {
  doc,
  updateDoc,
  serverTimestamp,
  increment,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type RemittanceActor = "driver" | "vendor";

interface RemitCodPaymentParams {
  driverId: string;
  driverTransactionId: string;
  vendorTransactionId?: string | null;
  netAmount: number;
  signature: Blob;
  actor?: RemittanceActor;
  vendorId?: string | null;
  orderId?: string | null;
}

export async function remitCodPayment({
  driverId,
  driverTransactionId,
  vendorTransactionId,
  netAmount,
  signature,
  actor = "driver",
  vendorId = null,
  orderId = null,
}: RemitCodPaymentParams) {
  if (!driverId) {
    throw new Error("Driver ID is required to remit cash.");
  }

  if (!driverTransactionId) {
    throw new Error("Driver transaction ID is required to remit cash.");
  }

  const isVendorActor = actor === "vendor";

  if (isVendorActor && !vendorId) {
    throw new Error("Vendor ID is required to submit vendor remittance.");
  }

  const safeNetAmount = Number.isFinite(netAmount) ? Number(netAmount) : 0;

  const timestampMillis = Date.now();
  const signatureFileName = isVendorActor
    ? `vendor-signature-${timestampMillis}.png`
    : `signature-${timestampMillis}.png`;
  const signaturePath = `drivers/${driverId}/remittances/${driverTransactionId}/${signatureFileName}`;
  const signatureRef = ref(storage, signaturePath);

  await uploadBytes(signatureRef, signature, {
    contentType: "image/png",
  });

  const signatureUrl = await getDownloadURL(signatureRef);

  const timestamp = serverTimestamp();

  let resolvedVendorTransactionId = vendorTransactionId ?? null;
  let vendorTransactionRef = resolvedVendorTransactionId
    ? doc(firestore, "vendorTransactions", resolvedVendorTransactionId)
    : null;

  if (!vendorTransactionRef) {
    try {
      const byDriverTransaction = query(
        collection(firestore, "vendorTransactions"),
        where("driverTransactionId", "==", driverTransactionId),
        limit(1)
      );
      const byDriverSnapshot = await getDocs(byDriverTransaction);
      if (!byDriverSnapshot.empty) {
        const matchedDoc = byDriverSnapshot.docs[0];
        vendorTransactionRef = matchedDoc.ref;
        resolvedVendorTransactionId = matchedDoc.id;
      }
    } catch (error) {
      console.error("Failed to locate vendor transaction by driver transaction ID", error);
    }
  }

  if (!vendorTransactionRef && orderId) {
    try {
      const byOrderQuery = query(
        collection(firestore, "vendorTransactions"),
        where("orderId", "==", orderId),
        limit(1)
      );
      const byOrderSnapshot = await getDocs(byOrderQuery);
      if (!byOrderSnapshot.empty) {
        const matchedDoc = byOrderSnapshot.docs[0];
        vendorTransactionRef = matchedDoc.ref;
        resolvedVendorTransactionId = matchedDoc.id;
      }
    } catch (error) {
      console.error("Failed to locate vendor transaction by order ID", error);
    }
  }

  const driverTransactionUpdate: Record<string, unknown> = {
    updatedAt: timestamp,
  };

  if (resolvedVendorTransactionId) {
    driverTransactionUpdate.vendorTransactionId = resolvedVendorTransactionId;
  }

  if (isVendorActor) {
    driverTransactionUpdate.status = "reconciled";
    driverTransactionUpdate.vendorConfirmedAt = timestamp;
    driverTransactionUpdate.vendorConfirmedBy = vendorId;
    driverTransactionUpdate.vendorConfirmationSignatureUrl = signatureUrl;
    driverTransactionUpdate.vendorConfirmationSignaturePath = signaturePath;
  } else {
    driverTransactionUpdate.status = "remitted";
    driverTransactionUpdate.remittedAt = timestamp;
    driverTransactionUpdate.remittedBy = driverId;
    driverTransactionUpdate.remittanceSignatureUrl = signatureUrl;
    driverTransactionUpdate.remittanceSignaturePath = signaturePath;
  }

  await updateDoc(doc(firestore, "driverTransactions", driverTransactionId), driverTransactionUpdate);

  if (vendorTransactionRef) {
    try {
      const vendorTransactionUpdate: Record<string, unknown> = {
        updatedAt: timestamp,
        driverTransactionId,
      };

      if (isVendorActor) {
        vendorTransactionUpdate.status = "reconciled";
        vendorTransactionUpdate.vendorConfirmedAt = timestamp;
        vendorTransactionUpdate.vendorConfirmedBy = vendorId;
        vendorTransactionUpdate.vendorConfirmationSignatureUrl = signatureUrl;
        vendorTransactionUpdate.vendorConfirmationSignaturePath = signaturePath;
      } else {
        vendorTransactionUpdate.status = "remitted";
        vendorTransactionUpdate.remittedAt = timestamp;
        vendorTransactionUpdate.remittedBy = driverId;
        vendorTransactionUpdate.remittanceSignatureUrl = signatureUrl;
        vendorTransactionUpdate.remittanceSignaturePath = signaturePath;
      }

      await updateDoc(vendorTransactionRef, vendorTransactionUpdate);
    } catch (error) {
      console.error(
        "Failed to update linked vendor transaction during remittance",
        error
      );
    }
  } else if (resolvedVendorTransactionId) {
    console.warn(
      `Vendor transaction ${resolvedVendorTransactionId} could not be updated despite being resolved.`
    );
  }

  // Ensure driver transaction links the vendor document if it was resolved via fallback
  if (!vendorTransactionId && resolvedVendorTransactionId) {
    try {
      await updateDoc(doc(firestore, "driverTransactions", driverTransactionId), {
        vendorTransactionId: resolvedVendorTransactionId,
        updatedAt: timestamp,
      });
    } catch (error) {
      console.error("Failed to backfill vendorTransactionId on driver transaction", error);
    }
  }

  if (!isVendorActor) {
    try {
      await updateDoc(doc(firestore, "drivers", driverId), {
        cashOnHand: increment(-Math.abs(safeNetAmount)),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Failed to update driver cash on hand during remittance", error);
    }
  }

  return { signatureUrl, signaturePath };
}
