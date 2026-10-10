import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/crypto";
import { buildCatalog } from "./services-catalog";

const prisma = new PrismaClient();

// The salon's live menu, parsed from the owner's price list
// (prisma/data/grace_salon_services.csv). Name, category, price, duration,
// variant and gender all come from the CSV, so the seed can never drift from
// the real menu. Rows the menu gives no duration or price for are excluded —
// see prisma/services-catalog.ts.
const { services: servicesData } = buildCatalog();

// Every service in the catalog — each specialist performs all of them.
const ALL_SERVICE_IDS = servicesData.map((s) => s.id);

// 2 female + 2 male all-rounder specialists.
// Each specialist offers ALL services (no partial/service-specific assignments).
const employeesData = [
  {
    id: "priya-sharma",
    name: "Priya Sharma",
    email: "priya@gracesalon.com",
    role: "Lead Stylist & Creative Director",
    gender: "female" as const,
    bio: "With over 15 years of experience in high-fashion editorial and salon work, Priya brings an artist's eye to every cut and style. Trained globally, she specializes in precision cutting and transformative color.",
    imageUrl: "/images/photo-1580618672591-eb180b1a973f",
    rating: 4.9,
    reviewCount: 247,
    instagramHandle: "@priya.creates",
    yearsExperience: 15,
    serviceIds: ALL_SERVICE_IDS,
  },
  {
    id: "kavya-iyer",
    name: "Kavya Iyer",
    email: "kavya@gracesalon.com",
    role: "Master Aesthetician",
    gender: "female" as const,
    bio: "Kavya's holistic approach to skincare combines advanced clinical treatments with mindful wellness practices. Certified in chemical peels, microcurrent therapy, and LED treatments.",
    imageUrl: "/images/photo-1531746020798-e6953c6e8e04",
    rating: 4.9,
    reviewCount: 212,
    instagramHandle: "@kavyaglows",
    yearsExperience: 8,
    serviceIds: ALL_SERVICE_IDS,
  },
  {
    id: "rahul-verma",
    name: "Rahul Verma",
    email: "rahul@gracesalon.com",
    role: "Senior Hair & Beauty Specialist",
    gender: "male" as const,
    bio: "Rahul brings a fresh, modern perspective to hairstyling with a focus on textured cuts and lived-in color. His background in fashion week styling gives him versatility across all beauty services.",
    imageUrl: "/images/photo-1507003211169-0a1dd7228f2d",
    rating: 4.7,
    reviewCount: 134,
    yearsExperience: 6,
    serviceIds: ALL_SERVICE_IDS,
  },
  {
    id: "arjun-mehta",
    name: "Arjun Mehta",
    email: "arjun@gracesalon.com",
    role: "Body & Wellness Specialist",
    gender: "male" as const,
    bio: "Arjun is a certified massage therapist and wellness expert who blends Ayurvedic traditions with modern therapeutic techniques. His holistic approach ensures every client leaves feeling rejuvenated.",
    imageUrl: "/images/photo-1472099645785-5658abf4ff4e",
    rating: 4.8,
    reviewCount: 165,
    yearsExperience: 10,
    serviceIds: ALL_SERVICE_IDS,
  },
];

