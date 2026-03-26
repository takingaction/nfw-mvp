/**
 * Access Perks Offers API Integration
 * Search, browse, and display member perks
 */

export interface OfferSearchParams {
  member_key: string;
  query?: string;
  postal_code?: string;
  lat?: number;
  lon?: number;
  distance?: string;
  city_locality?: string;
  state_region?: string;
  country?: string;
  online?: "only" | "include" | "none";
  category_key?: string;
  store_key?: string;
  location_key?: string;
  national?: "only" | "include" | "none";
  offer_type?: string;
  redemption_method?: string;
  discount_type?: "percent" | "amount";
  percentage_savings_min?: number;
  percentage_savings_max?: number;
  offer_value_min?: number;
  offer_value_max?: number;
  sort?: string;
  sort_direction?: "asc" | "desc";
  page?: number;
  per_page?: number;
  aggregations?: string;
  fields?: string;
}

/**
 * Search offers with filtering
 */
export async function searchOffers(params: OfferSearchParams) {
  try {
    if (!process.env.ACCESS_OFFERS_TOKEN) {
      throw new Error("ACCESS_OFFERS_TOKEN environment variable is not set");
    }

    if (!process.env.ACCESS_OFFERS_API_URL) {
      throw new Error("ACCESS_OFFERS_API_URL environment variable is not set");
    }

    const queryParams = new URLSearchParams();

    queryParams.append("access_token", process.env.ACCESS_OFFERS_TOKEN);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const fullUrl = `${process.env.ACCESS_OFFERS_API_URL}/v1/offers?${queryParams.toString()}`;

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Offers API Error: ${response.status} ${response.statusText} - ${responseText.substring(0, 200)}`,
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get a single offer by offer_key
 */
export async function getOffer(offerKey: string, memberKey: string) {
  try {
    if (!process.env.ACCESS_OFFERS_TOKEN) {
      throw new Error("ACCESS_OFFERS_TOKEN environment variable is not set");
    }

    if (!process.env.ACCESS_OFFERS_API_URL) {
      throw new Error("ACCESS_OFFERS_API_URL environment variable is not set");
    }

    const url = `${process.env.ACCESS_OFFERS_API_URL}/v1/offers/${offerKey}?access_token=${process.env.ACCESS_OFFERS_TOKEN}&member_key=${memberKey}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Offers API Error: ${response.status} ${response.statusText} - ${responseText.substring(0, 200)}`,
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get offer uses remaining for a member
 */
export async function getOfferUsesRemaining(
  offerKey: string,
  memberKey: string,
) {
  try {
    const response = await fetch(
      `${process.env.ACCESS_OFFERS_API_URL}/v1/offers/${offerKey}/uses_remaining?access_token=${process.env.ACCESS_OFFERS_TOKEN}&member_key=${memberKey}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      if (response.status === 200) {
        const data = await response.json();
        if (data.message === "No redemptions found.") {
          return {
            usable: true,
            uses_remaining: "unlimited",
            number_of_uses_remaining: -1,
          };
        }
      }
      const error = await response.json();
      throw new Error(
        `Uses Remaining API Error: ${error.message || response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Get all categories
 */
export async function getCategories(memberKey: string | null) {
  try {
    const baseUrl = `${process.env.ACCESS_OFFERS_API_URL}/v1/categories?access_token=${process.env.ACCESS_OFFERS_TOKEN}`;
    const url = memberKey ? `${baseUrl}&member_key=${memberKey}` : baseUrl;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Categories API Error: ${response.status} ${response.statusText} - ${responseText.substring(0, 200)}`,
      );
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}
