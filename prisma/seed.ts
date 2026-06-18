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
    employeeIds: ["priya-sharma", "anjali-desai"],
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
    employeeIds: ["priya-sharma", "anjali-desai", "rahul-verma"],
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
    employeeIds: ["kavya-iyer"],
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
    employeeIds: ["kavya-iyer", "priya-sharma"],
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
    employeeIds: ["neha-gupta"],
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
    employeeIds: ["neha-gupta", "sneha-reddy"],
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
    employeeIds: ["aarti-patel"],
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
    employeeIds: ["aarti-patel", "sneha-reddy"],
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
    employeeIds: ["priya-sharma", "anjali-desai", "kavya-iyer"],
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
    employeeIds: ["kavya-iyer"],
  },
];

const employeesData = [
  {
    id: "priya-sharma",
    name: "Priya Sharma",
    email: "priya@adamascare.com",
    role: "Lead Stylist & Creative Director",
    bio: "With over 15 years of experience in high-fashion editorial and salon work, Priya brings an artist's eye to every cut and style. Trained globally, she specializes in precision cutting and transformative color.",
    imageUrl: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600&q=80",
    rating: 4.9,
    reviewCount: 247,
    instagramHandle: "@priya.creates",
    yearsExperience: 15,
    serviceIds: ["precision-haircut", "color-gloss-treatment", "anti-aging-facial", "bridal-glam-package"],
  },
  {
    id: "anjali-desai",
    name: "Anjali Desai",
    email: "anjali@adamascare.com",
    role: "Senior Colorist",
    bio: "Anjali is a color virtuoso known for creating natural-looking dimension and bespoke shades. Her techniques blend balayage, foiling, and color melting for results that catch light beautifully.",
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80",
    rating: 4.8,
    reviewCount: 189,
    instagramHandle: "@anjalicolors",
    yearsExperience: 10,
    serviceIds: ["precision-haircut", "color-gloss-treatment", "bridal-glam-package"],
  },
  {
    id: "kavya-iyer",
    name: "Kavya Iyer",
    email: "kavya@adamascare.com",
    role: "Master Aesthetician",
    bio: "Kavya's holistic approach to skincare combines advanced clinical treatments with mindful wellness practices. Certified in chemical peels, microcurrent therapy, and LED treatments.",
    imageUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80",
    rating: 4.9,
    reviewCount: 212,
    instagramHandle: "@kavyaglows",
    yearsExperience: 8,
    serviceIds: ["hydra-facial", "anti-aging-facial", "bridal-glam-package", "pre-wedding-skincare"],
  },
  {
    id: "rahul-verma",
    name: "Rahul Verma",
    email: "rahul@adamascare.com",
    role: "Hair Stylist",
    bio: "Rahul brings a fresh, modern perspective to hairstyling with a focus on textured cuts and lived-in color. His background in fashion week styling gives him versatility.",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
    rating: 4.7,
    reviewCount: 134,
    yearsExperience: 6,
    serviceIds: ["color-gloss-treatment", "precision-haircut"],
  },
  {
    id: "neha-gupta",
    name: "Neha Gupta",
    email: "neha@adamascare.com",
    role: "Nail Artist",
    bio: "Neha is a creative nail artist whose work ranges from minimalist elegance to bold artistic expression. Trained internationally, she brings intricate precision and modern innovation.",
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80",
    rating: 4.8,
    reviewCount: 156,
    instagramHandle: "@nehanails",
    yearsExperience: 7,
    serviceIds: ["gel-manicure", "nail-art-design"],
  },
  {
    id: "sneha-reddy",
    name: "Sneha Reddy",
    email: "sneha@adamascare.com",
    role: "Nail Artist & Body Therapist",
    bio: "Sneha brings a unique blend of nail artistry and body therapy to her work. Trained in both Ayurvedic and modern beauty traditions, she creates stunning nail designs while also specializing in relaxing body treatments.",
    imageUrl: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80",
    rating: 4.8,
    reviewCount: 142,
    yearsExperience: 9,
    serviceIds: ["nail-art-design", "aromatherapy-body-wrap"],
  },
  {
    id: "aarti-patel",
    name: "Aarti Patel",
    email: "aarti@adamascare.com",
    role: "Massage Therapist",
    bio: "Aarti combines her deep knowledge of anatomy with intuitive touch to deliver deeply therapeutic massage experiences. Certified in Swedish, deep tissue, and classical massage techniques.",
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
    authorName: "Riya Kapoor",
    avatarUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&q=80",
    rating: 5,
    text: "Priya completely transformed my hair. I came in with a bad box-dye situation and left feeling like a new person. The color correction was seamless and the styling was absolutely perfect.",
    service: "Color & Gloss Treatment",
    date: "2024-11-15",
  },
  {
    id: "t2",
    authorName: "Pooja Singh",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80",
    rating: 5,
    text: "The Hydra Facial was incredible — my skin was glowing for weeks after. Kavya really knows her craft and made me feel so comfortable. The whole experience felt luxurious from start to finish.",
    service: "Hydra Facial",
    date: "2024-12-02",
  },
  {
    id: "t3",
    authorName: "Meera Joshi",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80",
    rating: 5,
    text: "My bridal glam package exceeded every expectation. Priya and her team made my wedding morning so relaxing and fun. The hair and makeup stayed flawless through 12 hours of dancing.",
    service: "Bridal Glam Package",
    date: "2024-10-20",
  },
  {
    id: "t4",
    authorName: "Aditi Rao",
    avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&q=80",
    rating: 5,
    text: "I've been to many nail salons but Neha's work is on another level. The attention to detail in her nail art is extraordinary. Every time I get compliments on my nails, I proudly tell them about Adamas Care.",
    service: "Nail Art Design",
    date: "2024-12-10",
  },
  {
    id: "t5",
    authorName: "Nandini Menon",
    avatarUrl: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&q=80",
    rating: 4,
    text: "Aarti's deep tissue massage is genuinely therapeutic. I have chronic shoulder tension and she always knows exactly where to focus. The aromatherapy oils they use are heavenly.",
    service: "Deep Tissue Massage",
    date: "2024-11-28",
  },
  {
    id: "t6",
    authorName: "Tara Chatterjee",
    avatarUrl: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=100&q=80",
    rating: 5,
    text: "The pre-wedding skincare program was the best investment for my wedding. Kavya customized everything for my skin type and by the big day, my complexion was absolutely radiant.",
    service: "Pre-Wedding Skincare",
    date: "2024-09-05",
  },
];

