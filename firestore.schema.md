# Firestore Database Schema Documentation

This document defines the structure and data types for all Firestore collections used in the application.

## Table of Contents

- [Users Collection](#users-collection)
- [Vendors Collection](#vendors-collection)
- [Drivers Collection](#drivers-collection)
- [Products Collection](#products-collection)
- [Orders Collection](#orders-collection)
- [Payouts Collection](#payouts-collection)
- [Categories Collection](#categories-collection)
- [VendorTypes Collection](#vendortypes-collection)

---

## Users Collection

**Path:** `/users/{uid}`

**Description:** Stores core user authentication and profile information. Each document corresponds to a Firebase Authentication user.

### Fields

| Field Name | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| `email` | `string` | ✅ Yes | - | User's email address (from Firebase Auth) |
| `uid` | `string` | ✅ Yes | - | User's unique identifier (matches Firebase Auth UID) |
| `role` | `string` | ✅ Yes | `'user'` | User role. Must be one of: `'user'`, `'vendor'`, `'driver'`, `'admin'` |
| `isApproved` | `boolean` | ✅ Yes | `false` | Whether the user has been approved by an admin |
| `fcmToken` | `string` | ❌ No | `null` | Firebase Cloud Messaging token for push notifications |
| `createdAt` | `Timestamp` | ✅ Yes | `serverTimestamp()` | Document creation timestamp |

### Constraints

- `uid` must match the document ID (`{uid}`)
- `role` must be one of the valid enum values
- `isApproved` defaults to `false` for new registrations
- `fcmToken` can be `null` or empty string if not set

### Example Document

```json
{
  "email": "user@example.com",
  "uid": "abc123xyz",
  "role": "vendor",
  "isApproved": false,
  "fcmToken": "fcm-token-value-here",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Vendors Collection

**Path:** `/vendors/{vendorId}`

**Description:** Stores detailed vendor profile information. Each vendor document is linked to a user document via `userId`.

### Fields

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `userId` | `string` | ✅ Yes | Reference to the user's UID in `/users/{uid}` |
| `businessName` | `string` | ✅ Yes | Legal or trading name of the vendor's business |
| `vendorType` | `string` | ✅ Yes | Type/category of vendor (e.g., 'restaurant', 'retailer', 'service') |
| `phone` | `string` | ✅ Yes | Primary contact phone number |
| `documents` | `array` or `map` | ❌ No | Array of document references or map of document metadata (e.g., licenses, certifications) |
| `personalInfo` | `map` | ✅ Yes | Map containing personal information fields (structure TBD based on requirements) |
| `createdAt` | `Timestamp` | ✅ Yes | Document creation timestamp |

### Constraints

- `userId` must match an existing user's UID
- `vendorId` in the document path should match `userId` (vendor's profile is tied to their user account)
- `documents` can be an array of strings (document IDs/paths) or a map with metadata
- `personalInfo` structure to be defined based on specific business requirements

### Example Document

```json
{
  "userId": "abc123xyz",
  "businessName": "Joe's Pizza Shop",
  "vendorType": "restaurant",
  "phone": "+1234567890",
  "documents": ["license-doc-id-1", "cert-doc-id-2"],
  "personalInfo": {
    "firstName": "Joe",
    "lastName": "Smith",
    "address": "123 Main St"
  },
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Drivers Collection

**Path:** `/drivers/{driverId}`

**Description:** Stores detailed driver profile information. Each driver document is linked to a user document via `userId`.

### Fields

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `userId` | `string` | ✅ Yes | Reference to the user's UID in `/users/{uid}` |
| `name` | `string` | ✅ Yes | Driver's full name |
| `driverType` | `string` | ✅ Yes | Type of driver (e.g., 'delivery', 'freight', 'taxi') |
| `phone` | `string` | ✅ Yes | Primary contact phone number |
| `documents` | `array` or `map` | ❌ No | Array of document references or map of document metadata (e.g., licenses, insurance, vehicle registration) |
| `createdAt` | `Timestamp` | ✅ Yes | Document creation timestamp |

### Constraints

- `userId` must match an existing user's UID
- `driverId` in the document path should match `userId` (driver's profile is tied to their user account)
- `documents` can be an array of strings (document IDs/paths) or a map with metadata

### Example Document

```json
{
  "userId": "def456uvw",
  "name": "Jane Doe",
  "driverType": "delivery",
  "phone": "+1987654321",
  "documents": ["license-doc-id-3", "insurance-doc-id-4"],
  "createdAt": "2024-01-15T11:00:00Z"
}
```

---

## Products Collection

**Path:** `/products/{productId}`

**Description:** Stores product catalog information. Products are created and managed by vendors.

### Status

**⚠️ Placeholder Collection** - Detailed schema to be defined in future tasks.

### Anticipated Fields (To Be Confirmed)

- `vendorId` (string) - Reference to the vendor who owns this product
- `name` (string) - Product name
- `description` (string) - Product description
- `price` (number) - Product price
- `categoryId` (string) - Reference to category
- `images` (array) - Array of image URLs
- `stock` (number) - Available quantity
- Additional fields TBD

---

## Orders Collection

**Path:** `/orders/{orderId}`

**Description:** Stores order information including customer, vendor, and driver assignments.

### Status

**⚠️ Placeholder Collection** - Detailed schema to be defined in future tasks.

### Anticipated Fields (To Be Confirmed)

- `userId` (string) - Reference to the customer who placed the order
- `vendorId` (string) - Reference to the vendor fulfilling the order
- `driverId` (string) - Optional reference to the driver assigned for delivery
- `products` (array) - Array of ordered products with quantities
- `status` (string) - Order status (e.g., 'pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled')
- `totalAmount` (number) - Total order amount
- `deliveryAddress` (map) - Delivery address information
- `createdAt` (Timestamp) - Order creation timestamp
- `updatedAt` (Timestamp) - Last update timestamp
- Additional fields TBD

---

## Payouts Collection

**Path:** `/payouts/{payoutId}`

**Description:** Stores payment/withdrawal information for vendors and drivers.

### Status

**⚠️ Placeholder Collection** - Detailed schema to be defined in future tasks.

### Anticipated Fields (To Be Confirmed)

- `vendorId` (string) - Optional reference to vendor (if payout is for vendor)
- `driverId` (string) - Optional reference to driver (if payout is for driver)
- `amount` (number) - Payout amount
- `status` (string) - Payout status (e.g., 'pending', 'processing', 'completed', 'failed')
- `paymentMethod` (string) - Payment method used
- `transactionId` (string) - External transaction reference
- `createdAt` (Timestamp) - Payout creation timestamp
- Additional fields TBD

---

## Categories Collection

**Path:** `/categories/{categoryId}`

**Description:** Stores product categories for organizing the product catalog.

### Status

**⚠️ Placeholder Collection** - Detailed schema to be defined in future tasks.

### Anticipated Fields (To Be Confirmed)

- `name` (string) - Category name
- `description` (string) - Category description
- `parentCategoryId` (string) - Optional reference for hierarchical categories
- `image` (string) - Category image URL
- `isActive` (boolean) - Whether the category is active
- Additional fields TBD

---

## VendorTypes Collection

**Path:** `/vendorTypes/{vendorTypeId}`

**Description:** Stores vendor type definitions (e.g., restaurant, retailer, service) that can be assigned to vendors during registration and profile management.

### Fields

| Field Name | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| `name` | `string` | ✅ Yes | - | Unique name of the vendor type (e.g., 'restaurant', 'retailer', 'service') |
| `description` | `string` | ❌ No | `null` | Optional description of the vendor type |
| `image` | `string` | ❌ No | `null` | URL of the vendor type image (stored in Firebase Storage) |
| `isActive` | `boolean` | ✅ Yes | `true` | Whether this vendor type is active and available for selection |
| `createdAt` | `Timestamp` | ✅ Yes | `serverTimestamp()` | Document creation timestamp |
| `updatedAt` | `Timestamp` | ✅ Yes | `serverTimestamp()` | Last update timestamp |

### Constraints

- `name` must be unique across all vendor types
- `vendorTypeId` is auto-generated by Firestore
- Inactive vendor types (`isActive: false`) should not be displayed in vendor registration forms but may still be referenced by existing vendors

### Example Document

```json
{
  "name": "restaurant",
  "description": "Food service establishments including restaurants, cafes, and food trucks",
  "image": "https://firebasestorage.googleapis.com/.../vendorTypes/abc123/image.jpg",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

### Relationship to Vendors

- Vendors reference vendor types by the `name` field (not the document ID)
- The `vendorType` field in `/vendors/{vendorId}` should match the `name` field in `/vendorTypes/{vendorTypeId}`
- When deleting a vendor type, ensure no vendors are using it (check is performed in the admin interface)

---

## Document Relationships

```
/users/{uid}
    ├── Referenced by → /vendors/{vendorId}.userId
    └── Referenced by → /drivers/{driverId}.userId

/products/{productId}
    ├── References → /vendors/{vendorId} via vendorId
    └── References → /categories/{categoryId} via categoryId (TBD)

/orders/{orderId}
    ├── References → /users/{uid} via userId
    ├── References → /vendors/{vendorId} via vendorId
    └── References → /drivers/{driverId} via driverId (optional)

/payouts/{payoutId}
    ├── References → /vendors/{vendorId} via vendorId (optional)
    └── References → /drivers/{driverId} via driverId (optional)

/vendors/{vendorId}
    └── References → /vendorTypes/{vendorTypeId} via vendorType (name match)
```

---

## Data Validation Notes

### Role Enum Values

Valid roles for the `users.role` field:
- `'user'` - Standard customer user
- `'vendor'` - Business vendor
- `'driver'` - Delivery/service driver
- `'admin'` - System administrator

### Timestamp Usage

- Use `serverTimestamp()` from Firestore SDK when creating documents to ensure consistent server-side timestamps
- All collections should include `createdAt` at minimum
- Consider `updatedAt` for collections that will be modified

### Document ID Strategy

- **Users:** Document ID matches Firebase Auth UID (`{uid}`)
- **Vendors:** Document ID should match the user's UID (`{vendorId} = userId`)
- **Drivers:** Document ID should match the user's UID (`{driverId} = userId`)
- **Products, Orders, Payouts, Categories, VendorTypes:** Use Firestore auto-generated IDs or custom IDs (TBD)

---

## Security Rules Reference

Security rules are defined in `firestore.rules`. Key principles:

1. **Users** can read/write only their own `/users/{uid}` document
2. **Unapproved vendors/drivers** can create their profile documents
3. **Approved users** have basic read access to relevant data (e.g., `products`)
4. **Admins** have full read/write access to all collections based on `role == 'admin'`

Refer to `firestore.rules` for complete security rule definitions.

---

## Schema Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-15 | Initial schema documentation created |

---

## Notes

- This schema may evolve as the application requirements change
- Placeholder collections (products, orders, payouts, categories) will be fully defined in future tasks
- All field types follow Firestore's supported data types
- Timestamps should use Firestore `Timestamp` type or `serverTimestamp()` function

