export const CATEGORY_EXCLUSIONS = [
  "Auto Body & Paint",
  "Auto Parts",
  "Car Wash Detail",
  "Catering",
  "Convenience Stores",
  "Golf",
  "Chiropractic",
  "Dental",
  "Fitness Equipment",
  "Medical",
  "Garden Centers",
  "Pest Control",
  "Siding",
  "Water Purification/softening",
  "Business Services",
  "Carpet Cleaner",
  "Cell Phone",
  "Financial Services",
  "Office Services",
  "Transportation",
  "Tuxedo Rental",
  "Weddings",
  "Boutique",
  "Bridal",
  "Cycling",
  "Outdoor Equipment",
  "Wireless",
  "Ski & Snowboard",
];

const excludedNames = new Set(CATEGORY_EXCLUSIONS.map((n) => n.toLowerCase()));

export function isCategoryExcluded(categoryName: string): boolean {
  return excludedNames.has(categoryName.toLowerCase());
}

export function filterCategoriesByExclusion<T extends { category_name: string; subcategories?: T[] }>(
  categories: T[]
): T[] {
  return categories
    .filter((cat) => !excludedNames.has(cat.category_name.toLowerCase()))
    .map((cat) => ({
      ...cat,
      subcategories: cat.subcategories ? filterCategoriesByExclusion(cat.subcategories) : undefined,
    }));
}

export function filterCategoryCounts(
  counts: Record<string, number>,
  categoriesMap: Map<number, string>
): Record<number, number> {
  const filteredCounts: Record<number, number> = {};

  for (const [key, count] of Object.entries(counts)) {
    const categoryName = categoriesMap.get(Number(key));
    if (categoryName && !excludedNames.has(categoryName.toLowerCase())) {
      filteredCounts[Number(key)] = count;
    }
  }

  return filteredCounts;
}

export interface CategoryNode {
  category_key: number;
  category_name: string;
  category_type?: string;
  offer_count?: number;
  subcategories?: CategoryNode[];
}

export function transformCategoryTree(categories: CategoryNode[]): CategoryNode[] {
  const result = [...categories];

  const automotiveIndex = result.findIndex((c) => c.category_name === "Automotive");
  const carRentalIndex = result.findIndex((c) => c.category_name === "Car Rental");

  if (automotiveIndex !== -1 && carRentalIndex !== -1) {
    const carRental = result[carRentalIndex];

    const mergedSubcategories = [
      ...(result[automotiveIndex].subcategories || []),
      { ...carRental, subcategories: carRental.subcategories || [] },
    ].sort((a, b) => a.category_name.localeCompare(b.category_name));

    result[automotiveIndex] = {
      ...result[automotiveIndex],
      category_name: "Auto, Gas, & Car Rental",
      subcategories: mergedSubcategories,
    };

    result.splice(carRentalIndex, 1);
  } else if (automotiveIndex !== -1) {
    result[automotiveIndex] = {
      ...result[automotiveIndex],
      category_name: "Auto, Gas, & Car Rental",
    };
  }

  return result;
}
