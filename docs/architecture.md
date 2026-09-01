# System Architecture & Technical Design

## 1. Architectural Style: Modular Monolith

This e-commerce platform is engineered strictly as a **Modular Monolith**.

### Why Modular Monolith (and NOT Microservices)?
1. **Zero Distributed System Overhead**: Microservices introduce significant network latency, complex distributed transactions (2PC/Sagas), eventual consistency failures, API gateway maintenance, duplicated code, and service mesh management.
2. **Simplified Operational Complexity**: The entire backend is deployed, monitored, and scaled as a **single backend application** communicating with a unified database cluster.
3. **Strict Domain Isolation**: Business boundaries are enforced logically and structurally inside `server/src/modules/` with TypeScript types and encapsulated service functions.
4. **Direct In-Process Performance**: Cross-module communication occurs via in-process TypeScript function calls with near-zero latency and type safety, rather than over-the-network REST or message bus hops.

> **Explicit Architectural Constraint**: Microservices, separate authentication services, separate user/address services, API gateways, and distributed message broker architectures (such as RabbitMQ or Kafka for cross-service routing) are **intentionally not used**.

---

## 2. Modular Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│   React 19 + TypeScript + Zustand + TanStack Query          │
│   - Short-lived Access Token in memory                      │
│   - Silent session recovery on boot via /auth/refresh       │
│   - Server State management for Profile & Addresses         │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON REST
                               │ (Credentials: true)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend Core                           │
│   Express Application (server/src/app.ts & server.ts)       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Security Middleware: Helmet, CORS, CookieParser,      │  │
│  │                     RateLimiters, RequestLogger       │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Modular Monolith Modules (server/src/modules/)        │  │
│  │                                                       │  │
│  │  [Module 02: Auth]       [Module 03: Users]           │  │
│  │  - auth.service.ts       - user.service.ts            │  │
│  │  - auth-token.service.ts - user.model.ts              │  │
│  │  - auth-session.model.ts - user.mapper.ts             │  │
│  │                                                       │  │
│  │  [Module 03: Addresses]                               │  │
│  │  - address.service.ts    - address.model.ts           │  │
│  │  - Ownership scope checks                             │  │
│  │  - Auto default promotion                             │  │
│  │                                                       │  │
│  │  [Shared Core]                                        │  │
│  │  - password.service.ts   - email.service.ts           │  │
│  │  - Central error handling & AppError                  │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Global Middleware: 404 Handler, Central Error Handler │  │
│  └───────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               │ Mongoose ODM
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     MongoDB Database                        │
│               (Unified Database Architecture)               │
│               Collections: users, authsessions, addresses   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. User Profile & Address Management Architecture (Module 03)

### 3.1 User Profile Management
- Customer profiles extend the authenticated `User` model with optional contact information (`phone`, `avatarUrl`).
- Profile retrieval (`GET /api/v1/users/me`) and modification (`PATCH /api/v1/users/me`) are strictly allow-listed.
- **Mass Assignment Immunity**: Direct modifications to `email`, `role`, `isActive`, `isEmailVerified`, `passwordHash`, or security timestamps are strictly blocked by validation schemas.
- Profile responses are sanitized via `UserMapper.toSafeUser` to guarantee that security secrets are never leaked.

### 3.2 Address Management & Ownership Security
- **Separate Collection**: Saved addresses live in a dedicated `addresses` collection rather than embedded in user documents, ensuring fast updates, clean indexing, and scalable checkout handling.
- **Strict IDOR Prevention**: Every address database operation unconditionally scopes queries by `{ _id: addressId, userId: authenticatedUserId }`. Cross-user access attempts return `404 Not Found`.
- **Default Address State Rules**:
  1. **First Address Creation**: Automatically assigned as both `isDefaultShipping: true` and `isDefaultBilling: true`.
  2. **Switching Defaults**: Setting an address as default shipping/billing automatically unsets the flag on any previous default address for that user.
  3. **Deletion Replacement**: When a default shipping or billing address is deleted, the backend automatically promotes the most recently updated remaining address (`{ updatedAt: -1 }`) to maintain valid default references.
  4. **Address Limits**: A safety limit of **20 addresses per user** (`MAX_ADDRESSES_PER_USER`) is enforced to prevent resource abuse.

### 3.3 Future Order Address Snapshot Rule (Checkout Integration)
> [!IMPORTANT]
> When the checkout and order management module is implemented in the future, orders **must store an immutable snapshot** of the customer's shipping and billing address at the moment of order placement.
> Future orders must **never** reference live `Address` documents by ObjectId alone, ensuring that customer edits or deletions to saved addresses do not retroactively corrupt historical order records.

---

## 4. Roles & Permissions RBAC Architecture (Module 04)

