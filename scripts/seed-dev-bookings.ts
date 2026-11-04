import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding realistic development bookings and 3-level feedbacks...");

  // Fetch employees
  const employees = await prisma.employee.findMany();
  if (employees.length === 0) {
    throw new Error("No employees found in database. Please ensure employees exist.");
  }
  const empMap = new Map(employees.map((e) => [e.name, e.id]));
  const defaultEmpId = employees[0].id;

  // Fetch users
  const users = await prisma.user.findMany();
  const userByEmail = new Map(users.map((u) => [u.email, u]));

  const spandanUser = userByEmail.get("dharspandan1@gmail.com");
  const shramanUser = userByEmail.get("shramanchaudhuri098@gmail.com");
  const saikatUser = userByEmail.get("saikatdas4101@gmail.com");
  const devAdminUser = userByEmail.get("dev.admin@gracesalon.test") || userByEmail.get("admin@gracesalon.com");

  // Fetch services
  const allServices = await prisma.service.findMany();
  if (allServices.length === 0) {
    throw new Error("No services found in database.");
  }
  const svcMap = new Map(allServices.map((s) => [s.id, s]));

  // Pick common services
  const massageSvc = svcMap.get("deep-tissue-massage-60") || svcMap.get("aromatherapy-60") || allServices[0];
  const facialSvc = svcMap.get("clean-up") || svcMap.get("de-tan") || allServices[1];
  const bodySvc = svcMap.get("body-polishing-60") || allServices[2];
  const aromatherapySvc = svcMap.get("aromatherapy") || allServices[3];

  const now = new Date();

  // Helper to construct a date relative to now
  function relativeDate(daysAgo: number, hour: number = 11, minute: number = 0): Date {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  // 1. Bookings to insert
  interface BookingSeedItem {
    serviceId: string;
    employeeName: string;
    user?: { id: string; name: string; email: string };
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    daysAgo: number;
    startHour: number;
    durationMins: number;
    status: "completed" | "confirmed" | "pending";
    feedback?: {
      overallRating: number;
      npsScore: number;
      overallTags: string[];
      overallComment: string;
      empRating: number;
      empTags: string[];
      empComment?: string;
      svcRating: number;
      svcTags: string[];
      svcComment?: string;
      isFlagged?: boolean;
    };
  }

  const rawSeedList: BookingSeedItem[] = [
    // --- Past Bookings with 3-Level Feedback (over past 45 days) ---
    {
      serviceId: massageSvc.id,
      employeeName: "Swati Halder",
      user: shramanUser ? { id: shramanUser.id, name: shramanUser.name, email: shramanUser.email } : undefined,
      guestName: "Shraman Chaudhuri",
      guestEmail: "shramanchaudhuri098@gmail.com",
      guestPhone: "+91 98301 11223",
      daysAgo: 35,
      startHour: 10,
      durationMins: 60,
      status: "completed",
      feedback: {
        overallRating: 5,
        npsScore: 10,
        overallTags: ["Ambience", "Cleanliness", "Staff"],
        overallComment: "Truly exceptional experience. The ambience was peaceful and calming.",
        empRating: 5,
        empTags: ["Skilled", "Attentive", "Friendly"],
        empComment: "Swati was incredibly gentle and skilled.",
        svcRating: 5,
        svcTags: ["Relaxing", "Great Value"],
        svcComment: "Relieved all tension in my back.",
      },
    },
    {
      serviceId: facialSvc.id,
      employeeName: "Soma Kundu",
      user: saikatUser ? { id: saikatUser.id, name: saikatUser.name, email: saikatUser.email } : undefined,
      guestName: "Saikat Das",
      guestEmail: "saikatdas4101@gmail.com",
      guestPhone: "+91 98312 22334",
      daysAgo: 28,
      startHour: 14,
      durationMins: 60,
      status: "completed",
      feedback: {
        overallRating: 5,
        npsScore: 9,
        overallTags: ["Booking Experience", "Cleanliness"],
        overallComment: "Spotless salon, smooth check-in.",
        empRating: 5,
        empTags: ["Professional", "Punctual"],
        empComment: "Soma explained each skincare step clearly.",
        svcRating: 5,
        svcTags: ["Visible Results", "Comfort"],
      },
    },
    {
      serviceId: bodySvc.id,
      employeeName: "Kartik Biswas",
      guestName: "Aarav Roy",
      guestEmail: "aarav.roy@example.com",
      guestPhone: "+91 98322 33445",
      daysAgo: 25,
      startHour: 12,
      durationMins: 90,
      status: "completed",
      feedback: {
        overallRating: 4,
        npsScore: 8,
        overallTags: ["Ambience", "Staff"],
        overallComment: "Very refreshing session.",
        empRating: 5,
        empTags: ["Skilled", "Polite"],
        svcRating: 4,
        svcTags: ["Comfort"],
      },
    },
    {
      serviceId: massageSvc.id,
      employeeName: "Jhunu Biswas",
      guestName: "Priyanka Sen",
      guestEmail: "priyanka.sen@example.com",
      guestPhone: "+91 98333 44556",
      daysAgo: 22,
      startHour: 15,
      durationMins: 60,
      status: "completed",
      feedback: {
        overallRating: 5,
        npsScore: 10,
        overallTags: ["Cleanliness", "Pricing"],
        overallComment: "Great value for money.",
        empRating: 5,
        empTags: ["Professional", "Skilled"],
        svcRating: 5,
        svcTags: ["Great Pressure", "Relaxing"],
      },
    },
    {
      serviceId: aromatherapySvc.id,
      employeeName: "Swati Halder",
      user: devAdminUser ? { id: devAdminUser.id, name: devAdminUser.name, email: devAdminUser.email } : undefined,
      guestName: "Dev Admin",
      guestEmail: "dev.admin@gracesalon.test",
      guestPhone: "+91 98344 55667",
      daysAgo: 18,
      startHour: 11,
      durationMins: 90,
      status: "completed",
      feedback: {
        overallRating: 5,
        npsScore: 10,
        overallTags: ["Ambience", "Staff", "Cleanliness"],
        overallComment: "Wonderful aromatic oils, soft lighting, and supreme comfort.",
        empRating: 5,
        empTags: ["Attentive", "Friendly", "Skilled"],
        svcRating: 5,
        svcTags: ["Relaxing", "Luxury"],
      },
    },
    {
      serviceId: facialSvc.id,
      employeeName: "Jhunu Biswas",
      guestName: "Rohan Mukherjee",
      guestEmail: "rohan.m@example.com",
      guestPhone: "+91 98355 66778",
      daysAgo: 16,
      startHour: 16,
      durationMins: 60,
      status: "completed",
      feedback: {
        overallRating: 4,
        npsScore: 8,
        overallTags: ["Booking Experience", "Cleanliness"],
        overallComment: "Quick and easy booking online.",
        empRating: 4,
        empTags: ["Punctual"],
        svcRating: 4,
        svcTags: ["Fresh Glow"],
      },
    },
    {
      serviceId: massageSvc.id,
      employeeName: "Kartik Biswas",
      guestName: "Debolina Bose",
      guestEmail: "debolina.b@example.com",
      guestPhone: "+91 98366 77889",
      daysAgo: 14,
      startHour: 14,
      durationMins: 60,
      status: "completed",
      feedback: {
        overallRating: 5,
        npsScore: 9,
        overallTags: ["Ambience", "Staff"],
        overallComment: "Very soothing experience.",
        empRating: 5,
        empTags: ["Skilled", "Courteous"],
        svcRating: 5,
        svcTags: ["Comfort"],
      },
    },
    {
      serviceId: bodySvc.id,
      employeeName: "Soma Kundu",
      guestName: "Megha Chatterjee",
      guestEmail: "megha.c@example.com",
      guestPhone: "+91 98377 88990",
      daysAgo: 12,
      startHour: 13,
      durationMins: 90,
      status: "completed",
      feedback: {
        overallRating: 5,
        npsScore: 10,
        overallTags: ["Cleanliness", "Ambience"],
        overallComment: "Loved every minute of it.",
        empRating: 5,
        empTags: ["Skilled", "Attentive"],
        svcRating: 5,
        svcTags: ["Luxury", "Results"],
      },
    },
    {
      serviceId: facialSvc.id,
      employeeName: "Swati Halder",
      guestName: "Vikram Singhania",
      guestEmail: "vikram.s@example.com",
      guestPhone: "+91 98388 99001",
      daysAgo: 10,
      startHour: 15,
      durationMins: 60,
      status: "completed",
      feedback: {
        overallRating: 4,
        npsScore: 8,
        overallTags: ["Staff"],
        overallComment: "Good service and courteous personnel.",
        empRating: 4,
        empTags: ["Polite"],
        svcRating: 4,
        svcTags: ["Fresh Feeling"],
      },
    },
    {
      serviceId: massageSvc.id,
      employeeName: "Soma Kundu",
      guestName: "Ananya Ghosh",
      guestEmail: "ananya.g@example.com",
      guestPhone: "+91 98399 00112",
      daysAgo: 8,
      startHour: 11,
      durationMins: 60,
      status: "completed",
      feedback: {
        overallRating: 5,
        npsScore: 10,
        overallTags: ["Ambience", "Staff", "Cleanliness"],
        overallComment: "Highest recommendation. Felt like a luxury retreat.",
        empRating: 5,
        empTags: ["Skilled", "Professional"],
        svcRating: 5,
        svcTags: ["Pain Relief", "Relaxing"],
      },
    },
    // One flagged low-rating (2 stars) to verify Admin low-rating flag & notification
    {
      serviceId: facialSvc.id,
      employeeName: "Kartik Biswas",
      guestName: "Rajeev Kapoor",
      guestEmail: "rajeev.k@example.com",
      guestPhone: "+91 98310 11224",
      daysAgo: 7,
      startHour: 17,
      durationMins: 60,
      status: "completed",
      feedback: {
        overallRating: 2,
        npsScore: 3,
        overallTags: ["Ambience"],
        overallComment: "Waiting area was a bit noisy and music was too loud during the treatment.",
        empRating: 3,
        empTags: ["Polite"],
        svcRating: 2,
        svcTags: ["Room Too Bright"],
        isFlagged: true,
      },
    },
    {
      serviceId: aromatherapySvc.id,
      employeeName: "Jhunu Biswas",
      guestName: "Pooja Trivedi",
      guestEmail: "pooja.t@example.com",
      guestPhone: "+91 98321 22335",
      daysAgo: 5,
      startHour: 10,
      durationMins: 90,
      status: "completed",
      feedback: {
        overallRating: 5,
        npsScore: 10,
        overallTags: ["Ambience", "Cleanliness"],
        overallComment: "Fabulous aromatherapy. The lavender essence was heavenly.",
        empRating: 5,
        empTags: ["Friendly", "Skilled"],
        svcRating: 5,
        svcTags: ["Pure Bliss"],
      },
    },

    // --- RECENT COMPLETED VISITS (Unreviewed, ready for user to test 'Rate Visit →') ---
    {
      serviceId: massageSvc.id,
      employeeName: "Swati Halder",
      user: spandanUser ? { id: spandanUser.id, name: spandanUser.name, email: spandanUser.email } : undefined,
      guestName: "Spandan Dhar",
      guestEmail: "dharspandan1@gmail.com",
      guestPhone: "+91 98300 12345",
      daysAgo: 2,
      startHour: 14,
      durationMins: 60,
      status: "completed",
    },
    {
      serviceId: facialSvc.id,
      employeeName: "Soma Kundu",
      user: spandanUser ? { id: spandanUser.id, name: spandanUser.name, email: spandanUser.email } : undefined,
      guestName: "Spandan Dhar",
      guestEmail: "dharspandan1@gmail.com",
      guestPhone: "+91 98300 12345",
      daysAgo: 1,
      startHour: 16,
      durationMins: 60,
      status: "completed",
    },
    {
      serviceId: aromatherapySvc.id,
      employeeName: "Jhunu Biswas",
      user: shramanUser ? { id: shramanUser.id, name: shramanUser.name, email: shramanUser.email } : undefined,
      guestName: "Shraman Chaudhuri",
      guestEmail: "shramanchaudhuri098@gmail.com",
      guestPhone: "+91 98301 11223",
      daysAgo: 1,
      startHour: 11,
      durationMins: 90,
      status: "completed",
    },

    // --- UPCOMING CONFIRMED APPOINTMENTS (For Current Week / Schedule View) ---
    {
      serviceId: massageSvc.id,
      employeeName: "Swati Halder",
      guestName: "Nisha Agarwal",
      guestEmail: "nisha.a@example.com",
      guestPhone: "+91 98332 11223",
      daysAgo: 0, // Today
      startHour: 11,
      durationMins: 60,
      status: "confirmed",
    },
    {
      serviceId: facialSvc.id,
      employeeName: "Soma Kundu",
      guestName: "Amitabh Sen",
      guestEmail: "amitabh.s@example.com",
      guestPhone: "+91 98343 22334",
      daysAgo: 0, // Today
      startHour: 15,
      durationMins: 60,
      status: "confirmed",
    },
    {
      serviceId: bodySvc.id,
      employeeName: "Kartik Biswas",
      guestName: "Tanvi Verma",
      guestEmail: "tanvi.v@example.com",
      guestPhone: "+91 98354 33445",
      daysAgo: -1, // Tomorrow
      startHour: 12,
      durationMins: 90,
      status: "confirmed",
    },
    {
      serviceId: aromatherapySvc.id,
      employeeName: "Jhunu Biswas",
      guestName: "Siddharth Roy",
      guestEmail: "siddharth.r@example.com",
      guestPhone: "+91 98365 44556",
      daysAgo: -2, // In 2 days
      startHour: 14,
      durationMins: 90,
      status: "confirmed",
    },
    {
      serviceId: massageSvc.id,
      employeeName: "Swati Halder",
      guestName: "Kavita Nair",
      guestEmail: "kavita.n@example.com",
      guestPhone: "+91 98376 55667",
      daysAgo: -3, // In 3 days
      startHour: 16,
      durationMins: 60,
      status: "pending",
    },
  ];

  let bookingsCreated = 0;
  let feedbacksCreated = 0;

  for (const item of rawSeedList) {
    const empId = empMap.get(item.employeeName) || defaultEmpId;
    const svc = svcMap.get(item.serviceId) || allServices[0];
    const bookingDateObj = relativeDate(item.daysAgo, item.startHour, 0);

    const startH = String(item.startHour).padStart(2, "0");
    const endH = String(item.startHour + Math.floor(item.durationMins / 60)).padStart(2, "0");
    const startM = "00";
    const endM = String(item.durationMins % 60).padStart(2, "0");
    const slotStart = `${startH}:${startM}`;
    const slotEnd = `${endH}:${endM}`;
    const timeSlot = `${slotStart} - ${slotEnd}`;

    const completedAt = item.status === "completed" ? new Date(bookingDateObj.getTime() + item.durationMins * 60_000) : null;

    const createdBooking = await prisma.booking.create({
      data: {
        serviceId: svc.id,
        employeeId: empId,
        userId: item.user ? item.user.id : null,
        date: bookingDateObj,
        timeSlot,
        slotStart,
        slotEnd,
        name: item.user ? item.user.name : (item.guestName || "Guest Client"),
        email: item.user ? item.user.email : (item.guestEmail || "guest@example.com"),
        phone: item.guestPhone || "+91 98000 00000",
        price: svc.price,
        status: item.status,
        completedAt,
        totalDurationMinutes: item.durationMins,
        rating: item.feedback ? item.feedback.overallRating : null,
        review: item.feedback ? item.feedback.overallComment : null,
      },
    });
    bookingsCreated++;

    // Insert 3-level feedback if specified
    if (item.feedback && item.status === "completed") {
      const fb = item.feedback;
      await prisma.feedback.create({
        data: {
          bookingId: createdBooking.id,
          userId: item.user ? item.user.id : null,
          source: "app",
          overallRating: fb.overallRating,
          npsScore: fb.npsScore,
          overallTags: fb.overallTags,
          overallComment: fb.overallComment,
          status: fb.isFlagged ? "FOLLOW_UP" : "REVIEWED",
          isFlagged: fb.isFlagged || false,
          adminNotes: fb.isFlagged ? "Customer reported loud noise in treatment room. Follow up offered." : null,
          employeeRatings: {
            create: [
              {
                employeeId: empId,
                rating: fb.empRating,
                tags: fb.empTags,
                comment: fb.empComment || null,
              },
            ],
          },
          serviceRatings: {
            create: [
              {
                serviceId: svc.id,
                rating: fb.svcRating,
                tags: fb.svcTags,
                comment: fb.svcComment || null,
              },
            ],
          },
        },
      });
      feedbacksCreated++;
    }
  }

  console.log(`✅ Successfully seeded ${bookingsCreated} bookings!`);
  console.log(`✅ Successfully seeded ${feedbacksCreated} 3-level feedbacks with employee & service ratings!`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
