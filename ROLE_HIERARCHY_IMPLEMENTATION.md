# Role Hierarchy Feature Implementation

## Overview
Successfully implemented a role hierarchy system that allows roles to have parent-child relationships.

## Changes Made

### 1. Database Model Updates (`app/models/Role.ts`)
Added two new fields to the Role schema:
- **`isParent`**: Number field (0 or 1)
  - `1` = Parent role (can be selected as a parent for other roles)
  - `0` = Child role (has a parent assigned)
  - Default value: `1`
- **`parentRoleId`**: ObjectId reference to another Role
  - Stores the ID of the parent role
  - Default value: `null`

### 2. Frontend Updates (`app/dashboard/roles/page.tsx`)

#### Interface Updates
- Updated `Role` interface to include `isParent` and `parentRoleId` fields
- Added imports for `Switch` and `Select` components

#### Form State Updates
- Added `hasParent` boolean to track toggle state
- Added `parentRoleId` string to store selected parent role

#### UI Enhancements
Added a new "Role Hierarchy" section in the role creation/edit form:
- **Toggle Switch**: "Has Parent Role" - enables/disables parent role selection
- **Dropdown**: Shows when toggle is ON, displays only roles where `isParent = 1`
- **Validation**: Prevents selecting the current role as its own parent
- **Helper Text**: Shows message when no parent roles are available

### 3. API Updates

#### POST Endpoint (`app/api/roles/route.ts`)
- Accepts `hasParent` and `parentRoleId` from request body
- Validates that parent role is required when `hasParent` is true
- Validates that selected parent role exists and has `isParent = 1`
- Sets `isParent = 0` when role has a parent, `isParent = 1` when it doesn't
- Stores `parentRoleId` when parent is assigned

#### PUT Endpoint (`app/api/roles/[id]/route.ts`)
- Same validation as POST endpoint
- Additional check to prevent circular references (role cannot be its own parent)
- Updates `isParent` and `parentRoleId` fields based on form data

## How It Works

### Creating a Parent Role
1. Create a role without enabling "Has Parent Role" toggle
2. The role will have `isParent = 1` and can be selected as a parent for other roles

### Creating a Child Role
1. Create a new role
2. Enable "Has Parent Role" toggle
3. Select a parent role from the dropdown (only shows roles with `isParent = 1`)
4. The role will have `isParent = 0` and `parentRoleId` set to the selected parent

### Editing Roles
- Can change parent assignment by toggling "Has Parent Role"
- Can switch between parent and child role types
- Validation ensures data integrity

## Business Logic

The system follows this logic:
- **`isParent = 1`**: Role is a parent (or standalone) role
  - Can be selected as a parent for other roles
  - `parentRoleId` is `null`
  
- **`isParent = 0`**: Role is a child role
  - Has a parent role assigned
  - `parentRoleId` contains the parent role's ID
  - Cannot be selected as a parent for other roles

## Validation Rules

1. If "Has Parent" toggle is ON, a parent role must be selected
2. Selected parent role must exist in the database
3. Selected parent role must have `isParent = 1`
4. A role cannot be its own parent (circular reference prevention)
5. Only roles with `isParent = 1` appear in the parent role dropdown

## Testing Recommendations

1. **Create a parent role**: Create a role without parent assignment
2. **Create a child role**: Create a role with parent assignment
3. **Edit parent role**: Try to edit and verify it cannot be assigned a parent if it has children
4. **Edit child role**: Change parent assignment or remove parent
5. **Validation**: Try to submit form with toggle ON but no parent selected
6. **Edge cases**: Try to create circular references

## Future Enhancements (Optional)

1. Display parent role name in the roles table
2. Show role hierarchy tree view
3. Prevent deleting parent roles that have children
4. Inherit permissions from parent roles
5. Multi-level hierarchy support (grandparent-parent-child)
