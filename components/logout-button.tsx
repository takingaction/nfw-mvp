"use client"

import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const logout = async () => {
    // Clear session storage cache
    localStorage.removeItem('nfw_profile')
    
    // Hard redirect to logout API route which handles signOut server-side
    window.location.href = "/auth/logout"
  }

  return <Button onClick={logout}>Logout</Button>
}