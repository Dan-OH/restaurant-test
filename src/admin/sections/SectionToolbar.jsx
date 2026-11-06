import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import { useSite } from '../../lib/site'
import { SECTION_TYPES, sectionPrefix, sectionSettings } from '../../sections/types'
import AdminTheme from '../AdminTheme.jsx'
import { useConfirm } from '../confirm'

/** Edit-mode toolbar in the top-left corner of a page section. */
export default function SectionToolbar(props) {
  return (
    <AdminTheme>
      <Toolbar {...props} />
    </AdminTheme>
  )
}

function Toolbar({ section, index, count }) {
  const site = useSite()
  const { confirm } = useConfirm()
  const [settingsAnchor, setSettingsAnchor] = useState(null)
  const [error, setError] = useState(null)

  const type = SECTION_TYPES[section.type]
  const label = type?.label ?? section.type
  const hasSettings = Boolean(type?.settings?.length)

  async function run(fn) {
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete() {
    // Use the section's heading as its name if it has one; otherwise its layout name.
    const heading = site.getText(`${sectionPrefix(section)}.heading`, '').trim()
    const name = heading || label
    const ok = await confirm({
      title: 'Delete section?',
      message: `The "${label}" section${heading ? ` "${heading}"` : ''} and its text will be permanently deleted. Any images it used stay in Files.`,
      confirmText: name,
      confirmLabel: 'Delete section',
      danger: true,
    })
    if (ok) run(() => site.removePageSection(section))
  }

  return (
    <Box sx={{ position: 'absolute', top: 8, left: 16, zIndex: 3, textAlign: 'left' }}>
      <Paper elevation={3} sx={{ display: 'flex', alignItems: 'center', pl: 1.25, pr: 0.5, py: 0.25, gap: 0.25 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mr: 0.5, whiteSpace: 'nowrap' }}>
          {index + 1}. {label}
        </Typography>
        <Tooltip title="Move up">
          <span>
            <IconButton
              size="small"
              aria-label="Move section up"
              disabled={index === 0}
              onClick={() => run(() => site.movePageSection(section, -1))}
            >
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move down">
          <span>
            <IconButton
              size="small"
              aria-label="Move section down"
              disabled={index === count - 1}
              onClick={() => run(() => site.movePageSection(section, 1))}
            >
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {hasSettings && (
          <Tooltip title="Section settings">
            <IconButton
              size="small"
              aria-label="Section settings"
              aria-haspopup="dialog"
              onClick={(e) => setSettingsAnchor(e.currentTarget)}
            >
              <TuneOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
        <Tooltip title="Delete section">
          <IconButton size="small" color="error" aria-label="Delete section" onClick={handleDelete}>
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 1, maxWidth: 360 }}>
          {error}
        </Alert>
      )}

      {hasSettings && (
        <Popover
          open={Boolean(settingsAnchor)}
          anchorEl={settingsAnchor}
          onClose={() => setSettingsAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <SectionSettings section={section} type={type} onError={setError} />
        </Popover>
      )}
    </Box>
  )
}

/** Controls generated from the section type's `settings` list. Changes save immediately. */
function SectionSettings({ section, type, onError }) {
  const site = useSite()
  const settings = sectionSettings(section)

  function change(key, value) {
    site
      .updatePageSection(section.id, { settings: { ...(section.settings || {}), [key]: value } })
      .catch((e) => onError(e.message))
  }

  return (
    <Stack spacing={2} sx={{ p: 2, minWidth: 260 }}>
      <Typography variant="subtitle2">{type.label} settings</Typography>
      {type.settings.map((s) => {
        if (s.type === 'boolean') {
          return (
            <FormControlLabel
              key={s.key}
              control={<Switch checked={Boolean(settings[s.key])} onChange={(e) => change(s.key, e.target.checked)} />}
              label={s.label}
            />
          )
        }
        return (
          <div key={s.key}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.75 }}>
              {s.label}
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={settings[s.key]}
              onChange={(_, v) => v != null && change(s.key, v)}
              aria-label={s.label}
            >
              {s.options.map((o) => (
                <ToggleButton key={o.value} value={o.value}>
                  {o.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
        )
      })}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Changes are saved automatically.
      </Typography>
    </Stack>
  )
}
