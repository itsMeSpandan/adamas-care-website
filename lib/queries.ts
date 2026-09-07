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
    gender: (e.gender as Employee["gender"]) ?? undefined,
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
    gender: (e.gender as Employee["gender"]) ?? undefined,
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
  gender?: "male" | "female" | "other" | null;
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
      gender: employeeData.gender || null,
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
    gender?: "male" | "female" | "other" | null;
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
    data: { ...employeeData, instagramHandle: employeeData.instagramHandle || null, gender: employeeData.gender ?? undefined },
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
  gender?: "male" | "female" | "other" | null;
  whatsappNumber?: string | null;
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
    mustChangePassword?: boolean;
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

  // Stage 3.5: Bounded loop — max 50 iterations to prevent infinite loop on DB outage
  const MAX_ATTEMPTS = 50;
  for (let counter = 1; counter <= MAX_ATTEMPTS; counter++) {
    const existing = await db.employee.findFirst({ where: { email: candidate } });
    if (!existing) return candidate;
    candidate = `${baseSlug}${counter}@${domain}`;
  }

  throw new Error(
    `Could not generate unique email for "${name}" after ${MAX_ATTEMPTS} attempts. ` +
    "The database may be experiencing issues."
  );
}

// --- Time Slots ---

export const timeSlots = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM",
];