const testimonialsData = [
  {
    id: "t1",
    authorName: "Riya Kapoor",
    avatarUrl: "/images/photo-1494790108755-2616b612b786",
    rating: 5,
    text: "The deep tissue massage sorted out knots I had carried for months. Firm, deliberate work and a therapist who actually listens when you say where it hurts.",
    service: "Deep Tissue Massage (60 min)",
    date: "2024-11-15",
  },
  {
    id: "t2",
    authorName: "Pooja Singh",
    avatarUrl: "/images/photo-1517841905240-472988babdf9",
    rating: 5,
    text: "The aromatherapy massage is my monthly reset. They blend the oil with you beforehand and the room smells incredible — I sleep properly for days afterwards.",
    service: "Aromatherapy (60 min)",
    date: "2024-12-02",
  },
  {
    id: "t3",
    authorName: "Meera Joshi",
    avatarUrl: "/images/photo-1534528741775-53994a69daeb",
    rating: 5,
    text: "Booked the body polishing before my sister's wedding and my skin has never looked better. The scrub, the massage afterwards, the whole thing felt indulgent.",
    service: "Body Polishing (90 min)",
    date: "2024-10-20",
  },
  {
    id: "t4",
    authorName: "Aditi Rao",
    avatarUrl: "/images/photo-1524504388940-b1c1722653e1",
    rating: 5,
    text: "I was sceptical about reflexology until I tried it here. An hour later my feet felt new and I was almost asleep on the table. Now it is a fortnightly habit.",
    service: "Foot Reflexology (60 min)",
    date: "2024-12-10",
  },
  {
    id: "t5",
    authorName: "Nandini Menon",
    avatarUrl: "/images/photo-1488426862026-3ee34a7d66df",
    rating: 4,
    text: "The Thai massage is properly firm — stretching, elbows, the lot. I came in stiff from desk work and left genuinely loosened up.",
    service: "Thai Massage (60 min)",
    date: "2024-11-28",
  },
  {
    id: "t6",
    authorName: "Tara Chatterjee",
    avatarUrl: "/images/photo-1502823403499-6ccfcf4fb453",
    rating: 5,
    text: "The Indian head massage is the best value on the menu. Twenty minutes on the scalp, neck and shoulders and a headache that had lasted all day was simply gone.",
    service: "Head Massage",
    date: "2024-09-05",
  },
];

const usersData = [
  {
    name: "Riya Kapoor",
    email: "demo@gracesalon.com",
    password: "demo123",
    role: "user" as const,
    gender: "female" as const,
    avatarUrl: "/images/photo-1494790108755-2616b612b786",
    employeeId: null as string | null,
  },
  {
    name: "Isha Malhotra",
    email: "admin@gracesalon.com",
    password: "admin123",
    role: "admin" as const,
    gender: "female" as const,
    avatarUrl: "/images/photo-1438761681033-6461ffad8d80",
    employeeId: null as string | null,
  },
  {
    name: "Priya Sharma",
    email: "priya@gracesalon.com",
    password: "priya123",
    role: "employee" as const,
    gender: "female" as const,
    avatarUrl: "/images/photo-1580618672591-eb180b1a973f",
    employeeId: "priya-sharma",
  },
  {
    name: "Kavya Iyer",
    email: "kavya@gracesalon.com",
    password: "kavya123",
    role: "employee" as const,
    gender: "female" as const,
    avatarUrl: "/images/photo-1531746020798-e6953c6e8e04",
    employeeId: "kavya-iyer",
  },
  {
    name: "Rahul Verma",
    email: "rahul@gracesalon.com",
    password: "rahul123",
    role: "employee" as const,
    gender: "male" as const,
    avatarUrl: "/images/photo-1507003211169-0a1dd7228f2d",
    employeeId: "rahul-verma",
  },
  {
    name: "Arjun Mehta",
    email: "arjun@gracesalon.com",
    password: "arjun123",
    role: "employee" as const,
    gender: "male" as const,
    avatarUrl: "/images/photo-1472099645785-5658abf4ff4e",
    employeeId: "arjun-mehta",
  },
];

// Helper to generate a date string for a given month offset from now
function bookingDate(monthsAgo: number, day: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(day);
  d.setHours(0, 0, 0, 0);
  return d;
}

