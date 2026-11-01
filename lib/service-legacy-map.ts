import { Service, TreatmentGroup } from './types';

/**
 * Mapping of legacy or deprecated service IDs to their active modern replacements.
 * Used for deep links (e.g. ?service=aromatherapy), redirects (/services/aromatherapy),
 * and preselection so old URLs do not 404 or fail.
 */
export const LEGACY_SERVICE_ID_MAP: Record<string, string> = {
  'aromatherapy': 'aromatherapy-90',
  'body-polishing': 'body-polishing-90',
  'deep-tissue-massage': 'deep-tissue-massage-90',
  'full-body-scrubbing': 'full-body-scrubbing-90',
  'swedish-massage': 'swedish-massage-90',
  'thai-massage': 'thai-massage-90',
  'foot-massage': 'foot-massage-60',
  'foot-massage-30-min': 'foot-massage-30',
  'foot-reflexology': 'foot-reflexology-60',
  'foot-reflexology-30-min': 'foot-reflexology-30',
  'head-massage-30-min': 'head-massage',
  'head-neck-shoulder-massage': 'head-neck-and-shoulder-massage-60',
  'head-neck-shoulder-massage-30-min': 'head-neck-and-shoulder-massage-30',
  'svc_1791635143599_c3c4fq': 'gentleman-combo',
};

/**
 * Resolves any legacy service ID to its active replacement ID.
 * If the ID is not a known legacy alias, it returns the input ID unchanged.
 */
export function resolveActiveServiceId(id: string): string {
  if (!id) return id;
  return LEGACY_SERVICE_ID_MAP[id] || id;
}

/**
 * Hair length ordering helper for styling her variants.
 */
const HAIR_LENGTH_ORDER: Record<string, number> = {
  'short': 1,
  'short hair': 1,
  'medium': 2,
  'medium hair': 2,
  'long': 3,
  'long hair': 3,
  'special': 4,
};

function getVariantSortScore(variant: Service): number {
  if (variant.groupType === 'hair_length' && variant.variantLabel) {
    const key = variant.variantLabel.toLowerCase().trim();
    if (HAIR_LENGTH_ORDER[key] !== undefined) {
      return HAIR_LENGTH_ORDER[key];
    }
  }
  return variant.durationMinutes * 10000 + variant.price;
}

/**
 * Type guard checking if an item is a unified TreatmentGroup.
 */
export function isTreatmentGroup(item: Service | TreatmentGroup): item is TreatmentGroup {
  return 'variants' in item && Array.isArray((item as TreatmentGroup).variants);
}

/**
 * Groups an array of Service items into unified TreatmentGroup objects (for grouped items)
 * and standalone Service objects (for treatments with a single option or no groupKey).
 */
export function groupServicesIntoTreatments(services: Service[]): (Service | TreatmentGroup)[] {
  const groupMap = new Map<string, Service[]>();
  const standalone: Service[] = [];
  const groupOrder: string[] = [];

  for (const s of services) {
    // If service is explicitly marked inactive, skip it for customer display
    if (s.isActive === false) continue;

    if (s.groupKey) {
      if (!groupMap.has(s.groupKey)) {
        groupMap.set(s.groupKey, []);
        groupOrder.push(s.groupKey);
      }
      groupMap.get(s.groupKey)!.push(s);
    } else {
      standalone.push(s);
    }
  }

  const result: (Service | TreatmentGroup)[] = [];

  // Reconstruct grouped treatments
  for (const groupKey of groupOrder) {
    const variants = groupMap.get(groupKey)!;
    // Sort variants by duration/hair-length ascending
    variants.sort((a, b) => getVariantSortScore(a) - getVariantSortScore(b));

    if (variants.length === 1) {
      result.push(variants[0]);
    } else {
      const primary = variants[0];
      const prices = variants.map(v => v.price);
      const durations = variants.map(v => v.durationMinutes);

      const group: TreatmentGroup = {
        groupKey,
        groupName: primary.groupName || primary.name,
        category: primary.category,
        description: primary.description,
        imageUrl: primary.imageUrl,
        featured: variants.some(v => v.featured),
        audience: primary.audience,
        groupType: primary.groupType || 'duration',
        variants,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
      };
      result.push(group);
    }
  }

  // Append standalone services
  for (const s of standalone) {
    result.push(s);
  }

  return result;
}
