"use client";

import { useState, useEffect } from "react";
import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { auth } from "@/firebase/init";
import toast from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/firebase/init";

// Initialize Stripe (you'll need to get publishable key from settings)
let stripePromise: Promise<any> | null = null;

function getStripePromise(publishableKey: string) {
  if (!stripePromise && publishableKey) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

interface PaymentFormProps {
  publishableKey: string;
}

function PaymentForm({ publishableKey }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState("10.00");
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  const createPaymentIntent = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setProcessing(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }
      const idToken = await user.getIdToken();
      
      const functionUrl = `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/createWalletTopup`;
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: "usd",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setClientSecret(result.clientSecret);
      setPaymentIntentId(result.paymentIntentId);
      toast.success("Payment intent created! Complete the payment below.");
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      toast.error(error.message || "Failed to create payment intent");
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      toast.error("Please create a payment intent first");
      return;
    }

    setProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (error) {
        toast.error(error.message || "Payment failed");
        setProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // Apply wallet top-up
        const user = auth.currentUser;
        if (!user) {
          throw new Error("User not authenticated");
        }
        const idToken = await user.getIdToken();
        
        const functionUrl = `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/applyWalletTopup`;
        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        toast.success("Payment successful! Wallet credited.");
        setClientSecret(null);
        setPaymentIntentId(null);
        setAmount("10.00");
        elements.getElement(CardElement)?.clear();
      }
    } catch (error: any) {
      console.error("Error processing payment:", error);
      toast.error(error.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Test Payment
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!!clientSecret || processing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="10.00"
            />
          </div>

          {!clientSecret ? (
            <button
              type="button"
              onClick={createPaymentIntent}
              disabled={processing}
              className="w-full px-4 py-2 bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Creating..." : "Create Payment Intent"}
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Card Details
                </label>
                <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: "16px",
                          color: "#424770",
                          "::placeholder": {
                            color: "#aab7c4",
                          },
                        },
                        invalid: {
                          color: "#9e2146",
                        },
                      },
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Test card: 4242 4242 4242 4242 | Any future date | Any CVC
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setClientSecret(null);
                    setPaymentIntentId(null);
                    elements?.getElement(CardElement)?.clear();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!stripe || processing}
                  className="flex-1 px-4 py-2 bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? "Processing..." : "Pay Now"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {paymentIntentId && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Payment Intent ID: <code className="text-xs">{paymentIntentId}</code>
          </p>
        </div>
      )}
    </div>
  );
}

export default function TestPaymentPage() {
  const { userData, loading: authLoading, isFullyAuthorized } =
    useRequireRoleAndApproval(["admin"], false);
  const [publishableKey, setPublishableKey] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Load publishable key from Firestore
  useEffect(() => {
    const loadKey = async () => {
      try {
        const settingsDoc = await getDoc(
          doc(firestore, "systemConfig", "paymentSettings")
        );
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setPublishableKey(data.stripePublishableKey || "");
        }
      } catch (error) {
        console.error("Error loading publishable key:", error);
      } finally {
        setLoading(false);
      }
    };
    loadKey();
  }, []);

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

  if (loading) {
    return (
      <AdminLayout pageTitle="Test Payment">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!publishableKey) {
    return (
      <AdminLayout pageTitle="Test Payment">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Please configure your Stripe Publishable Key in Payment Settings first.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const stripePromise = getStripePromise(publishableKey);

  return (
    <AdminLayout pageTitle="Test Payment">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Test Stripe Payment
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Test your Stripe integration with a test payment
          </p>
        </div>

        <Elements stripe={stripePromise}>
          <PaymentForm publishableKey={publishableKey} />
        </Elements>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            Test Instructions
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li>Enter an amount (minimum $0.50)</li>
            <li>Click "Create Payment Intent"</li>
            <li>Use test card: 4242 4242 4242 4242</li>
            <li>Use any future expiry date (e.g., 12/34)</li>
            <li>Use any 3-digit CVC</li>
            <li>Complete the payment</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
