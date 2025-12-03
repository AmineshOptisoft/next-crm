# Multi-Tenant Role-Based Access Control (RBAC) System

## 🏢 **System Overview**

The CRM now implements a comprehensive multi-tenant architecture with role-based access control, allowing complete data isolation between companies while providing granular permission management.

---

## 👥 **User Roles Hierarchy**

### **1. Super Admin** 🔑
- **Purpose:** Platform owner/administrator
- **Access:** Full access to ALL companies and data
- **Capabilities:**
  - View and manage all companies
  - Access all modules across all companies
  - Cannot be created via signup (must be manually created in database)
  - Bypass all permission checks

### **2. Company Admin** 👔
- **Purpose:** Company owner/administrator
- **Created:** Automatically when signing up
- **Access:** Full access to their own company data only
- **Capabilities:**
  - Manage all data within their company
  - Create and manage custom roles
  - Add/edit/delete company users
  - Assign roles to users
  - Full CRUD on all modules
  - Cannot access other companies' data

### **3. Company User** 👤
- **Purpose:** Team members with specific roles
- **Created:** By Company Admin
- **Access:** Based on assigned custom role permissions
- **Capabilities:**
  - Access only modules granted by their role
  - Perform only actions allowed (view, create, edit, delete, export)
  - Can only see data from their own company
  - Cannot manage roles or users

---

## 🏗️ **Data Models**

### **User Model** (Enhanced)
```typescript
{
  firstName: string
  lastName: string
  email: string (unique)
  passwordHash: string
  
  // Multi-tenant fields
  role: "super_admin" | "company_admin" | "company_user"
  companyId: ObjectId (ref: Company)
  companyName: string
  customRoleId: ObjectId (ref: Role) // For company_user only
  
  // Status
  isActive: boolean
  isVerified: boolean
  
  // Settings
  settings: object
}
```

### **Company Model** (New)
```typescript
{
  name: string
  adminId: ObjectId (ref: User) // Company admin who created it
  
  // Company details
  description: string
  industry: string
  website: string
  logo: string
  email: string
  phone: string
  address: object
  
  // Subscription
  plan: "free" | "starter" | "professional" | "enterprise"
  planExpiry: Date
  
  // Limits
  limits: {
    users: number (default: 10)
    contacts: number (default: 1000)
    deals: number (default: 500)
  }
  
  // Settings
  settings: {
    allowUserRegistration: boolean
    requireEmailVerification: boolean
    timezone: string
    currency: string
  }
  
  isActive: boolean
}
```

### **Role Model** (New)
```typescript
{
  companyId: ObjectId (ref: Company)
  name: string
  description: string
  
  // Permissions array
  permissions: [
    {
      module: string // "dashboard", "contacts", "deals", etc.
      canView: boolean
      canCreate: boolean
      canEdit: boolean
      canDelete: boolean
      canExport: boolean
    }
  ]
  
  isSystemRole: boolean // Cannot be deleted
  isActive: boolean
  createdBy: ObjectId (ref: User)
}
```

---

## 🔐 **Permission System**

### **Available Modules:**
- dashboard
- employees
- tasks
- contacts
- deals
- products
- invoices
- meetings
- activities
- analytics
- settings
- roles
- users

### **Available Actions:**
- **canView:** Can see the module and its data
- **canCreate:** Can add new records
- **canEdit:** Can modify existing records
- **canDelete:** Can remove records
- **canExport:** Can export data to files

### **Permission Checking:**
```typescript
// Check if user has permission
await checkPermission(userId, "contacts", "create");
// Returns: true/false
```

---

## 📋 **Default Roles**

When a company is created, 4 default roles are automatically generated:

### **1. Sales Manager**
- Full access to: Contacts, Deals, Activities, Meetings
- View access to: Dashboard, Tasks, Analytics
- Can export: Contacts, Deals, Analytics

### **2. Sales Representative**
- Create/Edit access to: Contacts, Deals, Activities, Meetings, Tasks
- View access to: Dashboard
- No delete or export permissions

### **3. Accountant**
- Full access to: Invoices, Products
- View access to: Dashboard, Contacts, Deals
- Can export: Invoices, Products

### **4. Viewer**
- View-only access to: Dashboard, Contacts, Deals, Tasks, Activities, Analytics
- No create, edit, delete, or export permissions

---

## 🔄 **Signup Flow**

### **New User Registration:**
1. User fills signup form with company name
2. System creates:
   - User account (role: `company_admin`)
   - Company record
   - 4 default roles for the company
3. User receives verification email
4. Upon verification, user can:
   - Access full CRM features
   - Create custom roles
   - Add team members

### **Adding Team Members (by Company Admin):**
1. Company Admin navigates to Users section
2. Clicks "Add User"
3. Fills in user details and assigns a role
4. New user is created with:
   - Role: `company_user`
   - CompanyId: Same as admin's company
   - CustomRoleId: Selected role
   - Auto-verified (no email verification needed)
