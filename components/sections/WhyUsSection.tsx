"use client";



const features = [
  {
    title: "Every Specialist, Every Service",
    description:
      "All four of our specialists are trained across hair, skin, nails, and body treatments — so you get the same quality no matter what you book.",
    icon: (
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-beige-400"
      >
        <path d="M12 14l9-5-9-5-9 5 9 5z" />
        <path d="M12 14l6.16-3.422a12.083 12.083 0 0 1 .665 6.479A11.952 11.952 0 0 0 12 20.055a11.952 11.952 0 0 0-6.824-2.998 12.078 12.078 0 0 1 .665-6.479L12 14z" />
      </svg>
    ),
  },
  {
    title: "Products We'd Use Ourselves",
    description:
      "No filler ingredients, no generic brands. We stock what actually works — ammonia-free colour, medical-grade skincare, and nail products that last three weeks.",
    icon: (
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-beige-400"
      >
        <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    ),
  },
  {
    title: "Your Time Respected",
    description:
      "We run on schedule, not fashionably late. 5-minute buffers between clients mean your 60-minute service actually starts at 10:00, not 10:15.",
    icon: (
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-beige-400"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
];

export default function WhyUsSection() {
  return (
    <section className="section-padding bg-sage-50">
      <div className="section-container mx-auto text-center">
        <h2
          className="mb-4 font-serif text-3xl font-semibold text-beige-700 md:text-4xl"
        >
          Why Clients Come Back
        </h2>
        <p
          className="mb-16 text-beige-800"
        >
          Not just a salon — a team that actually cares about the result
        </p>

        <div className="grid gap-12 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-beige-100">
                {feature.icon}
              </div>
              <h3 className="mb-2 font-serif text-xl font-semibold text-beige-700">
                {feature.title}
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-beige-800">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
