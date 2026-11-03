import { createContext, useContext } from 'react'

export const AuthContext = createContext({ session: null, loading: true })

export function useAuth() {
  return useContext(AuthContext)
}