5. User can login immediately with assigned permissions

---

## 🛡️ **Data Isolation**

### **All Models Updated:**
Every data model now includes `companyId` field:
- Employee
- Task
- Contact
- Deal
- Product
- Invoice
- Meeting
- Activity

### **Query Filtering:**
All API endpoints automatically filter by:
```typescript
// For Company Admin and Company User
{ companyId: user.companyId }

// For Super Admin
// No filter - can see all data
```

### **Example:**
- **Flipkart Admin** signs up → Creates "Flipkart" company
- **Amazon Admin** signs up → Creates "Amazon" company
- Flipkart Admin can ONLY see Flipkart's:
  - Contacts
  - Deals
  - Invoices
  - etc.
- Amazon Admin can ONLY see Amazon's data
- Super Admin can see BOTH companies' data

---

## 🔧 **API Endpoints**

### **Role Management**
```
GET    /api/roles          - List all roles in company
POST   /api/roles          - Create custom role (admin only)
GET    /api/roles/[id]     - Get role details
PUT    /api/roles/[id]     - Update role (admin only)
DELETE /api/roles/[id]     - Delete role (admin only, not system roles)
```

### **User Management**
```
GET    /api/users          - List all users in company (admin only)
POST   /api/users          - Create new user (admin only)
GET    /api/users/[id]     - Get user details
PUT    /api/users/[id]     - Update user (admin only)
DELETE /api/users/[id]     - Deactivate user (admin only)
```

---

## 🎯 **Usage Examples**

### **Creating a Custom Role:**
```typescript
POST /api/roles
{
  "name": "Customer Support",
  "description": "Handle customer inquiries",
  "permissions": [
    {
      "module": "contacts",
      "canView": true,
      "canCreate": true,
      "canEdit": true,
      "canDelete": false,
      "canExport": false
    },
    {
      "module": "activities",
      "canView": true,
      "canCreate": true,
      "canEdit": true,
      "canDelete": false,
      "canExport": false
    }
  ]
}
```

### **Adding a Team Member:**
```typescript
POST /api/users
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@company.com",
  "password": "SecurePass123",
  "customRoleId": "role_id_here"
}
```

---

## 🔍 **Permission Checking in Code**

### **In API Routes:**
```typescript
import { getCurrentUser, checkPermission } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  // Check permission
  const canCreate = await checkPermission(user.userId, "contacts", "create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // Proceed with creation...
}
```

### **Helper Functions:**
```typescript
// Check if super admin
await requireSuperAdmin(userId);

// Check if company admin or super admin
await requireCompanyAdmin(userId);

// Get accessible companies (for super admin)
await getAccessibleCompanies(userId);
```

---

## 📊 **Database Indexes**

All models now have optimized indexes:
```typescript
// Company-based queries
{ companyId: 1, status: 1 }
{ companyId: 1, createdAt: -1 }

// User queries
{ companyId: 1, role: 1 }
{ customRoleId: 1 }

// Role queries
{ companyId: 1, name: 1 } // Unique compound index
```

---

## 🚀 **Migration Notes**

### **Existing Data:**
If you have existing data without `companyId`:
1. Create a default company
2. Update all existing records with the default companyId
3. Update existing users with role and companyId

### **Creating Super Admin:**
```javascript
// Run in MongoDB shell or script
db.users.updateOne(
  { email: "superadmin@example.com" },
  { 
    $set: { 
      role: "super_admin",
      isActive: true,
      isVerified: true
    }
  }
);
```

---

## ✅ **Security Features**

1. ✅ **Data Isolation:** Companies cannot access each other's data
2. ✅ **Role-Based Access:** Granular permissions per module
3. ✅ **Action-Level Control:** Separate permissions for view/create/edit/delete
4. ✅ **System Role Protection:** Default roles cannot be deleted
5. ✅ **Company Admin Protection:** Cannot delete or change company admin role
6. ✅ **Soft Deletes:** Users and roles are deactivated, not deleted
7. ✅ **Permission Validation:** All API endpoints check permissions
8. ✅ **Company Validation:** All queries filtered by companyId

---

## 🎉 **Summary**

Your CRM now supports:
- ✅ **Multi-Tenancy:** Complete data isolation between companies
- ✅ **3-Tier Role System:** Super Admin → Company Admin → Company User
- ✅ **Custom Roles:** Company admins can create unlimited custom roles
- ✅ **Granular Permissions:** 5 actions × 13 modules = 65 permission combinations
- ✅ **Default Roles:** 4 pre-configured roles for common use cases
- ✅ **Team Management:** Company admins can add/manage team members
- ✅ **Secure by Default:** All data queries automatically filtered by company

**Perfect for:**
- SaaS CRM platforms
- Multi-company environments
- Enterprise deployments
- White-label solutions