### 4.1 Canonical Roles
The system defines 7 canonical roles with strict hierarchical and functional responsibilities:
1. **`CUSTOMER`**: Default role for public registrations. Access is restricted to personal profile, address book, and storefront operations via authentication + ownership checks.
2. **`SUPER_ADMIN`**: Master administrative role. Automatically receives all catalog permissions and is the only role permitted to provision staff accounts and modify staff roles.
3. **`ADMIN`**: General store administrator with broad operational capabilities across catalog, orders, promotions, reviews, and support, but barred from creating staff or modifying staff roles.
4. **`PRODUCT_MANAGER`**: Dedicated catalog management (categories, brands, products, variants, and inventory read).
5. **`ORDER_MANAGER`**: Dedicated customer orders, fulfillment, cancellations, and return/refund processing.
6. **`INVENTORY_MANAGER`**: Warehouse stock levels, inventory audits, and stock adjustments.
7. **`CUSTOMER_SUPPORT`**: Support ticket management, customer read, order read, and review moderation read.

### 4.2 Permission Resolution Pipeline
```
[Client Request]
       │ (Bearer Access Token)
       ▼
[authenticate middleware]
       │ Fetches real-time User from DB
       │ Verifies isActive === true
       │ Attaches req.user = { id, role, email }
       ▼
[requirePermission(permission) middleware]
       │ Evaluates authorizationService.hasPermission(req.user.role, permission)
       │ - SUPER_ADMIN: Always TRUE
       │ - Non-matching role: Rejects with 403 (ERR_PERMISSION_REQUIRED)
       ▼
[Controller Action]
```

### 4.3 Role-Permission Matrix

| Permission | SUPER_ADMIN | ADMIN | PRODUCT_MANAGER | ORDER_MANAGER | INVENTORY_MANAGER | CUSTOMER_SUPPORT | CUSTOMER |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `user:read` | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ |
| `user:update` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `admin-user:create` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `admin-user:read` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `admin-user:update-role` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `admin-user:disable` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `category:*` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `brand:*` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `product:*` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `inventory:read` | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| `inventory:update/adjust` | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| `order:*` | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `return:*` | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `refund:*` | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `review:*` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `promotion:*` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `coupon:*` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `support:*` | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `analytics:read` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `audit:read` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## 5. API Endpoint Catalog

### System Health
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | System health check, environment info, uptime, and database connectivity |

### Authentication (Module 02 & Module 04)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/auth/register` | No | Creates a new customer account |
| `POST` | `/api/v1/auth/login` | No | Authenticates credentials, returns access token, sets HttpOnly cookie |
| `POST` | `/api/v1/auth/refresh` | No (Cookie) | Rotates refresh token and issues new access token |
| `POST` | `/api/v1/auth/logout` | No (Cookie) | Revokes current session and clears cookie |
| `POST` | `/api/v1/auth/logout-all` | Yes (Bearer) | Revokes all active sessions across all devices |
| `GET` | `/api/v1/auth/me` | Yes (Bearer) | Returns identity info for authentication context |
| `GET` | `/api/v1/auth/permissions` | Yes (Bearer) | Returns current role and effective permissions catalog |
| `POST` | `/api/v1/auth/verify-email` | No | Verifies email via cryptographic token |
| `POST` | `/api/v1/auth/resend-verification` | No | Resends email verification link |
| `POST` | `/api/v1/auth/forgot-password` | No | Requests password reset (anti-enumeration protected) |
| `POST` | `/api/v1/auth/reset-password` | No | Resets password with token and revokes sessions |
| `POST` | `/api/v1/auth/change-password` | Yes (Bearer) | Updates password and revokes other sessions |

### User Profile (Module 03)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/users/me` | Yes (Bearer) | Returns the detailed authenticated user profile |
| `PATCH` | `/api/v1/users/me` | Yes (Bearer) | Updates first name, last name, phone, or avatar URL |

### Address Management (Module 03)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/addresses` | Yes (Bearer) | Creates a new address for the authenticated user (max 20) |
| `GET` | `/api/v1/addresses` | Yes (Bearer) | Lists all saved addresses for the authenticated user |
| `GET` | `/api/v1/addresses/:addressId` | Yes (Bearer) | Retrieves a single owned address by ID |
| `PATCH` | `/api/v1/addresses/:addressId` | Yes (Bearer) | Updates fields of an owned address |
| `DELETE` | `/api/v1/addresses/:addressId` | Yes (Bearer) | Deletes an owned address and reassigns defaults if needed |
| `PATCH` | `/api/v1/addresses/:addressId/default-shipping` | Yes (Bearer) | Sets the target address as default shipping |
| `PATCH` | `/api/v1/addresses/:addressId/default-billing` | Yes (Bearer) | Sets the target address as default billing |

