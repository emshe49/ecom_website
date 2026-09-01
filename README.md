# E-Commerce Platform (Modular Monolith)

A production-style full-stack e-commerce platform built as a **modular monolith**.

## Architecture

> **Architecture Declaration**: This application follows a **modular-monolith architecture**. Business domains are separated internally into modules but are deployed as **one single backend application** sharing a unified database architecture. Microservices, separate authentication services, and external message broker services are intentionally avoided.

For in-depth design principles, see [docs/architecture.md](docs/architecture.md).

---

## Technology Stack

### Frontend
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **Server State Management**: TanStack Query v5
- **Client State Management**: Zustand v5
- **HTTP Client**: Axios (with concurrent refresh interceptor & credentials)
- **Form & Validation**: React Hook Form + Zod (`@hookform/resolvers`)
- **Icons**: Lucide React

### Backend
- **Runtime & Framework**: Node.js + Express
- **Language**: TypeScript
- **Database & ODM**: MongoDB + Mongoose v8
- **Authentication & Security**: JWT, bcrypt (12 rounds), HttpOnly cookies, token rotation, crypto tokens, Helmet, CORS
- **Schema Validation**: Zod
- **Rate Limiting**: express-rate-limit
- **Email Delivery**: Nodemailer (with safe console logging in dev)
- **Testing**: Vitest + Supertest

---

## Running the Application

- **Run all automated test suites**:
  ```bash
  npm test
  ```

- **Run frontend & backend concurrently**:
  ```bash
  npm run dev
  ```

- **Lint workspaces**:
  ```bash
  npm run lint
  ```

- **Build for production**:
  ```bash
  npm run build
  ```

---

## API Endpoints (Modules 01, 02 & 03)

### System Health
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | System health check, environment info, uptime, and database connectivity |

### Authentication (Module 02)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/auth/register` | No | Creates a new customer account and sends email verification link |
| `POST` | `/api/v1/auth/login` | No | Authenticates credentials, returns access token, sets HttpOnly refresh cookie |
| `POST` | `/api/v1/auth/refresh` | No (Cookie) | Rotates refresh token and issues new access token |
| `POST` | `/api/v1/auth/logout` | No (Cookie) | Revokes current session and clears HttpOnly refresh cookie |
| `POST` | `/api/v1/auth/logout-all` | Yes (Bearer) | Revokes all active sessions for the user across all devices |
| `GET` | `/api/v1/auth/me` | Yes (Bearer) | Returns identity info for authentication context |
| `POST` | `/api/v1/auth/verify-email` | No | Verifies customer email using cryptographic token |
| `POST` | `/api/v1/auth/resend-verification` | No | Re-sends email verification link to customer |
| `POST` | `/api/v1/auth/forgot-password` | No | Requests password reset link (anti-enumeration protected) |
| `POST` | `/api/v1/auth/reset-password` | No | Resets password with cryptographic token and revokes all sessions |
| `POST` | `/api/v1/auth/change-password` | Yes (Bearer) | Changes password for authenticated user and revokes other sessions |

### User Profile (Module 03)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/users/me` | Yes (Bearer) | Returns current authenticated user profile |
| `PATCH` | `/api/v1/users/me` | Yes (Bearer) | Updates first name, last name, phone, or avatar URL |

### Address Management (Module 03)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/addresses` | Yes (Bearer) | Creates a new address for authenticated user (max 20) |
| `GET` | `/api/v1/addresses` | Yes (Bearer) | Lists all saved addresses for authenticated user |
| `GET` | `/api/v1/addresses/:addressId` | Yes (Bearer) | Retrieves single owned address by ID |
| `PATCH` | `/api/v1/addresses/:addressId` | Yes (Bearer) | Updates fields of an owned address |
| `DELETE` | `/api/v1/addresses/:addressId` | Yes (Bearer) | Deletes owned address & reassigns default if necessary |
| `PATCH` | `/api/v1/addresses/:addressId/default-shipping` | Yes (Bearer) | Sets target address as default shipping |
| `PATCH` | `/api/v1/addresses/:addressId/default-billing` | Yes (Bearer) | Sets target address as default billing |

---

## Module Roadmap

- [x] **Module 01**: Project Architecture & Initial Setup
- [x] **Module 02**: Authentication & Session Management
- [x] **Module 03**: User Profile & Address Management
- [ ] **Module 04**: Roles & RBAC Permissions
- [ ] **Module 05**: Catalog (Categories, Brands, Products, Variants)
- [ ] **Module 06**: Search & Faceted Filtering
- [ ] **Module 07**: Shopping Cart
- [ ] **Module 08**: Wishlist
- [ ] **Module 09**: Inventory Management
- [ ] **Module 10**: Checkout & Order Management
