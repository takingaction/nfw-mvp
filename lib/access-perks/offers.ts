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
    // Check environment variables
    if (!process.env.ACCESS_OFFERS_TOKEN) {
      throw new Error("ACCESS_OFFERS_TOKEN environment variable is not set");
    }

    if (!process.env.ACCESS_OFFERS_API_URL) {
      throw new Error("ACCESS_OFFERS_API_URL environment variable is not set");
    }

    const queryParams = new URLSearchParams();

    // Add access token
    queryParams.append("access_token", process.env.ACCESS_OFFERS_TOKEN);

    // Add all other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const fullUrl = `${process.env.ACCESS_OFFERS_API_URL}/v1/offers?${queryParams.toString()}`;

    // Enhanced logging for debugging
    console.log("🔍 ===== OFFERS SEARCH DEBUG =====");
    console.log("📋 Search Params Object:", JSON.stringify(params, null, 2));
    console.log(
      "🌐 Full URL:",
      fullUrl.replace(process.env.ACCESS_OFFERS_TOKEN, "HIDDEN_TOKEN"),
    );
    console.log("📊 Query Params:", Object.fromEntries(queryParams.entries()));
    console.log("================================");

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries()),
    );

    // Get response text first to see what we're actually getting
    const responseText = await response.text();
    console.log(
      "Response body (first 500 chars):",
      responseText.substring(0, 500),
    );

    if (!response.ok) {
      console.error("❌ API Error Response:", responseText);
      throw new Error(
        `Offers API Error: ${response.status} ${response.statusText} - ${responseText.substring(0, 200)}`,
      );
    }

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse response as JSON:", parseError);
      console.error("Response was:", responseText.substring(0, 1000));
      throw new Error("Offers API returned invalid JSON response");
    }

    return data;
  } catch (error) {
    console.error("Failed to search offers:", error);
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

    console.log(
      "Fetching offer from:",
      url.replace(process.env.ACCESS_OFFERS_TOKEN, "HIDDEN_TOKEN"),
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    console.log("Offer response status:", response.status);

    const responseText = await response.text();
    console.log(
      "Offer response (first 500 chars):",
      responseText.substring(0, 500),
    );

    if (!response.ok) {
      throw new Error(
        `Offers API Error: ${response.status} ${response.statusText} - ${responseText.substring(0, 200)}`,
      );
    }

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse offer response as JSON:", parseError);
      throw new Error("Offers API returned invalid JSON response");
    }

    return data;
  } catch (error) {
    console.error("Failed to get offer:", error);
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
      // 200 with "No redemptions found" means offer is redeemable
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
    console.error("Failed to get offer uses remaining:", error);
    throw error;
  }
}

/**
 * Get all categories
 */
export async function getCategories(memberKey: string) {
  try {
    const url = `${process.env.ACCESS_OFFERS_API_URL}/v1/categories?access_token=${process.env.ACCESS_OFFERS_TOKEN}&member_key=${memberKey}`;

    console.log(
      "Fetching categories from:",
      url.replace(process.env.ACCESS_OFFERS_TOKEN!, "HIDDEN_TOKEN"),
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    console.log("Categories response status:", response.status);

    const responseText = await response.text();
    console.log(
      "Categories response (first 500 chars):",
      responseText.substring(0, 500),
    );

    if (!response.ok) {
      throw new Error(
        `Categories API Error: ${response.status} ${response.statusText} - ${responseText.substring(0, 200)}`,
      );
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error("Failed to get categories:", error);
    throw error;
  }
}