### Admin Staff Management (Module 04)
| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/admin/users` | `admin-user:create` | Creates a new staff user and dispatches activation link |
| `GET` | `/api/v1/admin/users` | `admin-user:read` | Lists all administrative staff accounts |
| `PATCH` | `/api/v1/admin/users/:userId/role` | `admin-user:update-role` | Updates staff role and revokes active sessions |
| `PATCH` | `/api/v1/admin/users/:userId/status` | `admin-user:disable` | Enables or disables staff account and revokes sessions |

### Categories Catalog (Module 05)
| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/categories` | Public | Lists active categories with pagination, search, and sorting |
| `GET` | `/api/v1/categories/tree` | Public | Returns complete hierarchical category tree (active only) |
| `GET` | `/api/v1/categories/:slug` | Public | Retrieves active category details by unique slug |
| `POST` | `/api/v1/admin/categories` | `category:create` | Creates a new root or subcategory (max depth 3) |
| `GET` | `/api/v1/admin/categories` | `category:read` | Lists all categories with audit metadata and filters |
| `GET` | `/api/v1/admin/categories/:categoryId` | `category:read` | Retrieves full category details by ID |
| `PATCH` | `/api/v1/admin/categories/:categoryId` | `category:update` | Updates category details, hierarchy, or status |
| `DELETE` | `/api/v1/admin/categories/:categoryId` | `category:delete` | Deletes a leaf category (protected against child categories) |

### Brands Catalog (Module 05)
| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/brands` | Public | Lists active brands with pagination, search, and sorting |
| `GET` | `/api/v1/brands/:slug` | Public | Retrieves active brand details by unique slug |
| `POST` | `/api/v1/admin/brands` | `brand:create` | Creates a new brand (case-insensitive name & unique slug) |
| `GET` | `/api/v1/admin/brands` | `brand:read` | Lists all brands with audit metadata and filters |
| `GET` | `/api/v1/admin/brands/:brandId` | `brand:read` | Retrieves full brand details by ID |
| `PATCH` | `/api/v1/admin/brands/:brandId` | `brand:update` | Updates brand details or status |
| `DELETE` | `/api/v1/admin/brands/:brandId` | `brand:delete` | Deletes a brand |

---

## 6. Catalog Domain Architecture & Rules (Module 05)

### 6.1 Category Hierarchy & Constraints
1. **Hierarchical Nesting**: Categories support parent-child relationships via `parentId` referencing `Category._id`.
2. **Depth Limit**: Maximum category nesting depth is strictly enforced at **3 levels** (`ERR_CATEGORY_MAX_DEPTH`).
3. **Cycle Prevention**: Circular ancestry is detected and rejected on update (`ERR_CATEGORY_CYCLE`).
4. **Self-Parent Protection**: A category cannot be set as its own parent (`ERR_CATEGORY_SELF_PARENT`).
5. **Parent Existence**: New or moved categories require a valid existing parent category (`ERR_PARENT_CATEGORY_NOT_FOUND`).
6. **Child Delete Protection**: Deleting a category with active child categories is blocked with `409 Conflict` (`ERR_CATEGORY_HAS_CHILDREN`).
7. **Unique Slugs**: Category slugs are URL-safe, lowercase, and globally unique across the entire catalog (`ERR_CATEGORY_SLUG_EXISTS`).
8. **In-Memory Tree Assembly**: The public `/categories/tree` endpoint aggregates active categories in a single query and constructs the nested tree in-memory for minimal database load.

### 6.2 Brand Management & Uniqueness
1. **Case-Insensitive Uniqueness**: Brand names are strictly unique regardless of casing via a dedicated indexed `normalizedName` field (`ERR_BRAND_NAME_EXISTS`).
2. **Global Unique Slugs**: Brand slugs are lowercase, URL-safe, and unique across all brands (`ERR_BRAND_SLUG_EXISTS`).
3. **Flat Structure**: Brands are non-hierarchical entities with optional logos, descriptions, and official external website links.
4. **Catalog Scoping**: Inactive categories and brands are automatically omitted from customer-facing browsing and search endpoints.

---

## 7. Shopping Cart Management Architecture (Module 08)

### 7.1 Cart Domain Flow & Relationships
```
Authenticated Customer (CUSTOMER role)
             │ (1-to-1 unique)
             ▼
        Cart Document
             │ (1-to-many embedded items, max 50 lines)
             ▼
      Embedded Cart Item { variantId, quantity, addedAt }
             │ (dynamic batched in-process resolution)
             ▼
       ProductVariant
             │ (parent reference)
             ▼
          Product ──► Category & Brand
