/**
 * Access Perks Redeem API Integration
 * Handle offer redemption (instore, print, link, call)
 */

export interface RedeemParams {
  offer_key: string
  member_key: string
  first_name: string
  last_name: string
}

/**
 * Get all redemption options for an offer
 */
export async function getRedemptionOptions(params: RedeemParams) {
  try {
    const queryParams = new URLSearchParams({
      access_token: process.env.ACCESS_REDEEM_TOKEN!,
      member_key: params.member_key,
      first_name: params.first_name,
      last_name: params.last_name
    })

    const response = await fetch(
      `${process.env.ACCESS_REDEEM_API_URL}/v1/redeem/${params.offer_key}?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Redeem API Error: ${error.message || response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to get redemption options:', error)
    throw error
  }
}

/**
 * Get instore redemption details
 */
export async function redeemInstore(params: RedeemParams) {
  try {
    const queryParams = new URLSearchParams({
      access_token: process.env.ACCESS_REDEEM_TOKEN!,
      member_key: params.member_key,
      first_name: params.first_name,
      last_name: params.last_name
    })

    const response = await fetch(
      `${process.env.ACCESS_REDEEM_API_URL}/v1/redeem/${params.offer_key}/instore?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Redeem API Error: ${error.message || response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to redeem instore:', error)
    throw error
  }
}

/**
 * Get instore print redemption details
 */
export async function redeemInstorePrint(params: RedeemParams) {
  try {
    const queryParams = new URLSearchParams({
      access_token: process.env.ACCESS_REDEEM_TOKEN!,
      member_key: params.member_key,
      first_name: params.first_name,
      last_name: params.last_name
    })

    const response = await fetch(
      `${process.env.ACCESS_REDEEM_API_URL}/v1/redeem/${params.offer_key}/instore_print?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Redeem API Error: ${error.message || response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to redeem instore print:', error)
    throw error
  }
}

/**
 * Get link redemption details
 */
export async function redeemLink(params: RedeemParams) {
  try {
    const queryParams = new URLSearchParams({
      access_token: process.env.ACCESS_REDEEM_TOKEN!,
      member_key: params.member_key,
      first_name: params.first_name,
      last_name: params.last_name
    })

    const response = await fetch(
      `${process.env.ACCESS_REDEEM_API_URL}/v1/redeem/${params.offer_key}/link?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Redeem API Error: ${error.message || response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to redeem link:', error)
    throw error
  }
}

/**
 * Get call redemption details
 */
export async function redeemCall(params: RedeemParams) {
  try {
    const queryParams = new URLSearchParams({
      access_token: process.env.ACCESS_REDEEM_TOKEN!,
      member_key: params.member_key,
      first_name: params.first_name,
      last_name: params.last_name
    })

    const response = await fetch(
      `${process.env.ACCESS_REDEEM_API_URL}/v1/redeem/${params.offer_key}/call?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Redeem API Error: ${error.message || response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to redeem call:', error)
    throw error
  }
}