const bookingsData = [
  // 11 months ago (Jul 2025)
  { serviceId: "deep-tissue-massage-60", employeeId: "priya-sharma", userId: null, date: bookingDate(11, 5), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Ananya Mehta", email: "ananya@example.com", phone: "+91 98765 43210", notes: null, status: "completed" as const, price: 1000, rating: 5, review: "Wonderfully relaxing, I left feeling completely reset." },
  { serviceId: "swedish-massage-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(11, 12), timeSlot: "14:00 - 15:00", slotStart: "14:00", slotEnd: "15:00", name: "Farhan Sheikh", email: "farhan@example.com", phone: "+91 98765 43211", notes: null, status: "completed" as const, price: 900, rating: 5, review: null },
  { serviceId: "head-massage", employeeId: "arjun-mehta", userId: null, date: bookingDate(11, 20), timeSlot: "11:00 - 11:30", slotStart: "11:00", slotEnd: "11:30", name: "Deepak Nair", email: "deepak@example.com", phone: "+91 98765 43212", notes: "Shoulder pain", status: "completed" as const, price: 200, rating: 4, review: null },
  // 10 months ago (Aug 2025)
  { serviceId: "aromatherapy-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(10, 3), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Rohit Banerjee", email: "rohit@example.com", phone: "+91 98765 43213", notes: null, status: "completed" as const, price: 700, rating: 5, review: null },
  { serviceId: "foot-massage-60", employeeId: "priya-sharma", userId: null, date: bookingDate(10, 15), timeSlot: "09:00 - 10:00", slotStart: "09:00", slotEnd: "10:00", name: "Nisha Agarwal", email: "nisha@example.com", phone: "+91 98765 43214", notes: "Wedding prep", status: "completed" as const, price: 400, rating: 5, review: "Excellent pressure and a genuinely calming room." },
  { serviceId: "full-body-scrubbing-60", employeeId: "priya-sharma", userId: null, date: bookingDate(10, 22), timeSlot: "13:00 - 14:00", slotStart: "13:00", slotEnd: "14:00", name: "Simran Kaur", email: "simran@example.com", phone: "+91 98765 43215", notes: null, status: "completed" as const, price: 1500, rating: 4, review: null },
  // 9 months ago (Sep 2025)
  { serviceId: "swedish-massage-60", employeeId: "rahul-verma", userId: null, date: bookingDate(9, 7), timeSlot: "15:00 - 16:00", slotStart: "15:00", slotEnd: "16:00", name: "Arjun Reddy", email: "arjun@example.com", phone: "+91 98765 43216", notes: null, status: "completed" as const, price: 900, rating: 4, review: null },
  { serviceId: "body-polishing-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(9, 14), timeSlot: "11:00 - 12:00", slotStart: "11:00", slotEnd: "12:00", name: "Lakshmi Iyer", email: "lakshmi@example.com", phone: "+91 98765 43217", notes: null, status: "completed" as const, price: 2000, rating: 5, review: null },
  { serviceId: "thai-massage-60", employeeId: "rahul-verma", userId: null, date: bookingDate(9, 25), timeSlot: "14:00 - 15:00", slotStart: "14:00", slotEnd: "15:00", name: "Tanya Ghosh", email: "tanya@example.com", phone: "+91 98765 43218", notes: null, status: "completed" as const, price: 700, rating: 5, review: null },
  // 8 months ago (Oct 2025)
  { serviceId: "deep-tissue-massage-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(8, 2), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Karan Malhotra", email: "karan@example.com", phone: "+91 98765 43219", notes: null, status: "completed" as const, price: 1000, rating: 4, review: null },
  { serviceId: "head-neck-and-shoulder-massage-60", employeeId: "arjun-mehta", userId: null, date: bookingDate(8, 10), timeSlot: "15:00 - 16:00", slotStart: "15:00", slotEnd: "16:00", name: "Divya Chopra", email: "divya@example.com", phone: "+91 98765 43220", notes: null, status: "completed" as const, price: 450, rating: 5, review: null },
  { serviceId: "foot-massage-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(8, 18), timeSlot: "08:00 - 09:00", slotStart: "08:00", slotEnd: "09:00", name: "Pallavi Das", email: "pallavi@example.com", phone: "+91 98765 43221", notes: "Wedding day", status: "completed" as const, price: 400, rating: 5, review: "Best massage I have had in Kolkata — I will be back." },
  { serviceId: "aromatherapy-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(8, 28), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Meghna Roy", email: "meghna@example.com", phone: "+91 98765 43222", notes: null, status: "cancelled" as const, price: 0, rating: null, review: null },
  // 7 months ago (Nov 2025)
  { serviceId: "head-massage", employeeId: "arjun-mehta", userId: null, date: bookingDate(7, 4), timeSlot: "11:00 - 11:30", slotStart: "11:00", slotEnd: "11:30", name: "Vikram Joshi", email: "vikram@example.com", phone: "+91 98765 43223", notes: null, status: "completed" as const, price: 200, rating: 5, review: null },
  { serviceId: "swedish-massage-60", employeeId: "priya-sharma", userId: null, date: bookingDate(7, 11), timeSlot: "14:00 - 15:00", slotStart: "14:00", slotEnd: "15:00", name: "Rina Bose", email: "rina@example.com", phone: "+91 98765 43224", notes: null, status: "completed" as const, price: 900, rating: 5, review: null },
  { serviceId: "deep-tissue-massage-60", employeeId: "rahul-verma", userId: null, date: bookingDate(7, 19), timeSlot: "09:00 - 10:00", slotStart: "09:00", slotEnd: "10:00", name: "Amit Chakraborty", email: "amit@example.com", phone: "+91 98765 43225", notes: null, status: "completed" as const, price: 1000, rating: 4, review: null },
  { serviceId: "foot-reflexology-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(7, 26), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Smita Verma", email: "smita@example.com", phone: "+91 98765 43226", notes: "First session", status: "completed" as const, price: 700, rating: 5, review: null },
  // 6 months ago (Dec 2025)
  { serviceId: "foot-massage-60", employeeId: "priya-sharma", userId: null, date: bookingDate(6, 1), timeSlot: "09:00 - 10:00", slotStart: "09:00", slotEnd: "10:00", name: "Neha Bajaj", email: "neha.b@example.com", phone: "+91 98765 43227", notes: null, status: "completed" as const, price: 400, rating: 5, review: null },
  { serviceId: "full-body-scrubbing-60", employeeId: "priya-sharma", userId: null, date: bookingDate(6, 8), timeSlot: "15:00 - 16:00", slotStart: "15:00", slotEnd: "16:00", name: "Ayesha Khan", email: "ayesha@example.com", phone: "+91 98765 43228", notes: null, status: "completed" as const, price: 1500, rating: 4, review: null },
  { serviceId: "thai-massage-60", employeeId: "rahul-verma", userId: null, date: bookingDate(6, 15), timeSlot: "11:00 - 12:00", slotStart: "11:00", slotEnd: "12:00", name: "Priti Sengupta", email: "priti@example.com", phone: "+91 98765 43229", notes: null, status: "completed" as const, price: 700, rating: 5, review: null },
  { serviceId: "body-polishing-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(6, 22), timeSlot: "14:00 - 15:00", slotStart: "14:00", slotEnd: "15:00", name: "Shruti Menon", email: "shruti@example.com", phone: "+91 98765 43230", notes: null, status: "completed" as const, price: 2000, rating: 5, review: null },
  // 5 months ago (Jan 2026)
  { serviceId: "head-massage", employeeId: "arjun-mehta", userId: null, date: bookingDate(5, 3), timeSlot: "10:00 - 10:30", slotStart: "10:00", slotEnd: "10:30", name: "Rajan Pillai", email: "rajan@example.com", phone: "+91 98765 43231", notes: null, status: "completed" as const, price: 200, rating: 4, review: null },
  { serviceId: "swedish-massage-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(5, 10), timeSlot: "13:00 - 14:00", slotStart: "13:00", slotEnd: "14:00", name: "Gayatri Rao", email: "gayatri@example.com", phone: "+91 98765 43232", notes: null, status: "completed" as const, price: 900, rating: 5, review: null },
  { serviceId: "deep-tissue-massage-60", employeeId: "priya-sharma", userId: null, date: bookingDate(5, 17), timeSlot: "11:00 - 12:00", slotStart: "11:00", slotEnd: "12:00", name: "Sanjay Gupta", email: "sanjay@example.com", phone: "+91 98765 43233", notes: null, status: "completed" as const, price: 1000, rating: 5, review: null },
  { serviceId: "head-neck-and-shoulder-massage-60", employeeId: "rahul-verma", userId: null, date: bookingDate(5, 24), timeSlot: "15:00 - 16:00", slotStart: "15:00", slotEnd: "16:00", name: "Usha Pillai", email: "usha@example.com", phone: "+91 98765 43234", notes: null, status: "completed" as const, price: 450, rating: 5, review: null },
  // 4 months ago (Feb 2026)
  { serviceId: "aromatherapy-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(4, 2), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Kavita Sharma", email: "kavita@example.com", phone: "+91 98765 43235", notes: null, status: "completed" as const, price: 700, rating: 5, review: null },
  { serviceId: "foot-massage-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(4, 14), timeSlot: "09:00 - 10:00", slotStart: "09:00", slotEnd: "10:00", name: "Mitali Sen", email: "mitali@example.com", phone: "+91 98765 43236", notes: null, status: "completed" as const, price: 400, rating: 5, review: null },
  { serviceId: "full-body-scrubbing-60", employeeId: "priya-sharma", userId: null, date: bookingDate(4, 20), timeSlot: "12:00 - 13:00", slotStart: "12:00", slotEnd: "13:00", name: "Tanvi Shah", email: "tanvi@example.com", phone: "+91 98765 43237", notes: null, status: "completed" as const, price: 1500, rating: 4, review: null },
  { serviceId: "deep-tissue-massage-60", employeeId: "rahul-verma", userId: null, date: bookingDate(4, 28), timeSlot: "14:00 - 15:00", slotStart: "14:00", slotEnd: "15:00", name: "Manish Tiwari", email: "manish@example.com", phone: "+91 98765 43238", notes: null, status: "completed" as const, price: 1000, rating: 4, review: null },
  // 3 months ago (Mar 2026)
  { serviceId: "head-massage", employeeId: "arjun-mehta", userId: null, date: bookingDate(3, 5), timeSlot: "11:00 - 11:30", slotStart: "11:00", slotEnd: "11:30", name: "Ashok Mishra", email: "ashok@example.com", phone: "+91 98765 43239", notes: null, status: "completed" as const, price: 200, rating: 5, review: null },
  { serviceId: "swedish-massage-60", employeeId: "priya-sharma", userId: null, date: bookingDate(3, 12), timeSlot: "15:00 - 16:00", slotStart: "15:00", slotEnd: "16:00", name: "Rekha Menon", email: "rekha@example.com", phone: "+91 98765 43240", notes: null, status: "completed" as const, price: 900, rating: 5, review: null },
  { serviceId: "thai-massage-60", employeeId: "priya-sharma", userId: null, date: bookingDate(3, 19), timeSlot: "13:00 - 14:00", slotStart: "13:00", slotEnd: "14:00", name: "Ishita Das", email: "ishita@example.com", phone: "+91 98765 43241", notes: null, status: "completed" as const, price: 700, rating: 5, review: null },
  { serviceId: "body-polishing-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(3, 26), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Sarojini Patel", email: "sarojini@example.com", phone: "+91 98765 43242", notes: null, status: "completed" as const, price: 2000, rating: 5, review: null },
  // 2 months ago (Apr 2026)
  { serviceId: "deep-tissue-massage-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(2, 3), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Nitin Srivastava", email: "nitin@example.com", phone: "+91 98765 43243", notes: null, status: "completed" as const, price: 1000, rating: 4, review: null },
  { serviceId: "foot-massage-60", employeeId: "priya-sharma", userId: null, date: bookingDate(2, 10), timeSlot: "09:00 - 10:00", slotStart: "09:00", slotEnd: "10:00", name: "Jaya Bachchan", email: "jaya@example.com", phone: "+91 98765 43244", notes: "Engagement", status: "completed" as const, price: 400, rating: 5, review: null },
  { serviceId: "head-neck-and-shoulder-massage-60", employeeId: "arjun-mehta", userId: null, date: bookingDate(2, 17), timeSlot: "14:00 - 15:00", slotStart: "14:00", slotEnd: "15:00", name: "Geeta Devi", email: "geeta@example.com", phone: "+91 98765 43245", notes: null, status: "completed" as const, price: 450, rating: 5, review: null },
  { serviceId: "aromatherapy-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(2, 24), timeSlot: "11:00 - 12:00", slotStart: "11:00", slotEnd: "12:00", name: "Pooja Agarwal", email: "pooja@example.com", phone: "+91 98765 43246", notes: null, status: "completed" as const, price: 700, rating: 5, review: null },
  { serviceId: "full-body-scrubbing-60", employeeId: "rahul-verma", userId: null, date: bookingDate(2, 30), timeSlot: "15:00 - 16:00", slotStart: "15:00", slotEnd: "16:00", name: "Sana Mirza", email: "sana@example.com", phone: "+91 98765 43247", notes: null, status: "completed" as const, price: 1500, rating: 4, review: null },
  // 1 month ago (May 2026)
  { serviceId: "swedish-massage-60", employeeId: "rahul-verma", userId: null, date: bookingDate(1, 2), timeSlot: "14:00 - 15:00", slotStart: "14:00", slotEnd: "15:00", name: "Akash Bose", email: "akash@example.com", phone: "+91 98765 43248", notes: null, status: "completed" as const, price: 900, rating: 5, review: null },
  { serviceId: "head-massage", employeeId: "arjun-mehta", userId: null, date: bookingDate(1, 9), timeSlot: "10:00 - 10:30", slotStart: "10:00", slotEnd: "10:30", name: "Girish Kumar", email: "girish@example.com", phone: "+91 98765 43249", notes: null, status: "completed" as const, price: 200, rating: 5, review: null },
  { serviceId: "deep-tissue-massage-60", employeeId: "priya-sharma", userId: null, date: bookingDate(1, 16), timeSlot: "11:00 - 12:00", slotStart: "11:00", slotEnd: "12:00", name: "Ramesh Patel", email: "ramesh@example.com", phone: "+91 98765 43250", notes: null, status: "completed" as const, price: 1000, rating: 4, review: null },
  { serviceId: "foot-reflexology-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(1, 23), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Aarti Bhatt", email: "aarti.b@example.com", phone: "+91 98765 43251", notes: null, status: "completed" as const, price: 700, rating: 5, review: null },
  { serviceId: "thai-massage-60", employeeId: "priya-sharma", userId: null, date: bookingDate(1, 28), timeSlot: "13:00 - 14:00", slotStart: "13:00", slotEnd: "14:00", name: "Nandini Singh", email: "nandini@example.com", phone: "+91 98765 43252", notes: null, status: "completed" as const, price: 700, rating: 5, review: null },
  // Current month (Jun 2026)
  { serviceId: "foot-massage-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(0, 2), timeSlot: "09:00 - 10:00", slotStart: "09:00", slotEnd: "10:00", name: "Swati Reddy", email: "swati@example.com", phone: "+91 98765 43253", notes: null, status: "completed" as const, price: 400, rating: 5, review: null },
  { serviceId: "swedish-massage-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(0, 5), timeSlot: "13:00 - 14:00", slotStart: "13:00", slotEnd: "14:00", name: "Kamal Nath", email: "kamal@example.com", phone: "+91 98765 43254", notes: null, status: "completed" as const, price: 900, rating: 5, review: null },
  { serviceId: "aromatherapy-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(0, 8), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Suman Jha", email: "suman@example.com", phone: "+91 98765 43255", notes: null, status: "completed" as const, price: 700, rating: 4, review: null },
  { serviceId: "head-massage", employeeId: "arjun-mehta", userId: null, date: bookingDate(0, 10), timeSlot: "11:00 - 11:30", slotStart: "11:00", slotEnd: "11:30", name: "Hari Prasad", email: "hari@example.com", phone: "+91 98765 43256", notes: null, status: "confirmed" as const, price: 200, rating: null, review: null },
  { serviceId: "full-body-scrubbing-60", employeeId: "priya-sharma", userId: null, date: bookingDate(0, 12), timeSlot: "15:00 - 16:00", slotStart: "15:00", slotEnd: "16:00", name: "Ritu Goel", email: "ritu@example.com", phone: "+91 98765 43257", notes: null, status: "confirmed" as const, price: 1500, rating: null, review: null },
  { serviceId: "deep-tissue-massage-60", employeeId: "rahul-verma", userId: null, date: bookingDate(0, 14), timeSlot: "14:00 - 15:00", slotStart: "14:00", slotEnd: "15:00", name: "Tarun Das", email: "tarun@example.com", phone: "+91 98765 43258", notes: null, status: "pending" as const, price: 1000, rating: null, review: null },
  { serviceId: "body-polishing-60", employeeId: "kavya-iyer", userId: null, date: bookingDate(0, 15), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Lata Mangeshkar", email: "lata@example.com", phone: "+91 98765 43259", notes: null, status: "pending" as const, price: 2000, rating: null, review: null },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data (Order matters here for foreign keys)
  await prisma.bookingService.deleteMany();
  await prisma.waitlist.deleteMany();
  await prisma.userReliability.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.rewardRedemption.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.employeeService.deleteMany();
  await prisma.employeeAvailability.deleteMany();
  await prisma.availabilityOverride.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.user.deleteMany();
  await prisma.service.deleteMany();
  await prisma.employee.deleteMany();

  // 1. Seed Employees FIRST (Without trying to link to services yet)
  for (const employee of employeesData) {
    const { serviceIds, ...employeeFields } = employee;
    await prisma.employee.create({
      data: {
        ...employeeFields,
        email: employeeFields.email || "",
      },
    });
  }
  console.log(`✅ Seeded ${employeesData.length} employees`);

  // 2. Seed Services SECOND (And create the join table links)
  for (const service of servicesData) {
    const { employeeIds, ...serviceFields } = service;
    await prisma.service.create({
      data: {
        ...serviceFields,
        employeeServices: {
          create: employeeIds.map((employeeId) => ({ employeeId })),
        },
      },
    });
  }
  console.log(`✅ Seeded ${servicesData.length} services`);

  // Seed testimonials
  await prisma.testimonial.createMany({ data: testimonialsData });
  console.log(`✅ Seeded ${testimonialsData.length} testimonials`);

  // Seed users (hash passwords with bcrypt)
  for (const user of usersData) {
    const hashedPassword = await hashPassword(user.password);
    await prisma.user.create({
      data: { ...user, password: hashedPassword },
    });
  }
  console.log(`✅ Seeded ${usersData.length} users (passwords bcrypt-hashed)`);

  // Seed employee availability (recurring weekly windows)
  // All 4 specialists are all-rounders — they work Mon-Sat, 10:00-19:00
  // with a 1-hour lunch break (13:00-14:00) on some days for realism.
  const availabilityData = [
    // Priya Sharma — Mon-Sat
    { employeeId: "priya-sharma", dayOfWeek: 0, startTime: "10:00", endTime: "13:00" },
    { employeeId: "priya-sharma", dayOfWeek: 0, startTime: "14:00", endTime: "19:00" },
    { employeeId: "priya-sharma", dayOfWeek: 1, startTime: "10:00", endTime: "19:00" },
    { employeeId: "priya-sharma", dayOfWeek: 2, startTime: "10:00", endTime: "13:00" },
    { employeeId: "priya-sharma", dayOfWeek: 2, startTime: "14:00", endTime: "19:00" },
    { employeeId: "priya-sharma", dayOfWeek: 3, startTime: "10:00", endTime: "19:00" },
    { employeeId: "priya-sharma", dayOfWeek: 4, startTime: "10:00", endTime: "19:00" },
    { employeeId: "priya-sharma", dayOfWeek: 5, startTime: "10:00", endTime: "17:00" },
    // Kavya Iyer — Mon-Sat
    { employeeId: "kavya-iyer", dayOfWeek: 0, startTime: "10:00", endTime: "19:00" },
    { employeeId: "kavya-iyer", dayOfWeek: 1, startTime: "10:00", endTime: "13:00" },
    { employeeId: "kavya-iyer", dayOfWeek: 1, startTime: "14:00", endTime: "19:00" },
    { employeeId: "kavya-iyer", dayOfWeek: 2, startTime: "10:00", endTime: "19:00" },
    { employeeId: "kavya-iyer", dayOfWeek: 3, startTime: "10:00", endTime: "19:00" },
    { employeeId: "kavya-iyer", dayOfWeek: 4, startTime: "10:00", endTime: "13:00" },
    { employeeId: "kavya-iyer", dayOfWeek: 4, startTime: "14:00", endTime: "19:00" },
    { employeeId: "kavya-iyer", dayOfWeek: 5, startTime: "10:00", endTime: "19:00" },
    // Rahul Verma — Mon-Sat
    { employeeId: "rahul-verma", dayOfWeek: 0, startTime: "10:00", endTime: "19:00" },
    { employeeId: "rahul-verma", dayOfWeek: 1, startTime: "10:00", endTime: "19:00" },
    { employeeId: "rahul-verma", dayOfWeek: 2, startTime: "10:00", endTime: "13:00" },
    { employeeId: "rahul-verma", dayOfWeek: 2, startTime: "14:00", endTime: "19:00" },
    { employeeId: "rahul-verma", dayOfWeek: 3, startTime: "10:00", endTime: "19:00" },
    { employeeId: "rahul-verma", dayOfWeek: 4, startTime: "10:00", endTime: "19:00" },
    { employeeId: "rahul-verma", dayOfWeek: 5, startTime: "10:00", endTime: "17:00" },
    // Arjun Mehta — Mon-Sat
    { employeeId: "arjun-mehta", dayOfWeek: 0, startTime: "10:00", endTime: "19:00" },
    { employeeId: "arjun-mehta", dayOfWeek: 1, startTime: "10:00", endTime: "13:00" },
    { employeeId: "arjun-mehta", dayOfWeek: 1, startTime: "14:00", endTime: "19:00" },
    { employeeId: "arjun-mehta", dayOfWeek: 2, startTime: "10:00", endTime: "19:00" },
    { employeeId: "arjun-mehta", dayOfWeek: 3, startTime: "10:00", endTime: "13:00" },
    { employeeId: "arjun-mehta", dayOfWeek: 3, startTime: "14:00", endTime: "19:00" },
    { employeeId: "arjun-mehta", dayOfWeek: 4, startTime: "10:00", endTime: "19:00" },
    { employeeId: "arjun-mehta", dayOfWeek: 5, startTime: "10:00", endTime: "19:00" },
  ];

  await prisma.employeeAvailability.createMany({ data: availabilityData });
  console.log(`✅ Seeded ${availabilityData.length} employee availability entries`);

  // Seed bookings
  await prisma.booking.createMany({ data: bookingsData });
  console.log(`✅ Seeded ${bookingsData.length} bookings`);

  console.log("🎉 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
