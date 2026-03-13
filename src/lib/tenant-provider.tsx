'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './auth-context'

interface TenantContextType {
  tenantId: string | null
  loading: boolean
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  loading: true,
})

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        // 简化方案: 对于 v1 版，假设 user.id 即为 tenant_id
        setTenantId(user.id)
      } else {
        setTenantId(null)
      }
      setLoading(false)
    }
  }, [user, authLoading])

  return (
    <TenantContext.Provider value={{ tenantId, loading }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => useContext(TenantContext)
