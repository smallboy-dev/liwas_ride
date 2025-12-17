/**
 * Utility functions for the application
 */

import { clsx, type ClassValue } from "clsx";

/**
 * Combines class names into a single string
 * Utility function for conditional class names
 * Uses clsx for robust class name handling
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Generates an 8-digit order code with # prefix
 * Format: #12345678
 * Ensures the code doesn't start with "00" and is randomized
 * Range: 10000000-99999999 (first digit is always 1-9, preventing "00" start)
 */
export function generateOrderCode(): string {
  // Generate a random 8-digit number
  // Range: 10000000 to 99999999 ensures:
  // - First digit is always 1-9 (never 0)
  // - Code never starts with "00"
  // - Fully randomized
  const min = 10000000; // 8 digits minimum, first digit is 1
  const max = 99999999; // 8 digits maximum
  const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
  
  // Double-check: ensure it doesn't start with "00" (shouldn't happen with this range, but safety check)
  const codeStr = randomNum.toString();
  if (codeStr.substring(0, 2) === "00") {
    // Replace first two digits with random 1-9
    const firstDigit = Math.floor(Math.random() * 9) + 1; // 1-9
    const secondDigit = Math.floor(Math.random() * 9) + 1; // 1-9
    return `#${firstDigit}${secondDigit}${codeStr.substring(2)}`;
  }
  
  return `#${randomNum}`;
}

/**
 * Formats an order ID to display format
 * If it's already in #12345678 format, returns as is
 * If it's a Firestore document ID, extracts first 8 digits or generates a code
 * Otherwise, formats to #12345678 format
 * Ensures the code doesn't start with "00"
 */
export function formatOrderId(orderId: string | null | undefined): string {
  if (!orderId) {
    // Generate a random code instead of #00000000
    return generateOrderCode();
  }
  
  // If already in #12345678 format, check if it starts with 00
  if (/^#\d{8}$/.test(orderId)) {
    const digits = orderId.substring(1); // Remove #
    if (digits.substring(0, 2) === "00") {
      // Replace first digit with random 1-9
      const firstDigit = Math.floor(Math.random() * 9) + 1;
      return `#${firstDigit}${digits.substring(1)}`;
    }
    return orderId;
  }
  
  // If it's a long Firestore ID, try to extract meaningful digits
  // or use a hash-based approach for consistency
  if (orderId.length > 8) {
    // Use first 8 numeric characters found
    const digits = orderId.replace(/\D/g, '').slice(0, 8);
    if (digits.length >= 8) {
      const code = digits.slice(0, 8);
      // Ensure it doesn't start with 00
      if (code.substring(0, 2) === "00") {
        const firstDigit = Math.floor(Math.random() * 9) + 1;
        return `#${firstDigit}${code.substring(1)}`;
      }
      return `#${code}`;
    }
    // If not enough digits, generate random code
    return generateOrderCode();
  }
  
  // If it's a short numeric string, pad to 8 digits
  const numericOnly = orderId.replace(/\D/g, '');
  if (numericOnly.length > 0) {
    const padded = numericOnly.padStart(8, '0').slice(0, 8);
    // Ensure it doesn't start with 00
    if (padded.substring(0, 2) === "00") {
      const firstDigit = Math.floor(Math.random() * 9) + 1;
      return `#${firstDigit}${padded.substring(1)}`;
    }
    return `#${padded}`;
  }
  
  // Fallback: generate a deterministic code from the ID
  // Use a simple hash to convert string to 8-digit number
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    const char = orderId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  let code = Math.abs(hash).toString().padStart(8, '0').slice(0, 8);
  // Ensure it doesn't start with 00
  if (code.substring(0, 2) === "00") {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    code = `${firstDigit}${code.substring(1)}`;
  }
  return `#${code}`;
}
