import { createContext, useContext } from 'react'

/**
 * Promise-based MUI dialogs for admin UI, replacing window.confirm / window.alert.
 *
 *   const { confirm, alert } = useConfirm()
 *
 *   if (await confirm({ title: 'Remove image?', message: '…', confirmLabel: 'Remove' })) { … }
 *
 *   // Destructive: the user types the name to enable the button (pasting is allowed).
 *   if (await confirm({ title: 'Delete section?', confirmText: section.name, danger: true })) { … }
 *
 *   await alert({ title: 'Upload failed', message: e.message })
 *
 * Options: title, message (string or node), confirmLabel, cancelLabel, danger, confirmText.
 */
export const ConfirmContext = createContext(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside <AdminTheme>')
  return ctx
}
