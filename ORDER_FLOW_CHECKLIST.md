# Order Flow Verification Checklist

Use this checklist to verify the complete delivery flow end-to-end.

## Roles & Routes
- Vendor dashboard: `/vendor/orders`
- Driver dashboard: `/driver/available-orders`, `/driver/deliveries`
- Admin dashboard: `/admin/orders` and `/admin/transactions`

## Flow Steps
1) Vendor creates order
   - Status should be `available` (waiting for driver)
   - Order appears in driver “Available Orders”

2) Driver accepts order
   - Status changes to `assigned`
   - Driver and vendor see updated status

3) Driver marks “picked up”
   - Status: `enroute` or `in-transit`

4) Driver delivers + signature
   - Collect signature, upload to Storage
   - Status: `delivered`

5) Transactions for COD
   - `driverTransactions`: pending-remittance
   - `vendorTransactions`: awaiting-remittance
   - Admin can see both under `/admin/transactions`

6) Remittance (vendor side)
   - Vendor confirms cash remittance to driver
   - Status updates and transactions reflect remitted

## What to verify
- Each status update is reflected in Firestore `orders`
- Signature URL stored in Storage & order document
- Transactions created for COD orders
- Admin transactions page shows the entries

## Collections involved
- `orders` (status, driverId, vendorId, signature)
- `driverTransactions` (for COD driver side)
- `vendorTransactions` (for COD vendor side)
- `storage` (proof-of-delivery signatures)