const usersData = [
  {
    name: "Riya Kapoor",
    email: "demo@adamascare.com",
    password: "demo123",
    role: "user" as const,
    avatarUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&q=80",
    employeeId: null as string | null,
  },
  {
    name: "Isha Malhotra",
    email: "admin@adamascare.com",
    password: "admin123",
    role: "admin" as const,
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
    employeeId: null as string | null,
  },
  {
    name: "Priya Sharma",
    email: "priya@adamascare.com",
    password: "priya123",
    role: "employee" as const,
    avatarUrl: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80",
    employeeId: "priya-sharma",
  },
  {
    name: "Anjali Desai",
    email: "anjali@adamascare.com",
    password: "anjali123",
    role: "employee" as const,
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
    employeeId: "anjali-desai",
  },
  {
    name: "Kavya Iyer",
    email: "kavya@adamascare.com",
    password: "kavya123",
    role: "employee" as const,
    avatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80",
    employeeId: "kavya-iyer",
  },
  {
    name: "Rahul Verma",
    email: "rahul@adamascare.com",
    password: "rahul123",
    role: "employee" as const,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
    employeeId: "rahul-verma",
  },
  {
    name: "Neha Gupta",
    email: "neha@adamascare.com",
    password: "neha123",
    role: "employee" as const,
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80",
    employeeId: "neha-gupta",
  },
  {
    name: "Sneha Reddy",
    email: "sneha@adamascare.com",
    password: "sneha123",
    role: "employee" as const,
    avatarUrl: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=100&q=80",
    employeeId: "sneha-reddy",
  },
  {
    name: "Aarti Patel",
    email: "aarti@adamascare.com",
    password: "aarti123",
    role: "employee" as const,
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
    employeeId: "aarti-patel",
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
  { serviceId: "precision-haircut", employeeId: "priya-sharma", userId: null, date: bookingDate(11, 5), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Ananya Mehta", email: "ananya@example.com", phone: "+91 98765 43210", notes: null, status: "completed" as const, price: 85, rating: 5, review: "Amazing haircut!" },
  { serviceId: "color-gloss-treatment", employeeId: "anjali-desai", userId: null, date: bookingDate(11, 12), timeSlot: "14:00 - 16:00", slotStart: "14:00", slotEnd: "16:00", name: "Farhan Sheikh", email: "farhan@example.com", phone: "+91 98765 43211", notes: null, status: "completed" as const, price: 180, rating: 5, review: null },
  { serviceId: "deep-tissue-massage", employeeId: "aarti-patel", userId: null, date: bookingDate(11, 20), timeSlot: "11:00 - 12:30", slotStart: "11:00", slotEnd: "12:30", name: "Deepak Nair", email: "deepak@example.com", phone: "+91 98765 43212", notes: "Shoulder pain", status: "completed" as const, price: 130, rating: 4, review: null },
  // 10 months ago (Aug 2025)
  { serviceId: "hydra-facial", employeeId: "kavya-iyer", userId: null, date: bookingDate(10, 3), timeSlot: "10:00 - 11:15", slotStart: "10:00", slotEnd: "11:15", name: "Rohit Banerjee", email: "rohit@example.com", phone: "+91 98765 43213", notes: null, status: "completed" as const, price: 150, rating: 5, review: null },
  { serviceId: "bridal-glam-package", employeeId: "priya-sharma", userId: null, date: bookingDate(10, 15), timeSlot: "09:00 - 12:00", slotStart: "09:00", slotEnd: "12:00", name: "Nisha Agarwal", email: "nisha@example.com", phone: "+91 98765 43214", notes: "Wedding prep", status: "completed" as const, price: 450, rating: 5, review: "Perfect bridal look!" },
  { serviceId: "gel-manicure", employeeId: "neha-gupta", userId: null, date: bookingDate(10, 22), timeSlot: "13:00 - 13:45", slotStart: "13:00", slotEnd: "13:45", name: "Simran Kaur", email: "simran@example.com", phone: "+91 98765 43215", notes: null, status: "completed" as const, price: 55, rating: 4, review: null },
  // 9 months ago (Sep 2025)
  { serviceId: "color-gloss-treatment", employeeId: "rahul-verma", userId: null, date: bookingDate(9, 7), timeSlot: "15:00 - 17:00", slotStart: "15:00", slotEnd: "17:00", name: "Arjun Reddy", email: "arjun@example.com", phone: "+91 98765 43216", notes: null, status: "completed" as const, price: 180, rating: 4, review: null },
  { serviceId: "anti-aging-facial", employeeId: "kavya-iyer", userId: null, date: bookingDate(9, 14), timeSlot: "11:00 - 12:30", slotStart: "11:00", slotEnd: "12:30", name: "Lakshmi Iyer", email: "lakshmi@example.com", phone: "+91 98765 43217", notes: null, status: "completed" as const, price: 195, rating: 5, review: null },
  { serviceId: "nail-art-design", employeeId: "sneha-reddy", userId: null, date: bookingDate(9, 25), timeSlot: "14:00 - 15:00", slotStart: "14:00", slotEnd: "15:00", name: "Tanya Ghosh", email: "tanya@example.com", phone: "+91 98765 43218", notes: null, status: "completed" as const, price: 75, rating: 5, review: null },
  // 8 months ago (Oct 2025)
  { serviceId: "precision-haircut", employeeId: "anjali-desai", userId: null, date: bookingDate(8, 2), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Karan Malhotra", email: "karan@example.com", phone: "+91 98765 43219", notes: null, status: "completed" as const, price: 85, rating: 4, review: null },
  { serviceId: "aromatherapy-body-wrap", employeeId: "aarti-patel", userId: null, date: bookingDate(8, 10), timeSlot: "15:00 - 16:15", slotStart: "15:00", slotEnd: "16:15", name: "Divya Chopra", email: "divya@example.com", phone: "+91 98765 43220", notes: null, status: "completed" as const, price: 145, rating: 5, review: null },
  { serviceId: "bridal-glam-package", employeeId: "anjali-desai", userId: null, date: bookingDate(8, 18), timeSlot: "08:00 - 11:00", slotStart: "08:00", slotEnd: "11:00", name: "Pallavi Das", email: "pallavi@example.com", phone: "+91 98765 43221", notes: "Wedding day", status: "completed" as const, price: 450, rating: 5, review: "Flawless!" },
  { serviceId: "hydra-facial", employeeId: "kavya-iyer", userId: null, date: bookingDate(8, 28), timeSlot: "10:00 - 11:15", slotStart: "10:00", slotEnd: "11:15", name: "Meghna Roy", email: "meghna@example.com", phone: "+91 98765 43222", notes: null, status: "cancelled" as const, price: 0, rating: null, review: null },
  // 7 months ago (Nov 2025)
  { serviceId: "deep-tissue-massage", employeeId: "aarti-patel", userId: null, date: bookingDate(7, 4), timeSlot: "11:00 - 12:30", slotStart: "11:00", slotEnd: "12:30", name: "Vikram Joshi", email: "vikram@example.com", phone: "+91 98765 43223", notes: null, status: "completed" as const, price: 130, rating: 5, review: null },
  { serviceId: "color-gloss-treatment", employeeId: "priya-sharma", userId: null, date: bookingDate(7, 11), timeSlot: "14:00 - 16:00", slotStart: "14:00", slotEnd: "16:00", name: "Rina Bose", email: "rina@example.com", phone: "+91 98765 43224", notes: null, status: "completed" as const, price: 180, rating: 5, review: null },
  { serviceId: "precision-haircut", employeeId: "rahul-verma", userId: null, date: bookingDate(7, 19), timeSlot: "09:00 - 10:00", slotStart: "09:00", slotEnd: "10:00", name: "Amit Chakraborty", email: "amit@example.com", phone: "+91 98765 43225", notes: null, status: "completed" as const, price: 85, rating: 4, review: null },
  { serviceId: "pre-wedding-skincare", employeeId: "kavya-iyer", userId: null, date: bookingDate(7, 26), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Smita Verma", email: "smita@example.com", phone: "+91 98765 43226", notes: "First session", status: "completed" as const, price: 250, rating: 5, review: null },
  // 6 months ago (Dec 2025)
  { serviceId: "bridal-glam-package", employeeId: "priya-sharma", userId: null, date: bookingDate(6, 1), timeSlot: "09:00 - 12:00", slotStart: "09:00", slotEnd: "12:00", name: "Neha Bajaj", email: "neha.b@example.com", phone: "+91 98765 43227", notes: null, status: "completed" as const, price: 450, rating: 5, review: null },
  { serviceId: "gel-manicure", employeeId: "neha-gupta", userId: null, date: bookingDate(6, 8), timeSlot: "15:00 - 15:45", slotStart: "15:00", slotEnd: "15:45", name: "Ayesha Khan", email: "ayesha@example.com", phone: "+91 98765 43228", notes: null, status: "completed" as const, price: 55, rating: 4, review: null },
  { serviceId: "nail-art-design", employeeId: "sneha-reddy", userId: null, date: bookingDate(6, 15), timeSlot: "11:00 - 12:00", slotStart: "11:00", slotEnd: "12:00", name: "Priti Sengupta", email: "priti@example.com", phone: "+91 98765 43229", notes: null, status: "completed" as const, price: 75, rating: 5, review: null },
  { serviceId: "anti-aging-facial", employeeId: "kavya-iyer", userId: null, date: bookingDate(6, 22), timeSlot: "14:00 - 15:30", slotStart: "14:00", slotEnd: "15:30", name: "Shruti Menon", email: "shruti@example.com", phone: "+91 98765 43230", notes: null, status: "completed" as const, price: 195, rating: 5, review: null },
  // 5 months ago (Jan 2026)
  { serviceId: "deep-tissue-massage", employeeId: "aarti-patel", userId: null, date: bookingDate(5, 3), timeSlot: "10:00 - 11:30", slotStart: "10:00", slotEnd: "11:30", name: "Rajan Pillai", email: "rajan@example.com", phone: "+91 98765 43231", notes: null, status: "completed" as const, price: 130, rating: 4, review: null },
  { serviceId: "color-gloss-treatment", employeeId: "anjali-desai", userId: null, date: bookingDate(5, 10), timeSlot: "13:00 - 15:00", slotStart: "13:00", slotEnd: "15:00", name: "Gayatri Rao", email: "gayatri@example.com", phone: "+91 98765 43232", notes: null, status: "completed" as const, price: 180, rating: 5, review: null },
  { serviceId: "precision-haircut", employeeId: "priya-sharma", userId: null, date: bookingDate(5, 17), timeSlot: "11:00 - 12:00", slotStart: "11:00", slotEnd: "12:00", name: "Sanjay Gupta", email: "sanjay@example.com", phone: "+91 98765 43233", notes: null, status: "completed" as const, price: 85, rating: 5, review: null },
  { serviceId: "aromatherapy-body-wrap", employeeId: "sneha-reddy", userId: null, date: bookingDate(5, 24), timeSlot: "15:00 - 16:15", slotStart: "15:00", slotEnd: "16:15", name: "Usha Pillai", email: "usha@example.com", phone: "+91 98765 43234", notes: null, status: "completed" as const, price: 145, rating: 5, review: null },
  // 4 months ago (Feb 2026)
  { serviceId: "hydra-facial", employeeId: "kavya-iyer", userId: null, date: bookingDate(4, 2), timeSlot: "10:00 - 11:15", slotStart: "10:00", slotEnd: "11:15", name: "Kavita Sharma", email: "kavita@example.com", phone: "+91 98765 43235", notes: null, status: "completed" as const, price: 150, rating: 5, review: null },
  { serviceId: "bridal-glam-package", employeeId: "anjali-desai", userId: null, date: bookingDate(4, 14), timeSlot: "09:00 - 12:00", slotStart: "09:00", slotEnd: "12:00", name: "Mitali Sen", email: "mitali@example.com", phone: "+91 98765 43236", notes: null, status: "completed" as const, price: 450, rating: 5, review: null },
  { serviceId: "gel-manicure", employeeId: "neha-gupta", userId: null, date: bookingDate(4, 20), timeSlot: "12:00 - 12:45", slotStart: "12:00", slotEnd: "12:45", name: "Tanvi Shah", email: "tanvi@example.com", phone: "+91 98765 43237", notes: null, status: "completed" as const, price: 55, rating: 4, review: null },
  { serviceId: "precision-haircut", employeeId: "rahul-verma", userId: null, date: bookingDate(4, 28), timeSlot: "14:00 - 15:00", slotStart: "14:00", slotEnd: "15:00", name: "Manish Tiwari", email: "manish@example.com", phone: "+91 98765 43238", notes: null, status: "completed" as const, price: 85, rating: 4, review: null },
  // 3 months ago (Mar 2026)
  { serviceId: "deep-tissue-massage", employeeId: "aarti-patel", userId: null, date: bookingDate(3, 5), timeSlot: "11:00 - 12:30", slotStart: "11:00", slotEnd: "12:30", name: "Ashok Mishra", email: "ashok@example.com", phone: "+91 98765 43239", notes: null, status: "completed" as const, price: 130, rating: 5, review: null },
  { serviceId: "color-gloss-treatment", employeeId: "priya-sharma", userId: null, date: bookingDate(3, 12), timeSlot: "15:00 - 17:00", slotStart: "15:00", slotEnd: "17:00", name: "Rekha Menon", email: "rekha@example.com", phone: "+91 98765 43240", notes: null, status: "completed" as const, price: 180, rating: 5, review: null },
  { serviceId: "nail-art-design", employeeId: "neha-gupta", userId: null, date: bookingDate(3, 19), timeSlot: "13:00 - 14:00", slotStart: "13:00", slotEnd: "14:00", name: "Ishita Das", email: "ishita@example.com", phone: "+91 98765 43241", notes: null, status: "completed" as const, price: 75, rating: 5, review: null },
  { serviceId: "anti-aging-facial", employeeId: "kavya-iyer", userId: null, date: bookingDate(3, 26), timeSlot: "10:00 - 11:30", slotStart: "10:00", slotEnd: "11:30", name: "Sarojini Patel", email: "sarojini@example.com", phone: "+91 98765 43242", notes: null, status: "completed" as const, price: 195, rating: 5, review: null },
  // 2 months ago (Apr 2026)
  { serviceId: "precision-haircut", employeeId: "anjali-desai", userId: null, date: bookingDate(2, 3), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Nitin Srivastava", email: "nitin@example.com", phone: "+91 98765 43243", notes: null, status: "completed" as const, price: 85, rating: 4, review: null },
  { serviceId: "bridal-glam-package", employeeId: "priya-sharma", userId: null, date: bookingDate(2, 10), timeSlot: "09:00 - 12:00", slotStart: "09:00", slotEnd: "12:00", name: "Jaya Bachchan", email: "jaya@example.com", phone: "+91 98765 43244", notes: "Engagement", status: "completed" as const, price: 450, rating: 5, review: null },
  { serviceId: "aromatherapy-body-wrap", employeeId: "aarti-patel", userId: null, date: bookingDate(2, 17), timeSlot: "14:00 - 15:15", slotStart: "14:00", slotEnd: "15:15", name: "Geeta Devi", email: "geeta@example.com", phone: "+91 98765 43245", notes: null, status: "completed" as const, price: 145, rating: 5, review: null },
  { serviceId: "hydra-facial", employeeId: "kavya-iyer", userId: null, date: bookingDate(2, 24), timeSlot: "11:00 - 12:15", slotStart: "11:00", slotEnd: "12:15", name: "Pooja Agarwal", email: "pooja@example.com", phone: "+91 98765 43246", notes: null, status: "completed" as const, price: 150, rating: 5, review: null },
  { serviceId: "gel-manicure", employeeId: "sneha-reddy", userId: null, date: bookingDate(2, 30), timeSlot: "15:00 - 15:45", slotStart: "15:00", slotEnd: "15:45", name: "Sana Mirza", email: "sana@example.com", phone: "+91 98765 43247", notes: null, status: "completed" as const, price: 55, rating: 4, review: null },
  // 1 month ago (May 2026)
  { serviceId: "color-gloss-treatment", employeeId: "rahul-verma", userId: null, date: bookingDate(1, 2), timeSlot: "14:00 - 16:00", slotStart: "14:00", slotEnd: "16:00", name: "Akash Bose", email: "akash@example.com", phone: "+91 98765 43248", notes: null, status: "completed" as const, price: 180, rating: 5, review: null },
  { serviceId: "deep-tissue-massage", employeeId: "aarti-patel", userId: null, date: bookingDate(1, 9), timeSlot: "10:00 - 11:30", slotStart: "10:00", slotEnd: "11:30", name: "Girish Kumar", email: "girish@example.com", phone: "+91 98765 43249", notes: null, status: "completed" as const, price: 130, rating: 5, review: null },
  { serviceId: "precision-haircut", employeeId: "priya-sharma", userId: null, date: bookingDate(1, 16), timeSlot: "11:00 - 12:00", slotStart: "11:00", slotEnd: "12:00", name: "Ramesh Patel", email: "ramesh@example.com", phone: "+91 98765 43250", notes: null, status: "completed" as const, price: 85, rating: 4, review: null },
  { serviceId: "pre-wedding-skincare", employeeId: "kavya-iyer", userId: null, date: bookingDate(1, 23), timeSlot: "10:00 - 11:00", slotStart: "10:00", slotEnd: "11:00", name: "Aarti Bhatt", email: "aarti.b@example.com", phone: "+91 98765 43251", notes: null, status: "completed" as const, price: 250, rating: 5, review: null },
  { serviceId: "nail-art-design", employeeId: "neha-gupta", userId: null, date: bookingDate(1, 28), timeSlot: "13:00 - 14:00", slotStart: "13:00", slotEnd: "14:00", name: "Nandini Singh", email: "nandini@example.com", phone: "+91 98765 43252", notes: null, status: "completed" as const, price: 75, rating: 5, review: null },
  // Current month (Jun 2026)
  { serviceId: "bridal-glam-package", employeeId: "anjali-desai", userId: null, date: bookingDate(0, 2), timeSlot: "09:00 - 12:00", slotStart: "09:00", slotEnd: "12:00", name: "Swati Reddy", email: "swati@example.com", phone: "+91 98765 43253", notes: null, status: "completed" as const, price: 450, rating: 5, review: null },
  { serviceId: "color-gloss-treatment", employeeId: "anjali-desai", userId: null, date: bookingDate(0, 5), timeSlot: "13:00 - 15:00", slotStart: "13:00", slotEnd: "15:00", name: "Kamal Nath", email: "kamal@example.com", phone: "+91 98765 43254", notes: null, status: "completed" as const, price: 180, rating: 5, review: null },
  { serviceId: "hydra-facial", employeeId: "kavya-iyer", userId: null, date: bookingDate(0, 8), timeSlot: "10:00 - 11:15", slotStart: "10:00", slotEnd: "11:15", name: "Suman Jha", email: "suman@example.com", phone: "+91 98765 43255", notes: null, status: "completed" as const, price: 150, rating: 4, review: null },
  { serviceId: "deep-tissue-massage", employeeId: "aarti-patel", userId: null, date: bookingDate(0, 10), timeSlot: "11:00 - 12:30", slotStart: "11:00", slotEnd: "12:30", name: "Hari Prasad", email: "hari@example.com", phone: "+91 98765 43256", notes: null, status: "confirmed" as const, price: 130, rating: null, review: null },
  { serviceId: "gel-manicure", employeeId: "neha-gupta", userId: null, date: bookingDate(0, 12), timeSlot: "15:00 - 15:45", slotStart: "15:00", slotEnd: "15:45", name: "Ritu Goel", email: "ritu@example.com", phone: "+91 98765 43257", notes: null, status: "confirmed" as const, price: 55, rating: null, review: null },
  { serviceId: "precision-haircut", employeeId: "rahul-verma", userId: null, date: bookingDate(0, 14), timeSlot: "14:00 - 15:00", slotStart: "14:00", slotEnd: "15:00", name: "Tarun Das", email: "tarun@example.com", phone: "+91 98765 43258", notes: null, status: "pending" as const, price: 85, rating: null, review: null },
  { serviceId: "anti-aging-facial", employeeId: "kavya-iyer", userId: null, date: bookingDate(0, 15), timeSlot: "10:00 - 11:30", slotStart: "10:00", slotEnd: "11:30", name: "Lata Mangeshkar", email: "lata@example.com", phone: "+91 98765 43259", notes: null, status: "pending" as const, price: 195, rating: null, review: null },
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
  const availabilityData = [
    // Priya Sharma — Mon, Wed, Fri (Hair)
    { employeeId: "priya-sharma", dayOfWeek: 0, startTime: "09:00", endTime: "12:00" },
    { employeeId: "priya-sharma", dayOfWeek: 0, startTime: "13:00", endTime: "17:00" },
    { employeeId: "priya-sharma", dayOfWeek: 2, startTime: "09:00", endTime: "12:00" },
    { employeeId: "priya-sharma", dayOfWeek: 2, startTime: "13:00", endTime: "17:00" },
    { employeeId: "priya-sharma", dayOfWeek: 4, startTime: "09:00", endTime: "15:00" },
    // Anjali Desai — Mon, Tue, Thu (Hair)
    { employeeId: "anjali-desai", dayOfWeek: 0, startTime: "10:00", endTime: "14:00" },
    { employeeId: "anjali-desai", dayOfWeek: 1, startTime: "09:00", endTime: "13:00" },
    { employeeId: "anjali-desai", dayOfWeek: 3, startTime: "10:00", endTime: "16:00" },
    // Kavya Iyer — Tue, Wed, Fri (Skin)
    { employeeId: "kavya-iyer", dayOfWeek: 1, startTime: "09:00", endTime: "13:00" },
    { employeeId: "kavya-iyer", dayOfWeek: 2, startTime: "10:00", endTime: "15:00" },
    { employeeId: "kavya-iyer", dayOfWeek: 4, startTime: "09:00", endTime: "12:00" },
    // Neha Gupta — Mon, Wed, Thu (Nails)
    { employeeId: "neha-gupta", dayOfWeek: 0, startTime: "09:00", endTime: "13:00" },
    { employeeId: "neha-gupta", dayOfWeek: 2, startTime: "10:00", endTime: "16:00" },
    { employeeId: "neha-gupta", dayOfWeek: 3, startTime: "09:00", endTime: "14:00" },
    // Aarti Patel — Tue, Thu, Sat (Body)
    { employeeId: "aarti-patel", dayOfWeek: 1, startTime: "10:00", endTime: "16:00" },
    { employeeId: "aarti-patel", dayOfWeek: 3, startTime: "09:00", endTime: "14:00" },
    { employeeId: "aarti-patel", dayOfWeek: 5, startTime: "09:00", endTime: "15:00" },
    // Rahul Verma — Wed, Thu, Sat (Hair)
    { employeeId: "rahul-verma", dayOfWeek: 2, startTime: "09:00", endTime: "14:00" },
    { employeeId: "rahul-verma", dayOfWeek: 3, startTime: "10:00", endTime: "16:00" },
    { employeeId: "rahul-verma", dayOfWeek: 5, startTime: "09:00", endTime: "13:00" },
    // Sneha Reddy — Tue, Fri, Sat (Nails/Body)
    { employeeId: "sneha-reddy", dayOfWeek: 1, startTime: "09:00", endTime: "13:00" },
    { employeeId: "sneha-reddy", dayOfWeek: 4, startTime: "10:00", endTime: "15:00" },
    { employeeId: "sneha-reddy", dayOfWeek: 5, startTime: "10:00", endTime: "16:00" },
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
