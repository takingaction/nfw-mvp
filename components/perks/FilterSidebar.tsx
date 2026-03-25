"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, X, SlidersHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Category {
  category_key: number;
  category_name: string;
  category_type: string;
  subcategories?: Category[];
}

interface Facet {
  key: string;
  label: string;
  values: { key: string; label: string }[];
}

interface FilterSidebarProps {
  categories: Category[];
  selectedCategories: number[];
  onCategoriesChange: (categoryKeys: number[]) => void;
  categoryCounts?: Record<number, number>;
  facets?: Facet[];
  selectedFacets?: string[];
  onFacetsChange?: (facetKeys: string[]) => void;
  selectedOfferTypes?: string[];
  onOfferTypeChange?: (types: string[]) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const OFFER_TYPE_OPTIONS = [
  { key: 'new', label: 'New Offers' },
  { key: 'expiring_soon', label: 'Expiring Soon' },
  { key: 'promo_code', label: 'Has Promo Code' },
  { key: '50_off', label: '50% Off or More' },
  { key: 'bogo', label: 'Buy One Get One' },
  { key: 'unlimited', label: 'Unlimited Use' },
  { key: 'limited', label: 'Limited Use' },
  { key: 'popular', label: 'Popular' },
];

export default function FilterSidebar({
  categories,
  selectedCategories,
  onCategoriesChange,
  categoryCounts = {},
  facets = [],
  selectedFacets = [],
  onFacetsChange,
  selectedOfferTypes = [],
  onOfferTypeChange,
  isMobileOpen = false,
  onMobileClose,
}: FilterSidebarProps) {
  const [expandedParents, setExpandedParents] = useState<Set<number>>(
    new Set(categories.map((c) => c.category_key))
  );
  const [expandedFacets, setExpandedFacets] = useState<Set<string>>(new Set(facets.map((f) => f.key)));
  const [expandedOfferTypes, setExpandedOfferTypes] = useState<Set<string>>(new Set(['offer_type']));

  const toggleParent = (key: number) => {
    const newExpanded = new Set(expandedParents);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedParents(newExpanded);
  };

  const toggleCategory = (key: number) => {
    if (selectedCategories.includes(key)) {
      onCategoriesChange(selectedCategories.filter((k) => k !== key));
    } else {
      onCategoriesChange([...selectedCategories, key]);
    }
  };

  const handleSubcategoryToggle = (subcategoryKey: number, parentKey: number) => {
    toggleCategory(subcategoryKey);
    if (!expandedParents.has(parentKey)) {
      setExpandedParents(new Set([...expandedParents, parentKey]));
    }
  };

  const toggleFacetSection = (key: string) => {
    const newExpanded = new Set(expandedFacets);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedFacets(newExpanded);
  };

  const toggleFacet = (facetKey: string) => {
    if (!onFacetsChange) return;
    if (selectedFacets.includes(facetKey)) {
      onFacetsChange(selectedFacets.filter((f) => f !== facetKey));
    } else {
      onFacetsChange([...selectedFacets, facetKey]);
    }
  };

  const toggleOfferType = (typeKey: string) => {
    if (!onOfferTypeChange) return;
    if (selectedOfferTypes.includes(typeKey)) {
      onOfferTypeChange(selectedOfferTypes.filter((t) => t !== typeKey));
    } else {
      onOfferTypeChange([...selectedOfferTypes, typeKey]);
    }
  };

  const toggleOfferTypesSection = () => {
    const newExpanded = new Set(expandedOfferTypes);
    if (newExpanded.has('offer_type')) {
      newExpanded.delete('offer_type');
    } else {
      newExpanded.add('offer_type');
    }
    setExpandedOfferTypes(newExpanded);
  };

  const clearAllFilters = () => {
    onCategoriesChange([]);
    if (onFacetsChange) onFacetsChange([]);
    if (onOfferTypeChange) onOfferTypeChange([]);
  };

  const sidebarContent = (
    <div className="bg-white border border-nfw-blackberry/10">
      <div className="p-4 border-b border-nfw-blackberry/10 flex items-center justify-between">
        <h3 className="font-serif text-lg text-nfw-aubergine">Filters</h3>
        {(selectedCategories.length > 0 || selectedFacets.length > 0 || selectedOfferTypes.length > 0) && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-nfw-blackberry/60 hover:text-nfw-blackberry transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {(selectedCategories.length > 0 || selectedFacets.length > 0 || selectedOfferTypes.length > 0) && (
          <div className="mb-4 pb-4 border-b border-nfw-blackberry/10">
            <p className="text-xs text-nfw-blackberry/50 mb-2">Selected:</p>
            <div className="flex flex-wrap gap-1">
              {selectedCategories.map((key) => {
                const cat = findCategory(categories, key);
                return cat ? (
                  <span
                    key={`cat-${key}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-nfw-lilac/20 text-nfw-aubergine text-xs"
                  >
                    {cat.category_name}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(key);
                      }}
                      className="hover:text-nfw-blackberry"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
              {selectedFacets.map((key) => {
                const facet = findFacet(facets, key);
                return facet ? (
                  <span
                    key={`facet-${key}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-nfw-lilac/20 text-nfw-aubergine text-xs"
                  >
                    {facet.label}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFacet(key);
                      }}
                      className="hover:text-nfw-blackberry"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
              {selectedOfferTypes.map((key) => {
                const offerType = OFFER_TYPE_OPTIONS.find((o) => o.key === key);
                return offerType ? (
                  <span
                    key={`offer-type-${key}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-nfw-lilac/20 text-nfw-aubergine text-xs"
                  >
                    {offerType.label}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOfferType(key);
                      }}
                      className="hover:text-nfw-blackberry"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}

        <div className="space-y-1">
          {categories.map((category) => (
            <div key={category.category_key}>
              <div className="flex items-center gap-2 py-1.5">
                {category.subcategories && category.subcategories.length > 0 ? (
                  <button
                    onClick={() => toggleParent(category.category_key)}
                    className="text-nfw-blackberry/40 hover:text-nfw-blackberry transition-colors"
                  >
                    {expandedParents.has(category.category_key) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <span className="w-4" />
                )}

                <Checkbox
                  id={`cat-${category.category_key}`}
                  checked={selectedCategories.includes(category.category_key)}
                  onCheckedChange={() => toggleCategory(category.category_key)}
                  className="border-nfw-blackberry/40 data-[state=checked]:bg-nfw-aubergine data-[state=checked]:border-nfw-aubergine"
                />

                <label
                  htmlFor={`cat-${category.category_key}`}
                  className="text-sm text-nfw-blackberry cursor-pointer flex-1 hover:text-nfw-aubergine transition-colors flex items-center justify-between gap-2"
                >
                  <span>{category.category_name}</span>
                  <span className="px-1.5 py-0.5 bg-nfw-lilac/20 text-nfw-aubergine text-xs font-medium">
                    {categoryCounts[category.category_key]?.toLocaleString() ?? '—'}
                  </span>
                </label>
              </div>

              {expandedParents.has(category.category_key) &&
                category.subcategories &&
                category.subcategories.length > 0 && (
                  <div className="pl-6 space-y-1">
                    {category.subcategories.map((sub) => (
                      <div key={sub.category_key} className="flex items-center gap-2 py-1">
                        <Checkbox
                          id={`cat-${sub.category_key}`}
                          checked={selectedCategories.includes(sub.category_key)}
                          onCheckedChange={() =>
                            handleSubcategoryToggle(sub.category_key, category.category_key)
                          }
                          className="border-nfw-blackberry/40 data-[state=checked]:bg-nfw-aubergine data-[state=checked]:border-nfw-aubergine"
                        />
                        <label
                          htmlFor={`cat-${sub.category_key}`}
                          className="text-sm text-nfw-blackberry/70 cursor-pointer flex-1 hover:text-nfw-aubergine transition-colors flex items-center justify-between gap-2"
                        >
                          <span>{sub.category_name}</span>
                          <span className="px-1.5 py-0.5 bg-nfw-lilac/20 text-nfw-aubergine text-xs font-medium">
                            {categoryCounts[sub.category_key]?.toLocaleString() ?? '—'}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          ))}
        </div>

        {facets.length > 0 && (
          <div className="border-t border-nfw-blackberry/10 pt-4 mt-4 space-y-4">
            {facets.map((facet) => (
              <div key={facet.key}>
                <button
                  onClick={() => toggleFacetSection(facet.key)}
                  className="flex items-center gap-2 w-full text-left py-1"
                >
                  {expandedFacets.has(facet.key) ? (
                    <ChevronDown className="w-4 h-4 text-nfw-blackberry/40" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-nfw-blackberry/40" />
                  )}
                  <span className="text-sm font-medium text-nfw-blackberry">
                    {facet.label}
                  </span>
                </button>

                {expandedFacets.has(facet.key) && (
                  <div className="pl-6 space-y-1 mt-2 max-h-48 overflow-y-auto">
                    {facet.values.map((value) => (
                      <div key={value.key} className="flex items-center gap-2 py-0.5">
                        <Checkbox
                          id={`facet-${value.key}`}
                          checked={selectedFacets.includes(value.key)}
                          onCheckedChange={() => toggleFacet(value.key)}
                          className="border-nfw-blackberry/40 data-[state=checked]:bg-nfw-aubergine data-[state=checked]:border-nfw-aubergine"
                        />
                        <label
                          htmlFor={`facet-${value.key}`}
                          className="text-sm text-nfw-blackberry/70 cursor-pointer hover:text-nfw-aubergine transition-colors"
                        >
                          {value.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-nfw-blackberry/10 pt-4 mt-4 space-y-4">
          <div>
            <button
              onClick={toggleOfferTypesSection}
              className="flex items-center gap-2 w-full text-left py-1"
            >
              {expandedOfferTypes.has('offer_type') ? (
                <ChevronDown className="w-4 h-4 text-nfw-blackberry/40" />
              ) : (
                <ChevronRight className="w-4 h-4 text-nfw-blackberry/40" />
              )}
              <span className="text-sm font-medium text-nfw-blackberry">
                Offer Type
              </span>
            </button>

            {expandedOfferTypes.has('offer_type') && (
              <div className="pl-6 space-y-1 mt-2 max-h-48 overflow-y-auto">
                {OFFER_TYPE_OPTIONS.map((option) => (
                  <div key={option.key} className="flex items-center gap-2 py-0.5">
                    <Checkbox
                      id={`offer-type-${option.key}`}
                      checked={selectedOfferTypes.includes(option.key)}
                      onCheckedChange={() => toggleOfferType(option.key)}
                      className="border-nfw-blackberry/40 data-[state=checked]:bg-nfw-aubergine data-[state=checked]:border-nfw-aubergine"
                    />
                    <label
                      htmlFor={`offer-type-${option.key}`}
                      className="text-sm text-nfw-blackberry/70 cursor-pointer hover:text-nfw-aubergine transition-colors"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-4">
          {sidebarContent}
        </div>
      </div>

      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-nfw-blackberry/50"
            onClick={onMobileClose}
          />
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b border-nfw-blackberry/10">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-nfw-aubergine" />
                  <span className="font-serif text-lg text-nfw-aubergine">Filters</span>
                </div>
                <button
                  onClick={onMobileClose}
                  className="p-1 hover:bg-nfw-blackberry/5 transition-colors"
                >
                  <X className="w-5 h-5 text-nfw-blackberry" />
                </button>
              </div>
            </div>
            <div className="pt-0">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function findCategory(categories: Category[], key: number): Category | null {
  for (const cat of categories) {
    if (cat.category_key === key) return cat;
    if (cat.subcategories) {
      const found = cat.subcategories.find((s) => s.category_key === key);
      if (found) return found;
    }
  }
  return null;
}

function findFacet(facets: Facet[], key: string): { key: string; label: string } | null {
  for (const facet of facets) {
    const found = facet.values.find((v) => v.key === key);
    if (found) return found;
  }
  return null;
}