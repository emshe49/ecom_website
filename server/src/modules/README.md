# Backend Modular Monolith Architecture

This directory houses the internal business domain modules for the application.

## Architectural Principles

1. **Single Deployable Backend**: The entire application runs and scales as a single Node.js process.
2. **In-Process Module Communication**: Modules communicate with each other through standard TypeScript service function calls—never via HTTP, microservices, or external network event brokers.
3. **Encapsulation & Domain Boundaries**: Each module manages its own data models, validation schemas, controllers, and services. A module should not directly query or mutate another module's database models directly without going through that module's exported service.

## Recommended Module Structure

When a new module is implemented in future phases, it should follow this standard structure:

```text
modules/
└── [module-name]/
    ├── [name].model.ts       # Mongoose schema and database models
    ├── [name].service.ts     # Business logic & database operations
    ├── [name].controller.ts  # HTTP request/response handlers
    ├── [name].routes.ts      # Express route definitions
    ├── [name].validation.ts  # Zod validation schemas for input
    ├── [name].types.ts       # TypeScript interfaces & types
    └── [name].constants.ts    # Module-specific constants & enums
```

## Planned Modules

- `auth`: Authentication, JWT tokens, session lifecycle
- `users`: User profiles, account settings
- `addresses`: Customer shipping and billing addresses
- `roles`: Role-based access control (RBAC) and permissions
- `catalog`: Categories, Brands, Products, and Product Variants
- `search`: Full-text search and faceted filtering
- `cart`: Customer shopping cart management
- `wishlist`: Customer saved items
- `inventory`: Stock levels, reservation, and tracking
- `checkout`: Checkout flow and validation
- `orders`: Order placement, fulfillment, tracking
- `payments`: Payment processing, transaction ledger
- `shipping`: Carriers, rate calculation, tracking
- `reviews`: Customer ratings and product reviews
- `coupons`: Discount codes and coupon validation
- `promotions`: Promotional campaigns and banner rules
- `returns`: Return merchandise authorizations (RMA)
- `refunds`: Refund processing and ledger
- `notifications`: In-app and push notifications
- `email`: Transactional email templates and delivery
- `support`: Customer inquiries and ticketing
- `audit`: Audit logging and compliance tracking
- `analytics`: E-commerce sales and funnel analytics
