import type { Metadata } from "next";
import StudentDevelopersView from "@/components/developers/StudentDevelopersView";

export const metadata: Metadata = {
  title: "Meet the Student Developers | Adamas University",
  description: "Meet the student developers behind the Adamas University chapter.",
};

export default function DevelopersPage() {
  return (
    <>
      {/* Load Inter Tight font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800&display=swap"
        rel="stylesheet"
      />

      {/* Full-screen editorial canvas: strictly 1 screen (overflow-hidden) on desktop and tablet */}
      <div className="fixed inset-0 z-40 bg-[#B01E22] overflow-y-auto md:overflow-hidden">
        <StudentDevelopersView
          developer1={{
            firstName: "Spandan",
            lastName: "Dhar",
            role: "Project Architect",
            imageUrl: "https://res.cloudinary.com/vetwmuuk/image/upload/f_auto/q_auto/Grayscale_Portrait_of_a_Smiling_Young_Man.png",
          }}
          developer2={{
            firstName: "Sampad",
            lastName: "Ghosh",
            role: "Development Associate",
            imageUrl: "https://res.cloudinary.com/vetwmuuk/image/upload/f_auto/q_auto/Confident_Monochrome_Portrait_with_Glasses.png",
          }}
        />
      </div>
    </>
  );
}
