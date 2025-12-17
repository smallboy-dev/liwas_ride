import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "@/firebase/init";

/**
 * Update the approval status of a user
 * @param userId - The user's UID
 * @param isApproved - New approval status
 * @throws Error if update fails
 */
export async function updateUserApprovalStatus(
  userId: string,
  isApproved: boolean
): Promise<void> {
  try {
    const userDocRef = doc(firestore, "users", userId);
    await updateDoc(userDocRef, {
      isApproved: isApproved,
    });
  } catch (error: any) {
    console.error("Error updating user approval status:", error);
    throw new Error(
      error.message || "Failed to update approval status. Please try again."
    );
  }
}

