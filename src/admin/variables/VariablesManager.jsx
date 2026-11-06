import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DataObjectIcon from '@mui/icons-material/DataObject'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { usePageMeta } from '../../lib/seo'
import { useSite } from '../../lib/site'
import { replaceToken, tokenFor } from '../../lib/variables'
import { escapeHtml, isHtml } from '../../lib/richText'
import { variableUsage } from './usage'
import { useConfirm } from '../confirm'
import VariableDialog from './VariableDialog.jsx'

export default function VariablesManager() {
  usePageMeta('Variables')
  const site = useSite()
  const { confirm } = useConfirm()
  const [editing, setEditing] = useState(null) // variable, 'new', or null
  const [error, setError] = useState(null)

  const variables = [...site.variableList].sort((a, b) => a.label.localeCompare(b.label))
  const notSetUp = variables.some((v) => String(v.id).startsWith('fallback-'))

  const usagesOf = (variable) => variableUsage(site, variable.key)

  async function remove(variable) {
    const { keys } = usagesOf(variable)
    const ok = await confirm({
      title: 'Delete variable?',
      message: keys.length
        ? `${tokenFor(variable.key)} is used in ${keys.length} place${keys.length === 1 ? '' : 's'}. Its current value will be written into ${keys.length === 1 ? 'that place' : 'those places'} as plain text, so nothing disappears from the site.`
        : `${tokenFor(variable.key)} isn't used anywhere.`,
      confirmText: variable.label,
      confirmLabel: 'Delete variable',
      danger: true,
    })
    if (!ok) return
    setError(null)
    try {
      if (keys.length) {
        await site.saveTexts(
          Object.fromEntries(
            keys.map((k) => {
              const text = site.content[k]
              // Formatted (HTML) fields need the value escaped, with line breaks as <br>.
              const value = isHtml(text) ? escapeHtml(variable.value).replace(/\n/g, '<br>') : variable.value
              return [k, replaceToken(text, variable.key, value)]
            }),
          ),
        )
      }
      await site.removeVariable(variable.id)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h4" component="h1">
          Variables
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')} disabled={notSetUp}>
          New variable
        </Button>
      </Stack>
      <Typography sx={{ color: 'text.secondary' }}>
        Text used in several places, like your address or phone number. Change it here and it updates
        everywhere. To use one, edit any text on the site and type <code>{'{{'}</code>, or click{' '}
        <strong>Insert variable</strong> in the admin bar.
      </Typography>

      {notSetUp && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Variables aren't set up in the database yet. Run <code>supabase/schema.sql</code> in the Supabase SQL
          Editor to start managing them.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={1.5} sx={{ mt: 3 }}>
        {variables.map((v) => (
          <VariableRow
            key={v.id}
            variable={v}
            usages={usagesOf(v)}
            disabled={notSetUp}
            onEdit={() => setEditing(v)}
            onDelete={() => remove(v)}
          />
        ))}
        {variables.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <DataObjectIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
            <Typography variant="h6" component="p">
              No variables yet
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Create one for text you repeat across the site, like opening hours or your address.
            </Typography>
          </Paper>
        )}
      </Stack>

      {editing && (
        <VariableDialog
          key={editing === 'new' ? 'new' : editing.id}
          variable={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Box>
  )
}

function VariableRow({ variable, usages, disabled, onEdit, onDelete }) {
  const [copied, setCopied] = useState(false)
  const token = tokenFor(variable.key)

  function copy() {
    navigator.clipboard?.writeText(token).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <Card variant="outlined">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {variable.label}
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy to paste into text'}>
              <Chip
                size="small"
                variant="outlined"
                label={token}
                onClick={copy}
                onDelete={copy}
                deleteIcon={copied ? <CheckIcon aria-label="Copied" /> : <ContentCopyIcon aria-label="Copy" />}
                sx={{ fontFamily: 'monospace' }}
              />
            </Tooltip>
          </Stack>
          {variable.description && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {variable.description}
            </Typography>
          )}
          <Box
            sx={{
              mt: 1,
              px: 1.5,
              py: 1,
              borderRadius: 1,
              bgcolor: 'action.hover',
              whiteSpace: 'pre-line',
              fontSize: 15,
            }}
          >
            {variable.value || (
              <Box component="span" sx={{ color: 'text.disabled' }}>
                (empty)
              </Box>
            )}
          </Box>
          <Stack direction="row" spacing={0.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
              {usages.keys.length
                ? `Used in ${usages.keys.length} place${usages.keys.length === 1 ? '' : 's'}:`
                : 'Not used yet'}
            </Typography>
            {usages.pages.map((p) => (
              <Chip key={p} size="small" label={p} color="primary" variant="outlined" />
            ))}
          </Stack>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-start', flexShrink: 0 }}>
          <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={onEdit} disabled={disabled}>
            Edit
          </Button>
          <Tooltip title="Delete variable">
            <span>
              <IconButton
                size="small"
                color="error"
                aria-label={`Delete ${variable.label}`}
                onClick={onDelete}
                disabled={disabled}
              >
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </Card>
  )
}
