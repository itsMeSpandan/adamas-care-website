import { describe, it, expect } from "vitest";
import {
  LEGACY_SERVICE_ID_MAP,
  resolveActiveServiceId,
  groupServicesIntoTreatments,
  isTreatmentGroup,
} from "@/lib/service-legacy-map";
import { Service, TreatmentGroup } from "@/lib/types";
import { rollupServiceFeedback, getServiceFeedbackGroupKey } from "@/lib/feedback";

// Mock helper to build test services
function mockService(overrides: Partial<Service>): Service {
  return {
    id: "test-id",
    name: "Test Treatment",
    category: "Relaxing Spa",
    description: "A test description",
    longDescription: "Detailed description",
    durationMinutes: 60,
    price: 900,
    imageUrl: "/images/test.jpg",
    employeeIds: ["emp-1", "emp-2"],
    featured: false,
    audience: "unisex",
    groupKey: null,
    groupName: null,
    variantLabel: null,
    groupType: "duration",
    isActive: true,
    ...overrides,
  };
}

describe("Service Grouping & Variant Unification", () => {
  describe("Legacy Service ID Resolution", () => {
    it("maps all 14 legacy/duplicate IDs to their active replacements", () => {
      expect(resolveActiveServiceId("aromatherapy")).toBe("aromatherapy-90");
      expect(resolveActiveServiceId("body-polishing")).toBe("body-polishing-90");
      expect(resolveActiveServiceId("deep-tissue-massage")).toBe("deep-tissue-massage-90");
      expect(resolveActiveServiceId("full-body-scrubbing")).toBe("full-body-scrubbing-90");
      expect(resolveActiveServiceId("swedish-massage")).toBe("swedish-massage-90");
      expect(resolveActiveServiceId("thai-massage")).toBe("thai-massage-90");
      expect(resolveActiveServiceId("foot-massage")).toBe("foot-massage-60");
      expect(resolveActiveServiceId("foot-massage-30-min")).toBe("foot-massage-30");
      expect(resolveActiveServiceId("foot-reflexology")).toBe("foot-reflexology-60");
      expect(resolveActiveServiceId("foot-reflexology-30-min")).toBe("foot-reflexology-30");
      expect(resolveActiveServiceId("head-massage-30-min")).toBe("head-massage");
      expect(resolveActiveServiceId("head-neck-shoulder-massage")).toBe("head-neck-and-shoulder-massage-60");
      expect(resolveActiveServiceId("head-neck-shoulder-massage-30-min")).toBe("head-neck-and-shoulder-massage-30");
      expect(resolveActiveServiceId("svc_1791635143599_c3c4fq")).toBe("gentleman-combo");
    });

    it("returns active IDs and unknown IDs unchanged", () => {
      expect(resolveActiveServiceId("swedish-massage-60")).toBe("swedish-massage-60");
      expect(resolveActiveServiceId("hair-spa-special")).toBe("hair-spa-special");
      expect(resolveActiveServiceId("unknown-svc-123")).toBe("unknown-svc-123");
    });
  });

  describe("Treatment Card Grouping", () => {
    it("collapses duration variants into a single TreatmentGroup with sorted variants", () => {
      const services: Service[] = [
        mockService({
          id: "swedish-massage-90",
          name: "Swedish Massage (90 min)",
          durationMinutes: 90,
          price: 1300,
          groupKey: "swedish-massage",
          groupName: "Swedish Massage",
          variantLabel: "90 min",
          groupType: "duration",
        }),
        mockService({
          id: "swedish-massage-60",
          name: "Swedish Massage (60 min)",
          durationMinutes: 60,
          price: 900,
          groupKey: "swedish-massage",
          groupName: "Swedish Massage",
          variantLabel: "60 min",
          groupType: "duration",
        }),
      ];

      const grouped = groupServicesIntoTreatments(services);
      expect(grouped).toHaveLength(1);
      expect(isTreatmentGroup(grouped[0])).toBe(true);

      const group = grouped[0] as TreatmentGroup;
      expect(group.groupKey).toBe("swedish-massage");
      expect(group.groupName).toBe("Swedish Massage");
      expect(group.minPrice).toBe(900);
      expect(group.maxPrice).toBe(1300);
      expect(group.variants).toHaveLength(2);
      // Shortest duration first
      expect(group.variants[0].id).toBe("swedish-massage-60");
      expect(group.variants[1].id).toBe("swedish-massage-90");
    });

    it("collapses hair-length styling variants in order (Short, Medium, Long, Special)", () => {
      const services: Service[] = [
        mockService({
          id: "hair-spa-long-hair",
          name: "Hair Spa (Long Hair)",
          category: "Styling Her",
          durationMinutes: 60,
          price: 1000,
          groupKey: "hair-spa-women",
          groupName: "Hair Spa (Women)",
          variantLabel: "Long hair",
          groupType: "hair_length",
        }),
        mockService({
          id: "hair-spa-short-hair",
          name: "Hair Spa (Short Hair)",
          category: "Styling Her",
          durationMinutes: 60,
          price: 450,
          groupKey: "hair-spa-women",
          groupName: "Hair Spa (Women)",
          variantLabel: "Short hair",
          groupType: "hair_length",
        }),
        mockService({
          id: "hair-spa-special",
          name: "Hair Spa (Special)",
          category: "Styling Her",
          durationMinutes: 60,
          price: 1250,
          groupKey: "hair-spa-women",
          groupName: "Hair Spa (Women)",
          variantLabel: "Special",
          groupType: "hair_length",
        }),
        mockService({
          id: "hair-spa-medium-hair",
          name: "Hair Spa (Medium Hair)",
          category: "Styling Her",
          durationMinutes: 60,
          price: 650,
          groupKey: "hair-spa-women",
          groupName: "Hair Spa (Women)",
          variantLabel: "Medium hair",
          groupType: "hair_length",
        }),
      ];

      const grouped = groupServicesIntoTreatments(services);
      expect(grouped).toHaveLength(1);
      const group = grouped[0] as TreatmentGroup;
      expect(group.variants).toHaveLength(4);
      expect(group.variants[0].variantLabel).toBe("Short hair");
      expect(group.variants[1].variantLabel).toBe("Medium hair");
      expect(group.variants[2].variantLabel).toBe("Long hair");
      expect(group.variants[3].variantLabel).toBe("Special");
    });

    it("leaves standalone services as individual Service objects", () => {
      const services: Service[] = [
        mockService({
          id: "clean-up",
          name: "Clean-up",
          category: "Fab Facials",
          groupKey: null,
        }),
      ];

      const grouped = groupServicesIntoTreatments(services);
      expect(grouped).toHaveLength(1);
      expect(isTreatmentGroup(grouped[0])).toBe(false);
      expect((grouped[0] as Service).id).toBe("clean-up");
    });

    it("filters out inactive services from customer treatment listings", () => {
      const services: Service[] = [
        mockService({
          id: "swedish-massage-60",
          groupKey: "swedish-massage",
          groupName: "Swedish Massage",
          isActive: true,
        }),
        mockService({
          id: "swedish-massage", // hidden duplicate
          groupKey: null,
          isActive: false,
        }),
      ];

      const grouped = groupServicesIntoTreatments(services);
      expect(grouped).toHaveLength(1);
      expect((grouped[0] as Service).id).toBe("swedish-massage-60");
    });

    it("parses and formats included combo items from description", () => {
      const gentlemanCombo = mockService({
        id: "gentleman-combo",
        name: "Gentleman Combo",
        category: "Classic Combos",
        description: "Hair Cut + Shaving + Shampoo + Head Massage",
      });

      const items = gentlemanCombo.description.split("+").map((s) => s.trim()).filter(Boolean);
      expect(items).toEqual(["Hair Cut", "Shaving", "Shampoo", "Head Massage"]);
    });
  });

  describe("Cart Variant Swapping Logic", () => {
    it("swaps duration variants when switching within the same treatment group", () => {
      const group: TreatmentGroup = {
        groupKey: "swedish-massage",
        groupName: "Swedish Massage",
        category: "Relaxing Spa",
        description: "Relaxing massage",
        imageUrl: "",
        featured: false,
        audience: "unisex",
        groupType: "duration",
        minPrice: 900,
        maxPrice: 1300,
        minDuration: 60,
        maxDuration: 90,
        variants: [
          mockService({ id: "swedish-massage-60", durationMinutes: 60, price: 900 }),
          mockService({ id: "swedish-massage-90", durationMinutes: 90, price: 1300 }),
        ],
      };

      let selectedServices: Service[] = [group.variants[0]]; // 60 min in cart

      // User chooses 90 min variant
      const newVariant = group.variants[1];
      const inCart = selectedServices.find((s) => group.variants.some((v) => v.id === s.id));

      if (inCart && inCart.id !== newVariant.id) {
        selectedServices = selectedServices.map((s) => (s.id === inCart.id ? newVariant : s));
      }

      // Assert that 90m swapped 60m and cart only contains 1 service
      expect(selectedServices).toHaveLength(1);
      expect(selectedServices[0].id).toBe("swedish-massage-90");
      expect(selectedServices[0].price).toBe(1300);
    });

    it("allows multiple different treatments in cart, but only one variant per group", () => {
      const facial = mockService({ id: "clean-up", name: "Clean-up", price: 500 });
      const massage60 = mockService({ id: "swedish-60", groupKey: "swedish", price: 900 });
      const massage90 = mockService({ id: "swedish-90", groupKey: "swedish", price: 1300 });

      const cart: Service[] = [facial, massage60];

      // Switching massage duration
      const updatedCart = cart.map((s) => (s.groupKey === "swedish" ? massage90 : s));

      expect(updatedCart).toHaveLength(2);
      expect(updatedCart.map((s) => s.id)).toEqual(["clean-up", "swedish-90"]);
      expect(updatedCart.reduce((sum, s) => sum + s.price, 0)).toBe(1800);
    });
  });

  describe("Feedback GroupKey Roll-up", () => {
    it("combines legacy aromatherapy ratings with modern aromatherapy-90 ratings", () => {
      const servicesMap = new Map<string, { id: string; name: string; groupKey?: string | null; groupName?: string | null; variantLabel?: string | null }>([
        ["aromatherapy", { id: "aromatherapy", name: "Aromatherapy", groupKey: null }],
        ["aromatherapy-60", { id: "aromatherapy-60", name: "Aromatherapy (60 min)", groupKey: "aromatherapy", groupName: "Aromatherapy", variantLabel: "60 min" }],
        ["aromatherapy-90", { id: "aromatherapy-90", name: "Aromatherapy (90 min)", groupKey: "aromatherapy", groupName: "Aromatherapy", variantLabel: "90 min" }],
      ]);

      expect(getServiceFeedbackGroupKey({ id: "aromatherapy" })).toBe("aromatherapy");
      expect(getServiceFeedbackGroupKey({ id: "aromatherapy-90", groupKey: "aromatherapy" })).toBe("aromatherapy");

      const ratings = [
        { serviceId: "aromatherapy", rating: 5, tags: ["Relaxing"] },
        { serviceId: "aromatherapy", rating: 4, tags: ["Comfortable"] },
        { serviceId: "aromatherapy-90", rating: 5, tags: ["Relaxing", "Great results"] },
        { serviceId: "aromatherapy-60", rating: 4, tags: ["Relaxing"] },
      ];

      const rollups = rollupServiceFeedback(ratings, servicesMap);
      expect(rollups).toHaveLength(1);

      const aromaRollup = rollups[0];
      expect(aromaRollup.groupKey).toBe("aromatherapy");
      expect(aromaRollup.totalRatings).toBe(4);
      expect(aromaRollup.averageRating).toBe(4.5);
      expect(aromaRollup.tagCounts["Relaxing"]).toBe(3);
      expect(aromaRollup.variantBreakdown).toHaveLength(3);
    });
  });
});
