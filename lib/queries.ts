import { db } from "@/lib/db";
import { BRAND } from "@/lib/brand";
import { Service, Employee, Testimonial } from "@/lib/types";

// --- Services ---

export async function getServices(): Promise<Service[]> {
  const services = await db.service.findMany({
    include: { employeeServices: { select: { employeeId: true } } },
  });
  return services.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category as Service["category"],
    description: s.description,
    longDescription: s.longDescription,
    durationMinutes: s.durationMinutes,
    price: s.price,
    imageUrl: s.imageUrl,
    featured: s.featured,
    employeeIds: s.employeeServices.map((es) => es.employeeId),
  }));
}

export async function getServiceById(id: string): Promise<Service | null> {
  const s = await db.service.findUnique({
    where: { id },
    include: { employeeServices: { select: { employeeId: true } } },
  });
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    category: s.category as Service["category"],
    description: s.description,
    longDescription: s.longDescription,
    durationMinutes: s.durationMinutes,
    price: s.price,
    imageUrl: s.imageUrl,
    featured: s.featured,
    employeeIds: s.employeeServices.map((es) => es.employeeId),
  };
}

export async function createService(data: {
  id: string;
  name: string;
  category: string;
  description: string;
  longDescription: string;
  durationMinutes: number;
  price: number;
  imageUrl: string;
  featured?: boolean;
  employeeIds?: string[];
}) {
  const { employeeIds, ...serviceData } = data;
  return db.service.create({
    data: {
      ...serviceData,
      featured: serviceData.featured ?? false,
      employeeServices: employeeIds?.length
        ? {
            create: employeeIds.map((eid) => ({
              employeeId: eid,
            })),
          }
        : undefined,
    },
    include: { employeeServices: { select: { employeeId: true } } },
  });
}

export async function updateService(
  id: string,
  data: {
    name?: string;
    category?: string;
    description?: string;
    longDescription?: string;
    durationMinutes?: number;
    price?: number;
    imageUrl?: string;
    featured?: boolean;
    employeeIds?: string[];
  }
) {
  const { employeeIds, ...serviceData } = data;
  // If employeeIds provided, replace all assignments
  if (employeeIds !== undefined) {
    await db.employeeService.deleteMany({ where: { serviceId: id } });
    if (employeeIds.length > 0) {
      await db.employeeService.createMany({
        data: employeeIds.map((eid) => ({
          serviceId: id,
          employeeId: eid,
        })),
      });
    }
  }
  return db.service.update({
    where: { id },
    data: serviceData,
    include: { employeeServices: { select: { employeeId: true } } },
  });
}

export async function deleteService(id: string) {
  return db.service.delete({ where: { id } });
}

// --- Employees ---

export async function getEmployees(): Promise<Employee[]> {
  const employees = await db.employee.findMany({
    include: { employeeServices: { select: { serviceId: true } } },
  });
  return employees.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    role: e.role,
    bio: e.bio,
    imageUrl: e.imageUrl,
    rating: e.rating,
    reviewCount: e.reviewCount,
    instagramHandle: e.instagramHandle ?? undefined,
    yearsExperience: e.yearsExperience,
    serviceIds: e.employeeServices.map((es) => es.serviceId),
  }));
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const e = await db.employee.findUnique({
    where: { id },
    include: { employeeServices: { select: { serviceId: true } } },
  });
  if (!e) return null;
  return {
    id: e.id,
    name: e.name,
    email: e.email,
    role: e.role,
    bio: e.bio,
    imageUrl: e.imageUrl,
    rating: e.rating,
    reviewCount: e.reviewCount,
    instagramHandle: e.instagramHandle ?? undefined,
    yearsExperience: e.yearsExperience,
    serviceIds: e.employeeServices.map((es) => es.serviceId),
  };
}

export async function createEmployee(data: {
  id: string;
  name: string;
  email?: string;
  role: string;
  bio: string;
  imageUrl: string;
  yearsExperience: number;
  instagramHandle?: string;
  serviceIds?: string[];
}) {
  const { serviceIds, ...employeeData } = data;
  return db.employee.create({
    data: {
      ...employeeData,
      email: employeeData.email || "",
      instagramHandle: employeeData.instagramHandle || null,
      employeeServices: serviceIds?.length
        ? {
            create: serviceIds.map((sid) => ({
              serviceId: sid,
            })),
          }
        : undefined,
    },
    include: { employeeServices: { select: { serviceId: true } } },
  });
}

export async function updateEmployee(
  id: string,
  data: {
    name?: string;
    email?: string;
    role?: string;
    bio?: string;
    imageUrl?: string;
    yearsExperience?: number;
    instagramHandle?: string;
    serviceIds?: string[];
  }
) {
  const { serviceIds, ...employeeData } = data;
  if (serviceIds !== undefined) {
    await db.employeeService.deleteMany({ where: { employeeId: id } });
    if (serviceIds.length > 0) {
      await db.employeeService.createMany({
        data: serviceIds.map((sid) => ({
          employeeId: id,
          serviceId: sid,
        })),
      });
    }
  }
  return db.employee.update({
    where: { id },
    data: { ...employeeData, instagramHandle: employeeData.instagramHandle || null },
    include: { employeeServices: { select: { serviceId: true } } },
  });
}

export async function deleteEmployee(id: string) {
  return db.employee.delete({ where: { id } });
}

// --- Testimonials ---

export async function getTestimonials(): Promise<Testimonial[]> {
  const testimonials = await db.testimonial.findMany();
  return testimonials.map((t) => ({
    id: t.id,
    authorName: t.authorName,
    avatarUrl: t.avatarUrl,
    rating: t.rating,
    text: t.text,
    service: t.service,
    date: t.date,
  }));
}

// --- Users (Auth) ---

export async function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } });
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: "user" | "admin" | "employee";
  avatarUrl: string;
}) {
  return db.user.create({ data });
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    avatarUrl?: string;
    password?: string;
  }
) {
  return db.user.update({ where: { id }, data });
}

export async function findUserById(id: string) {
  return db.user.findUnique({ where: { id } });
}

// --- Bookings ---

export async function createBooking(data: {
  serviceId: string;
  employeeId: string;
  userId?: string;
  date: Date;
  timeSlot: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  price: number;
}) {
  return db.booking.create({ data });
}

export async function getBookings() {
  return db.booking.findMany({
    include: { service: true, user: true, employee: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateBookingStatus(
  id: string,
  status: "pending" | "confirmed" | "completed" | "cancelled"
) {
  return db.booking.update({
    where: { id },
    data: { status },
  });
}

// --- Employee Email Generation ---

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, ".");
}

export async function generateUniqueEmployeeEmail(name: string): Promise<string> {
  const domain = BRAND.domain;
  const baseSlug = slugifyName(name);
  let candidate = `${baseSlug}@${domain}`;

  // Check if email already exists in Employee, and append a number if so
  let counter = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db.employee.findFirst({ where: { email: candidate } });
    if (!existing) return candidate;
    counter++;
    candidate = `${baseSlug}${counter}@${domain}`;
  }
}

// --- Time Slots ---

export const timeSlots = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM",
];