```

### 7.2 Core Architectural Principles
1. **Dynamic Resolution over Static Snapshots**: Cart items persist only `{ variantId, quantity, addedAt }`. Product name, slug, SKU, primary image, variant attributes, active pricing, and sellability flags are resolved dynamically upon query.
2. **Authoritative Backend Pricing**: Variant prices in MongoDB are the sole source of truth in integer minor monetary units (paisa/cents). Client-supplied prices are strictly rejected by validation schemas.
3. **Batched Enrichment (No N+1 Queries)**: During cart retrieval, variant IDs are collected and fetched in a single `$in` query, followed by a single batched parent product query with populated category and brand relations.
4. **Resilient Unavailable Item Handling**: If a product, category, brand, or variant is deactivated or deleted after being placed in a cart:
   - The cart endpoint returns `200 OK` without crashing.
   - The affected line is marked `isAvailable: false` with an explicit `unavailableReason`.
   - The item is excluded from the calculated `subtotal`.
   - The customer can freely remove the unavailable or deleted item from their cart.
5. **Strict IDOR Prevention & Role Scoping**: All cart queries and mutations are strictly scoped by the authenticated user's ID (`req.user.id`). Cart endpoints are restricted to `CUSTOMER` accounts, blocking operational staff roles with `403 Forbidden`.

### 7.3 Cart API Endpoint Catalog
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/cart` | Yes (CUSTOMER) | Retrieves authenticated customer's cart (returns 200 with empty cart if none exists) |
| `POST` | `/api/v1/cart/items` | Yes (CUSTOMER) | Adds an active variant to cart or increments quantity (max 99 per item, max 50 distinct items) |
| `PATCH` | `/api/v1/cart/items/:variantId` | Yes (CUSTOMER) | Updates quantity (1–99) for a specific variant in the customer's cart |
| `DELETE` | `/api/v1/cart/items/:variantId` | Yes (CUSTOMER) | Removes a specific variant from the cart (works even for deleted variants) |
| `DELETE` | `/api/v1/cart` | Yes (CUSTOMER) | Clears all items from the customer's cart |

### 7.4 Future Checkout & Order Snapshot Rules
> [!IMPORTANT]
> **Future Checkout Revalidation Rule (Module 11)**:
> When the checkout module is implemented, checkout initialization must independently re-validate:
> 1. Real-time product and variant availability.
> 2. Authoritative current variant pricing.
> 3. Real-time inventory stock availability and reservations (Module 10).
> 4. Customer shipping and billing addresses.
> 5. Shipping carrier rates and applicable tax calculations.
> 
> Cart subtotal calculations are ephemeral estimates for display and do not constitute a fixed price guarantee for future orders.

> [!IMPORTANT]
> **Future Order Snapshot Rule (Module 12)**:
> When an order is placed, `OrderItem` documents must create an **immutable snapshot** of:
> - Product Name & Slug
> - SKU & Variant Attributes (e.g. Color, Storage, Size)
> - Authoritative Unit Price at moment of checkout
> - Purchased Quantity & Line Total
>
> Cart documents remain live and fluid, whereas Orders store permanent historical records.

---

## 8. Wishlist Management Domain Architecture (Module 09)

### 8.1 Domain Boundaries & Principles
The Wishlist module enables authenticated customers to bookmark products for future consideration:
1. **Product vs. Variant Storage**:
   - Wishlist documents persist reference to the **Product ID** (`productId`) and the timestamp (`addedAt`), rather than specific variants.
   - Customers choose the exact product options/variants at the time of purchase when moving the item to their Cart.
2. **Authoritative & Dynamic Pricing**:
   - Wishlist documents **never store prices**. Prices and price ranges (`{ min, max, currency }`) are dynamically aggregated from all active variants during retrieval.
3. **Availability & Resilience**:
   - Saved items are evaluated in real time against the entire catalog hierarchy (Product status, Category active state, Brand active state, and active Variant count).
   - If a product becomes unavailable or is hard-deleted from the database, it remains visible in the wishlist marked as `isAvailable: false` with an explanatory `unavailableReason`, allowing customers to see the change and remove the item without generating `500 Internal Server Error`s.
4. **Batched Enrichment (Zero N+1 Queries)**:
   - All wishlist products and their associated variants are resolved using two batched `$in` queries.
5. **Idempotency & Limits**:
   - Adding an already saved product is an idempotent success that retains the original `addedAt` timestamp.
   - Wishlist size is strictly limited to 100 items (`MAX_WISHLIST_ITEMS = 100`).
6. **Move to Cart Flow**:
   - Single-variant products are moved directly to Cart with quantity 1 upon customer request and subsequently removed from the Wishlist upon successful addition.
   - Multi-variant products present an interactive option selector modal to let the customer pick their desired variant before moving to Cart.
   - If Cart addition fails, the item is preserved in the Wishlist.

