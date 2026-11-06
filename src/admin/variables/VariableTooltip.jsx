import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useSite } from '../../lib/site'
import { tokenFor } from '../../lib/variables'
import { variableUsage } from './usage'

const OPEN_DELAY = 250
const CLOSE_DELAY = 100

/**
 * MUI tooltip with a variable's details, shown when hovering a variable chip in edit mode.
 * Chips are plain DOM elements (see components/editableDom.js), so one tooltip is anchored
 * to whichever chip is hovered. Mounted by AdminBar in edit mode.
 */
export default function VariableTooltip() {
  const [chip, setChip] = useState(null) // the hovered chip element
  const timer = useRef(null)

  useEffect(() => {
    function schedule(fn, delay) {
      clearTimeout(timer.current)
      timer.current = setTimeout(fn, delay)
    }
    function over(e) {
      const el = e.target.closest?.('.var-chip')
      if (el) schedule(() => setChip(el), OPEN_DELAY)
    }
    function out(e) {
      const el = e.target.closest?.('.var-chip')
      // Ignore moves between parts of the same chip.
      if (el && !el.contains(e.relatedTarget)) schedule(() => setChip(null), CLOSE_DELAY)
    }
    function hide() {
      clearTimeout(timer.current)
      setChip(null)
    }
    document.addEventListener('mouseover', over)
    document.addEventListener('mouseout', out)
    // Clicking opens the settings dialog; typing means they're busy editing.
    document.addEventListener('mousedown', hide)
    document.addEventListener('keydown', hide)
    return () => {
      clearTimeout(timer.current)
      document.removeEventListener('mouseover', over)
      document.removeEventListener('mouseout', out)
      document.removeEventListener('mousedown', hide)
      document.removeEventListener('keydown', hide)
    }
  }, [])

  // The chip may be re-rendered away (e.g. after saving); don't anchor to a detached node.
  const open = Boolean(chip && chip.isConnected)

  return (
    <Tooltip
      open={open}
      title={open ? <VariableDetails variableKey={chip.dataset.var} /> : ''}
      placement="top"
      arrow
      disableInteractive
      slotProps={{ popper: { anchorEl: chip }, tooltip: { sx: { maxWidth: 320, p: 1.5 } } }}
    >
      {/* Tooltip needs a child; the real anchor is the chip, passed via popper.anchorEl. */}
      <span style={{ display: 'none' }} />
    </Tooltip>
  )
}

function VariableDetails({ variableKey }) {
  const site = useSite()
  const variable = site.variables[variableKey]

  if (!variable) {
    return (
      <Box>
        <Typography variant="subtitle2">Missing variable</Typography>
        <Box component="code" sx={{ fontSize: 12, opacity: 0.8 }}>
          {tokenFor(variableKey)}
        </Box>
        <Typography variant="body2" sx={{ mt: 1 }}>
          There's no variable with this key, so visitors see nothing here.
        </Typography>
        <Hint>Click to create it, or delete it from the text.</Hint>
      </Box>
    )
  }

  const usage = variableUsage(site, variable.key)
  const updated = variable.updated_at ? new Date(variable.updated_at).toLocaleDateString() : null

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ lineHeight: 1.3 }}>
        {variable.label}
      </Typography>
      <Box component="code" sx={{ fontSize: 12, opacity: 0.8 }}>
        {tokenFor(variable.key)}
      </Box>

      <Box
        sx={{
          mt: 1,
          px: 1,
          py: 0.75,
          borderRadius: 1,
          bgcolor: 'rgba(255, 255, 255, 0.12)',
          whiteSpace: 'pre-line',
          fontSize: 13,
        }}
      >
        {variable.value || <em>(empty)</em>}
      </Box>

      {variable.description && (
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
          {variable.description}
        </Typography>
      )}

      <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

      <Typography variant="caption" component="p">
        {usage.keys.length
          ? `Used in ${usage.keys.length} place${usage.keys.length === 1 ? '' : 's'}: ${usage.pages.join(', ')}`
          : 'Not used anywhere yet'}
      </Typography>
      {updated && (
        <Typography variant="caption" component="p" sx={{ opacity: 0.8 }}>
          Last updated {updated}
        </Typography>
      )}
      <Hint>Click to edit · changes update everywhere</Hint>
    </Box>
  )
}

function Hint({ children }) {
  return (
    <Typography variant="caption" component="p" sx={{ mt: 0.75, fontWeight: 600 }}>
      {children}
    </Typography>
  )
}
