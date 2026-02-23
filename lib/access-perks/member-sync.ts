/**
 * Access Perks Member AMT API Integration
 * Syncs NFW members with Access Perks platform
 */

interface AccessMemberImport {
  organization_customer_identifier: string
  program_customer_identifier: string
  member_customer_identifier: string
  first_name: string
  last_name: string
  email_address: string
  member_status: 'OPEN' | 'SUSPEND'
  previous_member_customer_identifier?: string
}

/**
 * Sanitize member_customer_identifier to meet Access requirements:
 * - Alphanumeric only (no special characters)
 * - Uppercase
 * - Trimmed
 */
function sanitizeMemberIdentifier(userId: string): string {
  return userId
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .trim()
}

/**
 * Split full name into first and last name for Access Perks
 * Handles edge cases like single names (mononyms)
 */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim()
  
  if (!trimmed) {
    return { firstName: 'Member', lastName: 'Member' }
  }
  
  const parts = trimmed.split(' ').filter(p => p.length > 0)
  
  if (parts.length === 0) {
    return { firstName: 'Member', lastName: 'Member' }
  }
  
  if (parts.length === 1) {
    // Single name (e.g., "Madonna") - use same value for both
    return { firstName: parts[0], lastName: parts[0] }
  }
  
  // Multiple parts: first word = firstName, rest = lastName
  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ')
  
  return { firstName, lastName }
}

/**
 * Import/sync members with Access Perks
 */
export async function syncAccessMembers(members: AccessMemberImport[]) {
  try {
    const response = await fetch(`${process.env.ACCESS_AMT_API_URL}/imports`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Access-Token': process.env.ACCESS_AMT_TOKEN!
      },
      body: JSON.stringify({
        import: {
          members: members
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Access AMT API Error: ${error.message || response.statusText}`)
    }

    const result = await response.json()
    
    if (result.invalid_members_csv) {
      console.warn('Some members failed validation:', result.invalid_members_csv)
    }

    return result
  } catch (error) {
    console.error('Failed to sync Access members:', error)
    throw error
  }
}

/**
 * Create/update a single Access Perks member
 */
export async function syncAccessMember(
  userId: string,
  firstName: string,
  lastName: string,
  email: string,
  status: 'OPEN' | 'SUSPEND' = 'OPEN'
) {
  const member: AccessMemberImport = {
    organization_customer_identifier: process.env.ACCESS_ORGANIZATION_ID!,
    program_customer_identifier: process.env.ACCESS_PROGRAM_ID!,
    member_customer_identifier: sanitizeMemberIdentifier(userId),
    first_name: firstName,
    last_name: lastName,
    email_address: email,
    member_status: status
  }

  return syncAccessMembers([member])
}

/**
 * Helper: Convert NFW profile to Access member format
 */
export function profileToAccessMember(profile: any, userId: string, userEmail: string) {
  const { firstName, lastName } = splitFullName(profile.full_name || '')
  const status = profile.subscription_status === 'active' ? 'OPEN' : 'SUSPEND'

  return {
    userId,
    firstName,
    lastName,
    email: userEmail,
    status: status as 'OPEN' | 'SUSPEND'
  }
}