### 8.2 Wishlist API Endpoint Catalog
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/wishlist` | Yes (CUSTOMER) | Retrieves customer's wishlist with real-time price ranges and availability status |
| `POST` | `/api/v1/wishlist/items` | Yes (CUSTOMER) | Adds an active product to the wishlist (idempotent, max 100 items) |
| `DELETE` | `/api/v1/wishlist/items/:productId` | Yes (CUSTOMER) | Removes a saved product from the wishlist (resilient to deleted products) |
| `DELETE` | `/api/v1/wishlist` | Yes (CUSTOMER) | Clears all items from the customer's wishlist |

---

## 9. Inventory Management Domain Architecture (Module 10)

### 9.1 Domain Boundaries & Granularity
1. **Variant-Level Granularity**:
   - Inventory belongs strictly to `ProductVariant`, **not** `Product`. Each sellable SKU has independent stock counts.
2. **Dedicated Collections & Computed Availability**:
   - `Inventory` documents store physical counts:
     - `onHand`: Total physical items recorded in inventory.
     - `reserved`: Items temporarily committed to active checkouts/orders but not yet shipped/finalized.
     - `lowStockThreshold`: Custom threshold (default: 5) triggering low-stock alert status.
   - **`available` is computed dynamically on the fly** as `Math.max(0, onHand - reserved)` to prevent stale stored counters and race conditions.
3. **Atomic Concurrency & Overselling Prevention**:
   - All stock modifications use atomic conditional MongoDB updates (`$inc`, `$set`) with strict query guards:
     - `STOCK_OUT`: `$expr: { $gte: [{ $subtract: ['$onHand', qty] }, '$reserved'] }`
     - `ADJUSTMENT`: `reserved: { $lte: newOnHand }`
     - `reserveStock`: `$expr: { $gte: [{ $subtract: ['$onHand', '$reserved'] }, quantity] }`
     - `releaseStock`: `reserved: { $gte: quantity }`
   - Under no circumstances can physical `onHand` drop below committed `reserved` stock.
4. **Append-Only Immutable Audit Trail**:
   - Every stock alteration creates an immutable `InventoryTransaction` record capturing `{ type, quantity, previousOnHand, newOnHand, previousReserved, newReserved, reason, referenceType, referenceId, createdBy }`.
   - Historical transactions are never mutated or hard-deleted.
5. **Catalog & Cart Integration**:
   - **Variant Creation**: Automatically initializes default inventory (`onHand: 0, reserved: 0, lowStockThreshold: 5`).
   - **Deletion Safeguards**: Rejects hard-deletion of any variant or product that possesses active stock (`onHand > 0 || reserved > 0`) or historical transactions (`ERR_VARIANT_HAS_INVENTORY_HISTORY`).
   - **Cart Validation**: Adding to Cart checks real-time available stock (`ERR_CART_INSUFFICIENT_STOCK`). Cart enrichment flags out-of-stock and under-stocked items as `isAvailable: false` with `OUT_OF_STOCK` or `INSUFFICIENT_STOCK` reasons.
   - **Storefront Stock Badges**: Public product endpoints return computed `inStock` (`boolean`) and `stockStatus` (`IN_STOCK` | `LOW_STOCK` | `OUT_OF_STOCK`) without leaking exact physical warehouse quantities.

### 9.2 Inventory API Endpoint Catalog
| Method | Endpoint | Auth & Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/inventory` | `inventory:read` | Lists all variant inventory with search, pagination, sort, and status filtering |
| `GET` | `/api/v1/admin/inventory/transactions` | `inventory:read` | Global inventory audit trail across all variants |
| `GET` | `/api/v1/admin/inventory/:variantId` | `inventory:read` | Retrieves detailed inventory status and recent transactions for a variant |
| `POST` | `/api/v1/admin/inventory/:variantId/adjust` | `inventory:adjust` | Performs atomic STOCK_IN, STOCK_OUT, or absolute ADJUSTMENT with audit logging |
| `PATCH` | `/api/v1/admin/inventory/:variantId/threshold` | `inventory:adjust` or `inventory:update` | Updates low-stock threshold for alert triggering |
| `GET` | `/api/v1/admin/inventory/:variantId/transactions` | `inventory:read` | Retrieves transaction history for a specific variant |

---

## 10. Checkout Domain Architecture (Module 11)

### 10.1 Key Principle: Purchase Intent & Inventory Reservation
1. **Critical Distinction**:
   - **Cart does NOT reserve Inventory**: Cart items remain fluid; availability is only informational.
   - **Checkout DOES reserve Inventory**: When a Checkout Session is initiated, required quantities are temporarily committed (`reserved += quantity`), holding the stock for 15 minutes. Physical `onHand` is not decreased until final order fulfillment.
