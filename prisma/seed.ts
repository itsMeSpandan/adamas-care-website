import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const servicesData = [
  {
    id: "precision-haircut",
    name: "Precision Haircut",
    category: "Hair",
    description: "Expert haircut tailored to your face shape and personal style.",
    longDescription: "Our precision haircut service begins with a thorough consultation to understand your lifestyle, hair type, and desired look. Our stylists use advanced cutting techniques including point cutting, slide cutting, and razor texturing to create a shape that moves beautifully and grows out gracefully. Each cut is finished with a blow-dry and styling to showcase the result.",
    durationMinutes: 60,
    price: 85,
    imageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
    featured: true,
    employeeIds: ["elena-vasquez", "sophia-chen"],
  },
  {
    id: "color-gloss-treatment",
    name: "Color & Gloss Treatment",
    category: "Hair",
    description: "Vibrant, dimensional color with a luminous glossy finish.",
    longDescription: "Transform your look with our professional color services. From subtle highlights to full creative color, our colorists use premium ammonia-free formulas enriched with keratin and argan oil. The service includes a gloss treatment that seals the cuticle for mirror-like shine and long-lasting vibrancy.",
    durationMinutes: 120,
    price: 180,
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
    featured: true,
    employeeIds: ["sophia-chen", "james-oconnor"],
  },
  {
    id: "hydra-facial",
    name: "Hydra Facial",
    category: "Skin",
    description: "Deep cleansing, exfoliating, and hydrating facial treatment.",
    longDescription: "The Hydra Facial is a multi-step treatment that cleanses, exfoliates, extracts, and hydrates the skin simultaneously. Using patented vortex-fusion technology, this treatment infuses antioxidants, peptides, and hyaluronic acid deep into the skin.",
    durationMinutes: 75,
    price: 150,
    imageUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80",
    featured: true,
    employeeIds: ["amara-okafor"],
  },
  {
    id: "anti-aging-facial",
    name: "Anti-Aging Facial",
    category: "Skin",
    description: "Rejuvenating facial targeting fine lines and loss of elasticity.",
    longDescription: "Our signature anti-aging facial combines microcurrent technology with LED light therapy and a custom enzyme peel. This powerful trio stimulates collagen production, firms the skin, and reduces the appearance of fine lines.",
    durationMinutes: 90,
    price: 195,
    imageUrl: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&q=80",
    featured: false,
    employeeIds: ["amara-okafor", "elena-vasquez"],
  },
  {
    id: "gel-manicure",
    name: "Gel Manicure",
    category: "Nails",
    description: "Long-lasting gel polish with nail strengthening treatment.",
    longDescription: "Our gel manicure uses LED-cured gel polish that stays chip-free for up to three weeks. The service includes cuticle care, nail shaping, hand massage with organic shea butter, and your choice from our curated seasonal color collection.",
    durationMinutes: 45,
    price: 55,
    imageUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
    featured: true,
    employeeIds: ["lina-park"],
  },
  {
    id: "nail-art-design",
    name: "Nail Art Design",
    category: "Nails",
    description: "Creative custom nail art with hand-painted details.",
    longDescription: "Express your personality with our custom nail art service. Our nail artists specialize in intricate hand-painted designs, chrome effects, 3D embellishments, and minimalist line art.",
    durationMinutes: 60,
    price: 75,
    imageUrl: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80",
    featured: false,
    employeeIds: ["lina-park", "sofia-romano"],
  },
  {
    id: "deep-tissue-massage",
    name: "Deep Tissue Massage",
    category: "Body",
    description: "Therapeutic massage targeting chronic tension and muscle knots.",
    longDescription: "Our deep tissue massage uses firm, sustained pressure and slow strokes to reach the deepest layers of muscle and connective tissue. Ideal for chronic aches and pain.",
    durationMinutes: 90,
    price: 130,
    imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
    featured: true,
    employeeIds: ["maya-thompson"],
  },
  {
    id: "aromatherapy-body-wrap",
    name: "Aromatherapy Body Wrap",
    category: "Body",
    description: "Full-body detoxifying wrap with essential oil blends.",
    longDescription: "Indulge in our luxurious aromatherapy body wrap that detoxifies, hydrates, and firms the skin. Your body is wrapped in warm blankets infused with your choice of essential oil blends.",
    durationMinutes: 75,
    price: 145,
    imageUrl: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80",
    featured: false,
    employeeIds: ["maya-thompson", "sofia-romano"],
  },
  {
    id: "bridal-glam-package",
    name: "Bridal Glam Package",
    category: "Bridal",
    description: "Complete hair and makeup package for your special day.",
    longDescription: "Our Bridal Glam Package is designed to make you feel radiant on your wedding day. The package includes a pre-wedding consultation, hair styling, professional makeup application, false lash application, and a touch-up kit.",
    durationMinutes: 180,
    price: 450,
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
    featured: true,
    employeeIds: ["elena-vasquez", "sophia-chen", "amara-okafor"],
  },
  {
    id: "pre-wedding-skincare",
    name: "Pre-Wedding Skincare",
    category: "Bridal",
    description: "Customized skincare regimen leading up to your wedding.",
    longDescription: "Start your bridal beauty journey with our comprehensive pre-wedding skincare program. This package includes three customized facial treatments spaced over the weeks before your wedding.",
    durationMinutes: 60,
    price: 250,
    imageUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80",
    featured: false,
    employeeIds: ["amara-okafor"],
  },
];

