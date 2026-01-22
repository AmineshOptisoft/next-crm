export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  customRoleId?: {
    _id: string;
    name: string;
  };
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  
  // Extended fields
  phoneNumber?: string;
  // keapId removed
  address?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  country?: string; 
  gender?: string;
  tags?: string[];
  description?: string;
  
  // Working Area additions
  zone?: string;
  workingZipCodes?: string[];
  timesheetEnabled?: boolean;
  bookingEnabled?: boolean;
  availabilityEnabled?: boolean;
  isTechnicianActive?: boolean;
  staffRole?: "Staff" | "Trainee";
  avatarUrl?: string;

  workingArea?: string[];

  // Reviews
  reviews?: {
    _id?: string;
    title: string;
    rating: number;
    text: string;
    reviewer: string;
    createdAt?: string;
  }[];

  // For updates
  password?: string;
}