2. **Checkout Lifecycle & State Machine**:
   - `ACTIVE`: Session is valid, live, and actively holding inventory reservations.
   - `EXPIRED`: 15-minute TTL elapsed; reserved stock has been atomically released back to general inventory.
   - `CANCELLED`: Customer explicitly cancelled the session; reserved stock is released.
   - `INVALIDATED`: Catalog changes (e.g. product/variant deactivated) during the active hold invalidate the session; stock is released.
   - `COMPLETED`: Transitioned when an Order is placed (Module 12).
3. **Atomic Multi-Item Reservation & Compensating Rollback**:
   - Checkout loops through cart items and attempts `reserveStock()` for each variant.
   - If any variant has insufficient stock, all previously reserved variants in the loop are immediately released via compensating rollbacks (`releaseStock()`), preventing partial stock locks and overselling.
4. **Authoritative Live Price & Address Snapshots**:
   - Cart prices are never trusted. Live `ProductVariant.price` values are re-queried and used for line totals and subtotal calculations.
   - Shipping and billing addresses are snapshotted into the `CheckoutSession` document to guarantee immutability if the customer later modifies their saved profile addresses.
5. **Revalidation & Concurrency Safety**:
   - `POST /api/v1/checkout/revalidate` verifies active catalog status and detects price changes. If prices change, the snapshot subtotal updates with `hasPriceChanges: true`.
   - Single active session per customer: starting a new checkout automatically cancels and releases any previous active session.

### 10.2 Checkout API Endpoint Catalog
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/checkout` | Yes (CUSTOMER) | Initiates a checkout session, snapshots addresses/prices, and reserves inventory |
| `GET` | `/api/v1/checkout` | Yes (CUSTOMER) | Retrieves the current active checkout session with live remaining countdown |
| `POST` | `/api/v1/checkout/revalidate` | Yes (CUSTOMER) | Revalidates active session before order creation; updates price changes |
| `DELETE` | `/api/v1/checkout` | Yes (CUSTOMER) | Cancels the active checkout session and safely releases reserved stock |

---

## 11. Orders Domain Architecture (Module 12)

### 11.1 Key Principles: Immutable Snapshots & Authoritative Order Creation
1. **Authoritative Checkout-to-Order Conversion**:
   - Order creation (`POST /api/v1/orders`) strictly requires a valid, `ACTIVE` CheckoutSession. Direct Cart-to-Order creation is forbidden to guarantee price, address, and stock validation.
   - Idempotency is enforced concurrency-safely via a unique index on `checkoutSessionId`. Duplicate or replayed requests safely return the existing order without duplicate stock decrements.
2. **Sequential Concurrency-Safe Order Numbers**:
   - Order numbers follow the format `ORD-YYYY-000001` generated atomically using MongoDB `findAndUpdate` sequence counters per calendar year.
3. **Immutable Snapshots**:
   - `items`: Frozen product title, slug, SKU, variant attributes, price, and thumbnail image. Catalog edits or deletions never mutate historical order records.
   - `shippingAddress` & `billingAddress`: Frozen recipient, address lines, city, state, postal code, phone, and country.
   - `customerSnapshot`: Frozen first name, last name, email, and phone at the exact time of order placement.
4. **End-to-End Inventory Finalization & Compensating Rollbacks**:
   - During order placement, `inventoryService.finalizeReservation()` converts temporary holds into physical sales: atomically decreasing `onHand -= qty` and `reserved -= qty` with a `SALE` transaction record.
   - If an error occurs midway through item finalization, a compensating rollback automatically restores all processed items.
   - Cart clearing only happens *after* successful order creation.
5. **State Machine & Controlled Progression**:
   - **Statuses**: `PLACED` ➔ `CONFIRMED` ➔ `PROCESSING` ➔ `READY_TO_SHIP` ➔ `SHIPPED` ➔ `DELIVERED` (Terminal: `CANCELLED`).
   - Customer cancellation is permitted only while `PLACED` or `CONFIRMED`.
   - Admin cancellation is permitted for any non-terminal, non-delivered order.
   - Order cancellation atomically executes `restoreStockFromCancellation()` (`onHand += qty`) with an `ORDER_CANCELLATION` transaction record. Double-cancellation is strictly rejected.

### 11.2 Order API Endpoint Catalog
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/orders` | Yes (CUSTOMER) | Creates an Order from an active Checkout session, finalizes stock, clears cart |
| `GET` | `/api/v1/orders` | Yes (CUSTOMER) | Lists current customer's order history with pagination & status filters |
| `GET` | `/api/v1/orders/:orderId` | Yes (CUSTOMER) | Retrieves customer's isolated order details, item snapshots, & live progress |
| `POST` | `/api/v1/orders/:orderId/cancel` | Yes (CUSTOMER) | Cancels customer order (if PLACED/CONFIRMED) and restores warehouse stock |
| `GET` | `/api/v1/admin/orders` | Yes (`order:read`) | Administrative paginated search and filter across all platform orders |
| `GET` | `/api/v1/admin/orders/:orderId` | Yes (`order:read`) | Full admin order details including allowed transitions & internal notes |
| `PATCH`| `/api/v1/admin/orders/:orderId/status` | Yes (`order:update_status`) | Transitions order through warehouse fulfillment lifecycle |
| `POST` | `/api/v1/admin/orders/:orderId/cancel` | Yes (`order:cancel`) | Admin order cancellation override with stock restoration |
| `PATCH`| `/api/v1/admin/orders/:orderId/notes` | Yes (`order:update_notes`) | Updates internal staff-only operational notes |