const employeesData = [
  {
    id: "elena-vasquez",
    name: "Elena Vasquez",
    email: "elena@adamascare.com",
    role: "Lead Stylist & Creative Director",
    bio: "With over 15 years of experience in high-fashion editorial and salon work, Elena brings an artist's eye to every cut and style. Trained at the Vidal Sassoon Academy in London, she specializes in precision cutting and transformative color.",
    imageUrl: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600&q=80",
    rating: 4.9,
    reviewCount: 247,
    instagramHandle: "@elena.creates",
    yearsExperience: 15,
    serviceIds: ["precision-haircut", "color-gloss-treatment", "anti-aging-facial", "bridal-glam-package"],
  },
  {
    id: "sophia-chen",
    name: "Sophia Chen",
    email: "sophia@adamascare.com",
    role: "Senior Colorist",
    bio: "Sophia is a color virtuoso known for creating natural-looking dimension and bespoke shades. Her techniques blend balayage, foiling, and color melting for results that catch light beautifully.",
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80",
    rating: 4.8,
    reviewCount: 189,
    instagramHandle: "@sophiacolors",
    yearsExperience: 10,
    serviceIds: ["precision-haircut", "color-gloss-treatment", "bridal-glam-package"],
  },
  {
    id: "amara-okafor",
    name: "Amara Okafor",
    email: "amara@adamascare.com",
    role: "Master Aesthetician",
    bio: "Amara's holistic approach to skincare combines advanced clinical treatments with mindful wellness practices. Certified in chemical peels, microcurrent therapy, and LED treatments.",
    imageUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80",
    rating: 4.9,
    reviewCount: 212,
    instagramHandle: "@amaraglows",
    yearsExperience: 8,
    serviceIds: ["hydra-facial", "anti-aging-facial", "bridal-glam-package", "pre-wedding-skincare"],
  },
  {
    id: "james-oconnor",
    name: "James O'Connor",
    email: "james@adamascare.com",
    role: "Hair Stylist",
    bio: "James brings a fresh, modern perspective to hairstyling with a focus on textured cuts and lived-in color. His background in fashion week styling gives him versatility.",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
    rating: 4.7,
    reviewCount: 134,
    yearsExperience: 6,
    serviceIds: ["color-gloss-treatment", "precision-haircut"],
  },
  {
    id: "lina-park",
    name: "Lina Park",
    email: "lina@adamascare.com",
    role: "Nail Artist",
    bio: "Lina is a creative nail artist whose work ranges from minimalist elegance to bold artistic expression. Trained in Tokyo and Seoul, she brings Japanese precision and Korean innovation.",
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80",
    rating: 4.8,
    reviewCount: 156,
    instagramHandle: "@linanails",
    yearsExperience: 7,
    serviceIds: ["gel-manicure", "nail-art-design"],
  },
  {
    id: "sofia-romano",
    name: "Sofia Romano",
    email: "sofia@adamascare.com",
    role: "Nail Artist & Body Therapist",
    bio: "Sofia brings a unique blend of nail artistry and body therapy to her work. Trained in both Italian and Korean beauty traditions, she creates stunning nail designs while also specializing in relaxing body treatments.",
    imageUrl: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80",
    rating: 4.8,
    reviewCount: 142,
    yearsExperience: 9,
    serviceIds: ["nail-art-design", "aromatherapy-body-wrap"],
  },
  {
    id: "maya-thompson",
    name: "Maya Thompson",
    email: "maya@adamascare.com",
    role: "Massage Therapist",
    bio: "Maya combines her deep knowledge of anatomy with intuitive touch to deliver deeply therapeutic massage experiences. Certified in Swedish, deep tissue, and Thai massage techniques.",
    imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&q=80",
    rating: 4.9,
    reviewCount: 198,
    yearsExperience: 12,
    serviceIds: ["deep-tissue-massage", "aromatherapy-body-wrap"],
  },
];

