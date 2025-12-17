# Task 12: Available Orders System - Implementation Plan

## 🎯 Task Overview

**Goal**: Implement a driver marketplace where vendors create orders without assigning drivers, and drivers can browse and accept available orders.

**Current Flow:**
- Vendor selects driver during order creation
- Driver is immediately assigned

**New Flow:**
- Vendor creates order (no driver selection)
- Order appears in "Available Orders" for drivers
- Driver accepts order → status becomes "busy"
- Driver delivers order → status becomes "available"

---

## 📋 Implementation Steps

### Step 1: Modify Order Creation Flow
**Files to Modify:**
- `app/vendor/orders/page.tsx`
- Order creation should not include driver selection
- Set order status to "available" instead of "pending"

### Step 2: Create Available Orders Page for Drivers
**New Files:**
- `app/driver/available-orders/page.tsx`
- Table showing available orders with details
- Accept button for each order

### Step 3: Add Available Orders to Driver Sidebar
**Files to Modify:**
- `components/vendor/DriverSidebar.tsx`
- Add "Available Orders" menu item

### Step 4: Create useAvailableOrders Hook
**New Files:**
- `hooks/useAvailableOrders.ts`
- Fetch orders with status "available" (no driver assigned)
- Accept order functionality

### Step 5: Auto-Update Driver Status
**Files to Modify:**
- `hooks/useDriverData.ts`
- Listen for order status changes
- When assigned order → set driver to "busy"
- When order delivered → set driver to "available"

### Step 6: Update Order Status Logic
**Files to Modify:**
- Order status should have "available" state
- When driver accepts → status becomes "assigned"
- Vendor can still update status manually

---

## 🔍 Current Order Status Flow

```typescript
ORDER_STATUS_OPTIONS: [
  "pending",     // Order created
  "preparing",   // Vendor preparing
  "ready",       // Ready for pickup/delivery
  "enroute",     // Driver enroute
  "delivered",   // Completed
  "cancelled",   // Cancelled
  "failed"       // Failed
]
```

**New Flow:**
```typescript
ORDER_STATUS_OPTIONS: [
  "available",   // NEW: Available for drivers
  "assigned",    // NEW: Driver accepted
  "preparing",   // Vendor preparing
  "ready",       // Ready for pickup/delivery
  "enroute",     // Driver enroute
  "delivered",   // Completed
  "cancelled",   // Cancelled
  "failed"       // Failed
]
```

---

## 📁 Files to Create/Modify

### New Files:
- [ ] `app/driver/available-orders/page.tsx` - Available orders page
- [ ] `hooks/useAvailableOrders.ts` - Hook for available orders

### Modified Files:
- [ ] `app/vendor/orders/page.tsx` - Remove driver selection
- [ ] `components/vendor/DriverSidebar.tsx` - Add available orders menu
- [ ] `hooks/useDriverData.ts` - Auto-update driver status
- [ ] Order status constants - Add "available" and "assigned"

---

## 🎯 Key Features

### Available Orders Page:
- Table with order details (customer, items, total, pickup/delivery)
- Accept button for each order
- Real-time updates when orders become available
- Filter by pickup vs delivery orders

### Driver Status Auto-Management:
- Accept order → Driver status: "busy"
- Order delivered → Driver status: "available"
- Cancel order → Driver status: "available"

### Order Assignment:
- Order created → Status: "available"
- Driver accepts → Status: "assigned", driverId set
- Vendor can still reassign if needed

---

## 🧪 Testing Checklist

### Test 1: Order Creation Without Driver
- [ ] Vendor creates order without selecting driver
- [ ] Order appears with status "available"
- [ ] No driver assigned initially

### Test 2: Available Orders Page
- [ ] Driver navigates to Available Orders
- [ ] Sees table with order details
- [ ] Can view order details before accepting
- [ ] Accept button works

### Test 3: Driver Status Changes
- [ ] Driver accepts order → Status becomes "busy"
- [ ] Order status becomes "assigned"
- [ ] Driver marked as busy in other sessions

### Test 4: Order Completion
- [ ] Vendor marks order as "delivered"
- [ ] Driver status automatically becomes "available"
- [ ] Driver can accept new orders

### Test 5: Multiple Drivers
- [ ] Multiple drivers see same available orders
- [ ] First driver to accept gets the order
- [ ] Other drivers no longer see that order

---

## ⚡ Quick Implementation Order

1. **Update order status constants** (5 min)
2. **Modify vendor order creation** (15 min)
3. **Create available orders page** (30 min)
4. **Add sidebar navigation** (5 min)
5. **Create useAvailableOrders hook** (20 min)
6. **Add auto-status updates** (15 min)
7. **Test all flows** (30 min)

**Total Time:** ~2 hours

---

## 🎨 UI/UX Considerations

### Available Orders Table:
- Order ID, Customer, Items, Total, Pickup/Delivery
- Distance from driver (future enhancement)
- Time since order created
- Accept button with loading state

### Status Indicators:
- Green: Available orders
- Yellow: Pending acceptance
- Blue: In progress
- Green: Completed

### Real-time Updates:
- New orders appear instantly
- Accepted orders disappear for other drivers
- Status changes sync across all users

---

## 🚀 Next Steps

1. **Start with order status constants** - Add "available" and "assigned"
2. **Remove driver selection** from vendor order creation
3. **Build available orders page** for drivers
4. **Add accept functionality** with status updates
5. **Test the complete flow**

---

## 📊 Database Schema Changes

### Orders Collection:
```json
{
  "status": "available", // "assigned", "preparing", etc.
  "driverId": null,     // Set when driver accepts
  "assignedAt": null,   // Timestamp when accepted
  "availableAt": timestamp // When order became available
}
```

### Drivers Collection:
```json
{
  "status": "available", // "busy", "inactive"
  "currentOrderId": null, // Current assigned order
  "updatedAt": timestamp
}
```

---

## 💡 Key Benefits

✅ **Driver Marketplace**: Drivers choose their own orders
✅ **Fair Distribution**: No manual assignment needed
✅ **Real-time Updates**: Instant synchronization
✅ **Status Automation**: No manual status updates
✅ **Scalability**: Works with multiple drivers
✅ **User Experience**: Better for both vendors and drivers

---

**Ready to implement the available orders system!** 🚀
