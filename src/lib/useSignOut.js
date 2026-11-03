import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { useSite } from './site'

export function useSignOut() {
  const { setEditing } = useSite()
  const navigate = useNavigate()

  return async function signOut() {
    setEditing(false)
    await supabase.auth.signOut()
    navigate('/')
  }
}