const testimonialsData = [
  {
    id: "t1",
    authorName: "Sarah Mitchell",
    avatarUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&q=80",
    rating: 5,
    text: "Elena completely transformed my hair. I came in with a bad box-dye situation and left feeling like a new person. The color correction was seamless and the styling was absolutely perfect.",
    service: "Color & Gloss Treatment",
    date: "2024-11-15",
  },
  {
    id: "t2",
    authorName: "Jessica Park",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80",
    rating: 5,
    text: "The Hydra Facial was incredible — my skin was glowing for weeks after. Amara really knows her craft and made me feel so comfortable. The whole experience felt luxurious from start to finish.",
    service: "Hydra Facial",
    date: "2024-12-02",
  },
  {
    id: "t3",
    authorName: "Amanda Torres",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80",
    rating: 5,
    text: "My bridal glam package exceeded every expectation. Elena and her team made my wedding morning so relaxing and fun. The hair and makeup stayed flawless through 12 hours of dancing.",
    service: "Bridal Glam Package",
    date: "2024-10-20",
  },
  {
    id: "t4",
    authorName: "Rebecca Lin",
    avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&q=80",
    rating: 5,
    text: "I've been to many nail salons but Lina's work is on another level. The attention to detail in her nail art is extraordinary. Every time I get compliments on my nails, I proudly tell them about Adamas Care.",
    service: "Nail Art Design",
    date: "2024-12-10",
  },
  {
    id: "t5",
    authorName: "Diana Foster",
    avatarUrl: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&q=80",
    rating: 4,
    text: "Maya's deep tissue massage is genuinely therapeutic. I have chronic shoulder tension and she always knows exactly where to focus. The aromatherapy oils they use are heavenly.",
    service: "Deep Tissue Massage",
    date: "2024-11-28",
  },
  {
    id: "t6",
    authorName: "Claire Dubois",
    avatarUrl: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=100&q=80",
    rating: 5,
    text: "The pre-wedding skincare program was the best investment for my wedding. Amara customized everything for my skin type and by the big day, my complexion was absolutely radiant.",
    service: "Pre-Wedding Skincare",
    date: "2024-09-05",
  },
];

