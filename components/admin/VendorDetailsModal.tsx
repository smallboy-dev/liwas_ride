"use client";

import { useState, useEffect } from "react";
import { VendorData } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStripeConnect, StripeAccountStatusResponse } from "@/hooks/useStripeConnect";
import toast from "react-hot-toast";

interface VendorDetailsModalProps {
  vendor: VendorData | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function VendorDetailsModal({
  vendor,
  isOpen,
  onClose,
  onEdit,
}: VendorDetailsModalProps) {
  const { setupVendorStripeConnect, getVendorStripeAccountStatus, loading: stripeLoading, error: stripeError } = useStripeConnect();
  const [stripeStatus, setStripeStatus] = useState<StripeAccountStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Load Stripe status when modal opens
  useEffect(() => {
    if (isOpen && vendor) {
      loadStripeStatus();
    }
  }, [isOpen, vendor]);

  const loadStripeStatus = async () => {
    if (!vendor) return;
    setLoadingStatus(true);
    try {
      const status = await getVendorStripeAccountStatus(vendor.id);
      setStripeStatus(status);
    } catch (error: any) {
      console.error("Error loading Stripe status:", error);
      toast.error(error.message || "Failed to load Stripe status");
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleRegenerateOnboardingLink = async () => {
    if (!vendor) return;
    setGeneratingLink(true);
    try {
      const result = await setupVendorStripeConnect(vendor.id);
      toast.success("Onboarding link generated successfully!");
      // Open the onboarding URL in a new tab
      if (result.onboarding_url) {
        window.open(result.onboarding_url, "_blank");
      }
      // Reload status after a short delay
      setTimeout(() => {
        loadStripeStatus();
      }, 2000);
    } catch (error: any) {
      console.error("Error generating onboarding link:", error);
      toast.error(error.message || "Failed to generate onboarding link");
    } finally {
      setGeneratingLink(false);
    }
  };

  const getStatusBadgeVariant = (statusCode?: string): "success" | "warning" | "destructive" | "default" => {
    switch (statusCode) {
      case "verified":
        return "success";
      case "pending":
      case "not_setup":
        return "warning";
      case "requirements_missing":
        return "destructive";
      default:
        return "default";
    }
  };

  if (!isOpen || !vendor) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
          {/* Header */}
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50 dark:bg-gray-900 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  Vendor Details
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Complete vendor information and documents
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </CardHeader>

          {/* Content */}
          <CardContent className="p-6 overflow-y-auto flex-1">
            <div className="space-y-6">
              {/* Status Badge - Top */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                    Account Status
                  </h3>
                  <div className="mt-2">
                    <Badge 
                      variant={vendor.isApproved ? "success" : "warning"}
                      className="text-sm px-3 py-1"
                    >
                      {vendor.isApproved ? "✓ Approved" : "⏳ Pending Approval"}
                    </Badge>
                  </div>
                </div>
                {vendor.email && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Contact Email</p>
                    <a 
                      href={`mailto:${vendor.email}`}
                      className="text-brand-primary-600 dark:text-brand-primary-400 hover:underline font-medium"
                    >
                      {vendor.email}
                    </a>
                  </div>
                )}
              </div>

              {/* Business Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-brand-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Business Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Business Name
                    </label>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {vendor.businessName}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Vendor Type
                    </label>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {vendor.vendorType || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Phone Number
                    </label>
                    <a 
                      href={`tel:${vendor.phone}`}
                      className="text-base font-medium text-brand-primary-600 dark:text-brand-primary-400 hover:underline"
                    >
                      {vendor.phone}
                    </a>
                  </div>
                  {vendor.email && (
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Email Address
                      </label>
                      <a 
                        href={`mailto:${vendor.email}`}
                        className="text-base font-medium text-brand-primary-600 dark:text-brand-primary-400 hover:underline break-all"
                      >
                        {vendor.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Information */}
              {vendor.personalInfo && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-brand-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vendor.personalInfo.firstName && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          First Name
                        </label>
                        <p className="text-base font-medium text-gray-900 dark:text-white">
                          {vendor.personalInfo.firstName}
                        </p>
                      </div>
                    )}
                    {vendor.personalInfo.lastName && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          Last Name
                        </label>
                        <p className="text-base font-medium text-gray-900 dark:text-white">
                          {vendor.personalInfo.lastName}
                        </p>
                      </div>
                    )}
                    {vendor.personalInfo.address && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          Address
                        </label>
                        <p className="text-base font-medium text-gray-900 dark:text-white">
                          {vendor.personalInfo.address}
                        </p>
                      </div>
                    )}
                    {vendor.personalInfo.city && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          City
                        </label>
                        <p className="text-base font-medium text-gray-900 dark:text-white">
                          {vendor.personalInfo.city}
                        </p>
                      </div>
                    )}
                    {vendor.personalInfo.state && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          State/Province
                        </label>
                        <p className="text-base font-medium text-gray-900 dark:text-white">
                          {vendor.personalInfo.state}
                        </p>
                      </div>
                    )}
                    {vendor.personalInfo.zipCode && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          ZIP/Postal Code
                        </label>
                        <p className="text-base font-medium text-gray-900 dark:text-white">
                          {vendor.personalInfo.zipCode}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documents */}
              {vendor.documents && vendor.documents.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-brand-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documents ({vendor.documents.length})
                  </h3>
                  <div className="space-y-3">
                    {vendor.documents.map((doc: any, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <svg className="w-8 h-8 text-brand-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {doc.name || `Document ${index + 1}`}
                            </p>
                            {doc.type && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {doc.type}
                              </p>
                            )}
                          </div>
                        </div>
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 px-4 py-2 text-sm font-medium text-white bg-brand-primary-600 hover:bg-brand-primary-700 rounded-lg transition-colors flex items-center space-x-2 flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span>View</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State for Documents */}
              {(!vendor.documents || vendor.documents.length === 0) && (
                <div className="text-center py-8 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">No documents uploaded</p>
                </div>
              )}

              {/* Stripe Payments Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-brand-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Stripe Payments
                </h3>
                
                {loadingStatus ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary-600"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading Stripe status...</span>
                  </div>
                ) : stripeStatus ? (
                  <div className="space-y-4">
                    {/* Stripe Account ID */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Stripe Account ID
                      </label>
                      {stripeStatus.stripe_account_id ? (
                        <div className="flex items-center space-x-2">
                          <code className="text-sm font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-3 py-1 rounded border border-gray-300 dark:border-gray-600">
                            {stripeStatus.stripe_account_id}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(stripeStatus.stripe_account_id || "");
                              toast.success("Account ID copied to clipboard!");
                            }}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Copy to clipboard"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Not set up</p>
                      )}
                    </div>

                    {/* Verification Status */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Verification Status
                      </label>
                      <div className="flex items-center space-x-3">
                        <Badge variant={getStatusBadgeVariant(stripeStatus.status_code)}>
                          {stripeStatus.status}
                        </Badge>
                        {stripeStatus.status_code === "verified" && (
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Ready for payouts
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Account Details */}
                    {stripeStatus.stripe_account_id && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Charges Enabled
                          </label>
                          <Badge variant={stripeStatus.charges_enabled ? "success" : "warning"}>
                            {stripeStatus.charges_enabled ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Payouts Enabled
                          </label>
                          <Badge variant={stripeStatus.payouts_enabled ? "success" : "warning"}>
                            {stripeStatus.payouts_enabled ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Details Submitted
                          </label>
                          <Badge variant={stripeStatus.details_submitted ? "success" : "warning"}>
                            {stripeStatus.details_submitted ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Requirements Missing */}
                    {stripeStatus.requirements && 
                     stripeStatus.requirements.currently_due.length > 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                          Requirements Missing
                        </h4>
                        <ul className="list-disc list-inside text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                          {stripeStatus.requirements.currently_due.map((req, index) => (
                            <li key={index}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Regenerate Onboarding Link Button */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={handleRegenerateOnboardingLink}
                        disabled={generatingLink || stripeLoading}
                        className={`w-full px-4 py-2 text-sm font-medium text-white bg-brand-primary-600 hover:bg-brand-primary-700 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                          generatingLink || stripeLoading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {generatingLink || stripeLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Generating Link...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Regenerate Onboarding Link</span>
                          </>
                        )}
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                        Generate a new Stripe Connect onboarding link for this vendor
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-gray-500 dark:text-gray-400">Unable to load Stripe status</p>
                    {stripeError && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-2">{stripeError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onEdit();
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-primary-600 hover:bg-brand-primary-700 rounded-lg transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Vendor</span>
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