---

## 12. Payments Domain Architecture (Module 13)

### 12.1 Core Principles: Separation of Concerns, Server Authority & Security
1. **Separation of Aggregates**:
   - `Order` aggregate owns what was purchased, frozen item snapshots, addresses, and physical warehouse inventory holds.
   - `Payment` aggregate (`{ orderId: 1 }` unique) owns payment attempts, settlement status, provider tokens, transaction references, and refund tracking.
   - A single Order has exactly one parent `Payment` document, which contains or links to one or more immutable `PaymentAttempt` records.
2. **Server-Authoritative Pricing & Currencies**:
   - Payment amount and currency are strictly sourced from `Order.total` and `Order.currency`. Client payload attempts to supply amount, currency, or userId are rejected immediately with validation errors.
3. **Pluggable Payment Provider Architecture**:
   - Standardized `PaymentProvider` interface decoupling business logic from third-party vendor APIs:
     - `createPaymentIntent()`
     - `verifyWebhookSignature()`
     - `processWebhookEvent()`
     - `reconcilePayment()`
   - Built-in providers:
     - `TestPaymentProvider` (`TEST`): HMAC-SHA256 authenticated sandbox provider with signature verification, deterministic mock outcomes, and strict production-guard disabling (`NODE_ENV === 'production' && !ENABLE_TEST_PAYMENT_PROVIDER`).
     - `CodPaymentProvider` (`COD`): Cash on Delivery provider allowing deferred physical settlement upon shipment delivery.
4. **Idempotent Webhook Processing & Replay Defense**:
   - Raw request body buffer capture via `express.json` verify callback enables cryptographic HMAC signature verification without JSON parser mutation issues.
   - Dedicated `PaymentWebhookEvent` collection with compound unique index on `{ provider: 1, providerEventId: 1 }` guarantees duplicate or retried webhook deliveries are processed idempotently with zero duplicate side effects.
5. **Irreversible Settlement & State Downgrade Protection**:
   - Payment Statuses: `PENDING` ➔ `PROCESSING` ➔ `SUCCEEDED` (Terminal: `CANCELLED`, `FAILED`).
   - Succeeded payments (`SUCCEEDED` / `PAID`) cannot be downgraded by delayed or out-of-order `payment.failed` webhook packets.
   - Simple Order cancellation (`/orders/:id/cancel`) is strictly blocked on `PAID` orders (`ERR_ORDER_PAID_CANCELLATION_REQUIRES_REFUND`), protecting warehouse inventory from unauthorized de-allocation without formal refund handling.
6. **Immutable Payment Attempt Timeline**:
   - Every checkout submission or retry records an isolated, numbered `PaymentAttempt` (`attemptNumber: 1, 2, ...`) tracking provider transaction references, timestamps, and normalized failure codes/messages.
   - Maximum attempt threshold per order (`MAX_PAYMENT_ATTEMPTS_PER_ORDER = 10`) protects against automated card testing or brute-force attacks.

