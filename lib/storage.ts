/**
 * Firebase Storage utility functions for uploading documents
 * Used by vendors and drivers to upload required documents
 */

import { storage } from "@/firebase/init";
import { ref, uploadBytes, getDownloadURL, deleteObject, UploadResult } from "firebase/storage";

export interface UploadedDocument {
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  storagePath: string;
}

/**
 * Upload a document file to Firebase Storage
 * @param file - The file to upload
 * @param userId - The user's UID (vendor or driver)
 * @param documentType - Type of document (e.g., 'license', 'certification', 'insurance')
 * @param userRole - Role of the user ('vendor' or 'driver')
 * @returns Uploaded document metadata including download URL
 */
export async function uploadDocument(
  file: File,
  userId: string,
  documentType: string,
  userRole: 'vendor' | 'driver'
): Promise<UploadedDocument> {
  try {
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum limit of 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Validate file type (only allow common document/image formats)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type not allowed. Allowed types: PDF, Images (JPEG/PNG), Word documents`);
    }

    // Create storage path: documents/{role}/{userId}/{documentType}/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `documents/${userRole}/${userId}/${documentType}/${timestamp}-${sanitizedFileName}`;
    const storageRef = ref(storage, storagePath);

    // Upload file
    const uploadResult: UploadResult = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // Return document metadata
    return {
      name: file.name,
      url: downloadURL,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      storagePath: storagePath,
    };
  } catch (error: any) {
    console.error('Error uploading document:', error);
    throw new Error(`Failed to upload document: ${error.message}`);
  }
}

/**
 * Upload multiple documents
 * @param files - Array of files to upload
 * @param userId - The user's UID
 * @param documentType - Type of document
 * @param userRole - Role of the user
 * @returns Array of uploaded document metadata
 */
export async function uploadMultipleDocuments(
  files: File[],
  userId: string,
  documentType: string,
  userRole: 'vendor' | 'driver'
): Promise<UploadedDocument[]> {
  try {
    const uploadPromises = files.map((file) =>
      uploadDocument(file, userId, documentType, userRole)
    );
    return await Promise.all(uploadPromises);
  } catch (error: any) {
    console.error('Error uploading multiple documents:', error);
    throw new Error(`Failed to upload documents: ${error.message}`);
  }
}

/**
 * Delete a document from Firebase Storage
 * @param storagePath - The storage path of the document to delete
 */
export async function deleteDocument(storagePath: string): Promise<void> {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error: any) {
    console.error('Error deleting document:', error);
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

/**
 * Get download URL for a document
 * @param storagePath - The storage path of the document
 * @returns Download URL
 */
export async function getDocumentUrl(storagePath: string): Promise<string> {
  try {
    const storageRef = ref(storage, storagePath);
    return await getDownloadURL(storageRef);
  } catch (error: any) {
    console.error('Error getting document URL:', error);
    throw new Error(`Failed to get document URL: ${error.message}`);
  }
}

/**
 * Upload an image for vendor types
 * @param file - The image file to upload
 * @param vendorTypeId - The vendor type ID
 * @param imageType - Type of image: 'logo' or 'header'
 * @returns Download URL of the uploaded image
 */
export async function uploadVendorTypeImage(
  file: File,
  vendorTypeId: string,
  imageType: 'logo' | 'header' = 'logo'
): Promise<string> {
  try {
    // Validate file size (max 5MB for images)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new Error(`Image size exceeds maximum limit of 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Validate file type (only allow images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type not allowed. Allowed types: JPEG, PNG, WebP`);
    }

    // Create storage path: vendorTypes/{vendorTypeId}/{imageType}.{extension}
    const extension = file.name.split('.').pop() || 'jpg';
    const storagePath = `vendorTypes/${vendorTypeId}/${imageType}.${extension}`;
    const storageRef = ref(storage, storagePath);

    // Upload file
    await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading vendor type image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Upload an image for categories
 * @param file - The image file to upload
 * @param categoryId - The category ID
 * @returns Download URL of the uploaded image
 */
export async function uploadCategoryImage(
  file: File,
  categoryId: string
): Promise<string> {
  try {
    // Validate file size (max 5MB for images)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new Error(`Image size exceeds maximum limit of 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Validate file type (only allow images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type not allowed. Allowed types: JPEG, PNG, WebP`);
    }

    // Create storage path: categories/{categoryId}/image.{extension}
    const extension = file.name.split('.').pop() || 'jpg';
    const storagePath = `categories/${categoryId}/image.${extension}`;
    const storageRef = ref(storage, storagePath);

    // Upload file
    await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading category image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Upload an image for subcategories
 * @param file - The image file to upload
 * @param subcategoryId - The subcategory ID
 * @returns Download URL of the uploaded image
 */
export async function uploadSubcategoryImage(
  file: File,
  subcategoryId: string
): Promise<string> {
  try {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error(`Image size exceeds maximum limit of 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type not allowed. Allowed types: JPEG, PNG, WebP`);
    }

    const extension = file.name.split('.').pop() || 'jpg';
    const storagePath = `subcategories/${subcategoryId}/image.${extension}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading subcategory image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Upload an image for products
 * @param file - The image file to upload
 * @param vendorId - The vendor's user ID
 * @param productId - The product ID
 * @returns Download URL of the uploaded image
 */
export async function uploadProductImage(
  file: File,
  vendorId: string,
  productId: string
): Promise<string> {
  try {
    // Validate file size (max 5MB for images)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new Error(`Image size exceeds maximum limit of 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Validate file type (only allow images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type not allowed. Allowed types: JPEG, PNG, WebP`);
    }

    // Create storage path: products/{vendorId}/{productId}/image.{extension}
    const extension = file.name.split('.').pop() || 'jpg';
    const storagePath = `products/${vendorId}/${productId}/image.${extension}`;
    const storageRef = ref(storage, storagePath);

    // Upload file
    await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading product image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Upload an image for options
 * @param file - The image file to upload
 * @param vendorId - The vendor's user ID
 * @param optionId - The option ID
 * @returns Download URL of the uploaded image
 */
export async function uploadOptionImage(
  file: File,
  vendorId: string,
  optionId: string
): Promise<string> {
  try {
    // Validate file size (max 5MB for images)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new Error(`Image size exceeds maximum limit of 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Validate file type (only allow images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type not allowed. Allowed types: JPEG, PNG, WebP`);
    }

    // Create storage path: options/{vendorId}/{optionId}/image.{extension}
    const extension = file.name.split('.').pop() || 'jpg';
    const storagePath = `options/${vendorId}/${optionId}/image.${extension}`;
    const storageRef = ref(storage, storagePath);

    // Upload file
    await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading option image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

