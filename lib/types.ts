export type ServiceCategory = 'Hair' | 'Skin' | 'Nails' | 'Body' | 'Bridal';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  longDescription: string;
  durationMinutes: number;
  price: number;
  imageUrl: string;
  employeeIds: string[];
  featured: boolean;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  bio: string;
  imageUrl: string;
  serviceIds: string[];
  rating: number;
  reviewCount: number;
  instagramHandle?: string;
  yearsExperience: number;
}

export interface Testimonial {
  id: string;
  authorName: string;
  avatarUrl: string;
  rating: number;
  text: string;
  service: string;
  date: string;
}

export interface BookingFormData {
  serviceId: string;
  employeeId: string;
  date: Date | null;
  timeSlot: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export interface EmployeeAvailability {
  id: string;
  employeeId: string;
  dayOfWeek: number;        // 0=Monday … 6=Sunday
  startTime: string;        // "09:00"
  endTime: string;          // "17:00"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityOverride {
  id: string;
  employeeId: string;
  overrideDate: string;     // ISO date string
  startTime: string | null;
  endTime: string | null;
  isBlocked: boolean;
  note: string | null;
  createdAt: string;
}

export interface TimeSlot {
  start: string;            // "10:00"
  end: string;              // "11:00"
}
