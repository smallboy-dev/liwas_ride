"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, firestore } from "@/firebase/init";

interface FormErrors {
  name?: string;
  driverType?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  documents?: string;
}

export default function DriverRegistrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  // Form fields
  const [name, setName] = useState("");
  const [driverType, setDriverType] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\d\s\-+()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Name
    if (!name.trim()) {
      newErrors.name = "Name is required";
      isValid = false;
    }

    // Driver Type
    if (!driverType) {
      newErrors.driverType = "Please select a driver type";
      isValid = false;
    }

    // Email
    if (!email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    // Phone
    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
      isValid = false;
    } else if (!validatePhone(phone)) {
      newErrors.phone = "Please enter a valid phone number";
      isValid = false;
    }

    // Password
    if (!password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    // Confirm Password
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setDocuments(filesArray);
      if (errors.documents) {
        setErrors((prev) => ({
          ...prev,
          documents: undefined,
        }));
      }
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    let createdUser: any = null;
    
    try {
      // Step 1: Create Firebase Auth user
      console.log("Step 1: Creating Firebase Auth user...");
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      createdUser = user;
      console.log("✅ Auth user created:", user.uid);

      // Step 2: Create user document with role and isApproved
      console.log("Step 2: Creating user document in Firestore...");
      const userDocRef = doc(firestore, "users", user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        uid: user.uid,
        role: "driver",
        isApproved: false,
        createdAt: serverTimestamp(),
      });
      console.log("✅ User document created in Firestore");

      // Step 3: Upload documents to Firebase Storage
      console.log("Step 3: Uploading documents to Firebase Storage...");
      const { uploadMultipleDocuments } = await import("@/lib/storage");
      let documentsData: any[] = [];
      
      if (documents.length > 0) {
        try {
          const uploadedDocs = await uploadMultipleDocuments(
            documents,
            user.uid,
            'registration',
            'driver'
          );
          documentsData = uploadedDocs.map((doc) => ({
            name: doc.name,
            url: doc.url,
            size: doc.size,
            type: doc.type,
            uploadedAt: doc.uploadedAt,
            storagePath: doc.storagePath,
          }));
          console.log("✅ Documents uploaded to Storage:", documentsData.length);
        } catch (uploadError: any) {
          console.error("Error uploading documents:", uploadError);
          throw new Error(`Document upload failed: ${uploadError.message}`);
        }
      }

      // Step 4: Create driver document
      // Use user.uid as document ID to match security rules requirement (driverId == userId)
      console.log("Step 4: Creating driver document in Firestore...");
      const driverDocRef = doc(firestore, "drivers", user.uid);

      await setDoc(driverDocRef, {
        userId: user.uid,
        name: name.trim(),
        driverType,
        phone: phone.trim(),
        documents: documentsData,
        createdAt: serverTimestamp(),
      });
      console.log("✅ Driver document created in Firestore");

      // Step 5: Sign out the user since they're not approved yet
      console.log("Step 5: Signing out unapproved user...");
      await signOut(auth);
      console.log("✅ User signed out");

      // Step 6: Redirect to application status page
      router.push("/application-status");
    } catch (err: any) {
      console.error("Registration error:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      
      let errorMessage = "An error occurred during registration. Please try again.";
      
      // Handle Firebase Auth errors
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. If you've registered before, please try logging in instead.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address. Please enter a valid email.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password (at least 6 characters).";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } 
      // Handle Firestore errors
      else if (err.code === "permission-denied" || 
               err.code === "permissions" ||
               err.message?.includes("permissions") || 
               err.message?.includes("Missing or insufficient permissions") ||
               err.message?.includes("PERMISSION_DENIED")) {
        errorMessage = "⚠️ Firestore Permission Error: The security rules have not been deployed yet. Please deploy the Firestore security rules from the firestore.rules file to your Firebase project. Your account was created in Firebase Auth, but driver details could not be saved.";
      } else if (err.code === "unavailable") {
        errorMessage = "Firestore service is temporarily unavailable. Please try again in a moment.";
      } else if (err.code) {
        errorMessage = `Registration failed: ${err.code}. ${err.message || "Please try again or contact support."}`;
      }
      
      // If Auth user was created but Firestore failed, provide additional context
      if (createdUser) {
        errorMessage += ` Your Firebase Auth account was created (UID: ${createdUser.uid}), but the driver profile could not be saved.`;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse-slow dark:opacity-20 dark:mix-blend-screen"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-secondary-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse-slow dark:opacity-20 dark:mix-blend-screen"></div>
      </div>

      <div className="max-w-3xl mx-auto relative z-10 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-semibold text-brand-primary-600 dark:text-brand-primary-400 hover:text-brand-primary-700 dark:hover:text-brand-primary-300 mb-6 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Login
          </Link>
          <h1 className="text-5xl font-bold text-brand-primary-600 dark:text-brand-primary-400 mb-3">
            Driver Registration
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Create your driver account to start delivering on LiWAS Ride
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl shadow-soft dark:shadow-soft-dark rounded-2xl border border-brand-primary-200 dark:border-brand-primary-800/50 p-6 md:p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 text-red-800 dark:text-red-200 px-4 py-3 rounded-r-lg animate-fade-in">
                <div className="flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{error}</p>
                    {error.includes("already registered") && (
                      <Link
                        href="/login"
                        className="mt-2 inline-flex items-center text-sm font-semibold text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 underline"
                      >
                        Go to Login Page
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Driver Information Section */}
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <div className="w-1 h-8 bg-gradient-to-b from-brand-primary-500 to-brand-secondary-500 rounded-full mr-3"></div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Driver Information
                </h2>
              </div>
              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setErrors((prev) => ({ ...prev, name: undefined }));
                        setError(null);
                      }}
                      className={`block w-full pl-10 pr-3 py-3 border ${
                        errors.name
                          ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10"
                          : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/50"
                      } rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                        errors.name
                          ? "focus:ring-red-500 focus:border-red-500"
                          : "focus:ring-brand-primary-500 focus:border-brand-primary-500"
                      } transition-all duration-200`}
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Driver Type */}
                <div>
                  <label
                    htmlFor="driverType"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Driver Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="driverType"
                    value={driverType}
                    onChange={(e) => {
                      setDriverType(e.target.value);
                      setErrors((prev) => ({ ...prev, driverType: undefined }));
                      setError(null);
                    }}
                    className={`w-full px-3 py-2 border ${
                      errors.driverType
                        ? "border-red-300 dark:border-red-600"
                        : "border-gray-300 dark:border-gray-600"
                    } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                      errors.driverType
                        ? "focus:ring-red-500"
                        : "focus:ring-blue-500"
                    } focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm`}
                  >
                    <option value="">Select driver type</option>
                    <option value="taxi">Taxi</option>
                    <option value="regular">Regular</option>
                  </select>
                  {errors.driverType && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.driverType}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Account Information Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Account Information
              </h2>
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((prev) => ({ ...prev, email: undefined }));
                      setError(null);
                    }}
                    className={`w-full px-3 py-2 border ${
                      errors.email
                        ? "border-red-300 dark:border-red-600"
                        : "border-gray-300 dark:border-gray-600"
                    } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                      errors.email
                        ? "focus:ring-red-500"
                        : "focus:ring-blue-500"
                    } focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm`}
                    placeholder="you@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setErrors((prev) => ({ ...prev, phone: undefined }));
                      setError(null);
                    }}
                    className={`w-full px-3 py-2 border ${
                      errors.phone
                        ? "border-red-300 dark:border-red-600"
                        : "border-gray-300 dark:border-gray-600"
                    } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                      errors.phone
                        ? "focus:ring-red-500"
                        : "focus:ring-blue-500"
                    } focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm`}
                    placeholder="+1 (555) 123-4567"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, password: undefined }));
                      setError(null);
                    }}
                    className={`w-full px-3 py-2 border ${
                      errors.password
                        ? "border-red-300 dark:border-red-600"
                        : "border-gray-300 dark:border-gray-600"
                    } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                      errors.password
                        ? "focus:ring-red-500"
                        : "focus:ring-blue-500"
                    } focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm`}
                    placeholder="At least 6 characters"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      setError(null);
                    }}
                    className={`w-full px-3 py-2 border ${
                      errors.confirmPassword
                        ? "border-red-300 dark:border-red-600"
                        : "border-gray-300 dark:border-gray-600"
                    } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                      errors.confirmPassword
                        ? "focus:ring-red-500"
                        : "focus:ring-blue-500"
                    } focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm`}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Documents
              </h2>
              <div>
                <label
                  htmlFor="documents"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Upload Documents (Driver License, ID, Vehicle Registration, etc.)
                </label>
                <input
                  id="documents"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  You can upload multiple files (PDF, JPG, PNG). Maximum file size: 10MB per file.
                </p>
                {documents.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Selected files ({documents.length}):
                    </p>
                    <ul className="list-disc list-inside mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {documents.map((file, index) => (
                        <li key={index}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg text-base font-semibold text-white ${
                  loading
                    ? "bg-brand-primary-400 cursor-not-allowed"
                    : "gradient-brand hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary-500"
                } transition-all duration-200`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  <>
                    Create Driver Account
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