### 12.2 Payment API Endpoint Catalog
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/payments/methods` | Public | Returns available, enabled payment methods (Online, Cash on Delivery) |
| `POST` | `/api/v1/payments` | Yes (CUSTOMER) | Initiates payment for an existing payable order; creates/reuses attempt |
| `GET` | `/api/v1/payments/order/:orderId` | Yes (CUSTOMER) | Retrieves customer's payment status, provider details, & attempt history |
| `POST` | `/api/v1/webhooks/payments/:provider`| Public (Signed) | Cryptographically verified webhook ingestion endpoint for payment gateways |
| `GET` | `/api/v1/admin/payments` | Yes (`payment:read`) | Administrative paginated search, filter by status/method/provider |
| `GET` | `/api/v1/admin/payments/:paymentId` | Yes (`payment:read`) | Admin detailed view with full attempt timeline & transaction references |
| `POST` | `/api/v1/admin/payments/:paymentId/confirm-cod` | Yes (`payment:confirm`) | Authoritatively marks Cash on Delivery collected and Order as PAID |
| `POST` | `/api/v1/admin/payments/:paymentId/reconcile` | Yes (`payment:reconcile`) | Manually synchronizes payment state against upstream provider status |

---

## 13. Shipping & Fulfillment Domain Architecture (Module 14)

### 13.1 Core Principles: Separation of Concerns, Server Authority & Logistics Control
1. **Dedicated Shipping Method & Shipment Aggregates**:
   - `ShippingMethod`: Configurable delivery speeds (Standard, Express, Overnight, Same Day, Free Tiered), authoritative base rates, free-shipping threshold rules (`freeAboveSubtotal`), and country/state/city geographic eligibility.
   - `Shipment`: Single fulfillment document per Order (`{ orderId: 1 }` unique index). Stores frozen recipient address snapshots, item snapshot duplicates, carrier metadata, public tracking information, internal staff-only operational notes, and immutable milestone status history.
2. **Authoritative Server Pricing & Free-Shipping Thresholds**:
   - Shipping fees are calculated dynamically on the server based on checkout items, destination address, and cart subtotal.
   - If cart `subtotal >= shippingMethod.freeAboveSubtotal`, the quote service automatically waives the fee to `0` minor units.
   - Client-side total is always verified against `subtotal + shippingFee`.
3. **Atomic Concurrency-Safe Shipment Identifiers**:
   - Every shipment receives a human-readable identifier formatted as `SHP-YYYY-NNNNNN` generated atomically via MongoDB `$inc` counters.
4. **Order State Machine & Payment Dispatch Guard**:
   - Milestone progression: `PENDING` ➔ `READY_TO_SHIP` ➔ `SHIPPED` ➔ `IN_TRANSIT` ➔ `OUT_FOR_DELIVERY` ➔ `DELIVERED` (Terminal failure/exception: `DELIVERY_FAILED`, `RETURNED_TO_SENDER`, `CANCELLED`).
   - Order fulfillment status is automatically synchronized with shipment status.
   - **Payment Dispatch Verification Rule**: Online orders (`order.paymentMethod === 'ONLINE'`) MUST have `order.paymentStatus === 'PAID'` before warehouse dispatch to `SHIPPED` status. Cash on Delivery (`CASH_ON_DELIVERY`) is permitted with `PENDING` payment.
5. **Customer Privacy & Public Tracking DTO**:
   - Customer-facing tracking endpoints return a sanitized DTO excluding staff operational notes (`internalNotes`), warehouse staff user IDs, and carrier API secrets.

### 13.2 Shipping API Endpoint Catalog
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/shipping/methods` | Public | Returns active shipping methods |
| `POST` | `/api/v1/shipping/quote` | Yes (CUSTOMER) | Calculates authoritative shipping rates and free-shipping eligibility |
| `GET` | `/api/v1/shipping/track/:trackingNumber` | Public | Public shipment tracking by tracking number |
| `GET` | `/api/v1/shipping/orders/:orderId` | Yes (CUSTOMER) | Retrieves customer's shipment details for an order |
| `GET` | `/api/v1/admin/shipping/methods` | Yes (`shipping:read`) | Lists all shipping methods with configuration |
| `POST` | `/api/v1/admin/shipping/methods` | Yes (`shipping:manage`) | Creates a new shipping method |
| `PATCH`| `/api/v1/admin/shipping/methods/:id` | Yes (`shipping:manage`) | Updates shipping method configuration |
| `DELETE`| `/api/v1/admin/shipping/methods/:id` | Yes (`shipping:manage`) | Soft deletes or deactivates a shipping method |
| `GET` | `/api/v1/admin/shipping/shipments` | Yes (`shipping:read`/`shipping:fulfill`) | Administrative paginated search and filter for shipments |
| `POST` | `/api/v1/admin/shipping/orders/:orderId/shipments` | Yes (`shipping:fulfill`) | Creates a new shipment for an order |
| `GET` | `/api/v1/admin/shipping/shipments/:id` | Yes (`shipping:read`/`shipping:fulfill`) | Detailed administrative shipment view |
| `PATCH`| `/api/v1/admin/shipping/shipments/:id/status` | Yes (`shipping:fulfill`) | Transitions shipment milestone and synchronizes order status |
| `PATCH`| `/api/v1/admin/shipping/shipments/:id/tracking` | Yes (`shipping:fulfill`) | Updates carrier name, tracking number, and tracking URL |
| `POST` | `/api/v1/admin/shipping/shipments/:id/cancel` | Yes (`shipping:fulfill`) | Cancels shipment and marks order as CANCELLED |