const usersData = [
  {
    name: "Sarah Mitchell",
    email: "demo@adamascare.com",
    password: "demo123",
    role: "user" as const,
    avatarUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&q=80",
    employeeId: null as string | null,
  },
  {
    name: "Isabelle Laurent",
    email: "admin@adamascare.com",
    password: "admin123",
    role: "admin" as const,
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
    employeeId: null as string | null,
  },
  {
    name: "Elena Vasquez",
    email: "elena@adamascare.com",
    password: "elena123",
    role: "employee" as const,
    avatarUrl: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80",
    employeeId: "elena-vasquez",
  },
  {
    name: "Sophia Chen",
    email: "sophia@adamascare.com",
    password: "sophia123",
    role: "employee" as const,
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
    employeeId: "sophia-chen",
  },
  {
    name: "Amara Okafor",
    email: "amara@adamascare.com",
    password: "amara123",
    role: "employee" as const,
    avatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80",
    employeeId: "amara-okafor",
  },
  {
    name: "James O'Connor",
    email: "james@adamascare.com",
    password: "james123",
    role: "employee" as const,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
    employeeId: "james-oconnor",
  },
  {
    name: "Lina Park",
    email: "lina@adamascare.com",
    password: "lina123",
    role: "employee" as const,
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80",
    employeeId: "lina-park",
  },
  {
    name: "Maya Thompson",
    email: "maya@adamascare.com",
    password: "maya123",
    role: "employee" as const,
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
    employeeId: "maya-thompson",
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data (Order matters here for foreign keys)
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

  // Seed users
  await prisma.user.createMany({ data: usersData });
  console.log(`✅ Seeded ${usersData.length} users`);

  // Seed employee availability (recurring weekly windows)
  // Mirrors the existing weeklySchedule entries as EmployeeAvailability
  const availabilityData = [
    // Elena Vasquez — Mon, Wed, Fri (Hair)
    { employeeId: "elena-vasquez", dayOfWeek: 0, startTime: "09:00", endTime: "12:00" },
    { employeeId: "elena-vasquez", dayOfWeek: 0, startTime: "13:00", endTime: "17:00" },
    { employeeId: "elena-vasquez", dayOfWeek: 2, startTime: "09:00", endTime: "12:00" },
    { employeeId: "elena-vasquez", dayOfWeek: 2, startTime: "13:00", endTime: "17:00" },
    { employeeId: "elena-vasquez", dayOfWeek: 4, startTime: "09:00", endTime: "15:00" },
    // Sophia Chen — Mon, Tue, Thu (Hair)
    { employeeId: "sophia-chen", dayOfWeek: 0, startTime: "10:00", endTime: "14:00" },
    { employeeId: "sophia-chen", dayOfWeek: 1, startTime: "09:00", endTime: "13:00" },
    { employeeId: "sophia-chen", dayOfWeek: 3, startTime: "10:00", endTime: "16:00" },
    // Amara Okafor — Tue, Wed, Fri (Skin)
    { employeeId: "amara-okafor", dayOfWeek: 1, startTime: "09:00", endTime: "13:00" },
    { employeeId: "amara-okafor", dayOfWeek: 2, startTime: "10:00", endTime: "15:00" },
    { employeeId: "amara-okafor", dayOfWeek: 4, startTime: "09:00", endTime: "12:00" },
    // Lina Park — Mon, Wed, Thu (Nails)
    { employeeId: "lina-park", dayOfWeek: 0, startTime: "09:00", endTime: "13:00" },
    { employeeId: "lina-park", dayOfWeek: 2, startTime: "10:00", endTime: "16:00" },
    { employeeId: "lina-park", dayOfWeek: 3, startTime: "09:00", endTime: "14:00" },
    // Maya Thompson — Tue, Thu, Sat (Body)
    { employeeId: "maya-thompson", dayOfWeek: 1, startTime: "10:00", endTime: "16:00" },
    { employeeId: "maya-thompson", dayOfWeek: 3, startTime: "09:00", endTime: "14:00" },
    { employeeId: "maya-thompson", dayOfWeek: 5, startTime: "09:00", endTime: "15:00" },
    // James O'Connor — Wed, Thu, Sat (Hair)
    { employeeId: "james-oconnor", dayOfWeek: 2, startTime: "09:00", endTime: "14:00" },
    { employeeId: "james-oconnor", dayOfWeek: 3, startTime: "10:00", endTime: "16:00" },
    { employeeId: "james-oconnor", dayOfWeek: 5, startTime: "09:00", endTime: "13:00" },
    // Sofia Romano — Tue, Fri, Sat (Nails/Body)
    { employeeId: "sofia-romano", dayOfWeek: 1, startTime: "09:00", endTime: "13:00" },
    { employeeId: "sofia-romano", dayOfWeek: 4, startTime: "10:00", endTime: "15:00" },
    { employeeId: "sofia-romano", dayOfWeek: 5, startTime: "10:00", endTime: "16:00" },
  ];

  await prisma.employeeAvailability.createMany({ data: availabilityData });
  console.log(`✅ Seeded ${availabilityData.length} employee availability entries`);

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
