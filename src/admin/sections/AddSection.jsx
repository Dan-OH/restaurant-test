import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import { useSite } from '../../lib/site'
import { SECTION_TYPES, sectionPrefix } from '../../sections/types'
import AdminTheme from '../AdminTheme.jsx'
import SectionPreview from './SectionPreview.jsx'

/**
 * "Add section" control. variant="inline" is a slim divider between sections;
 * variant="end" is a larger box at the bottom of the page.
 */
export default function AddSection(props) {
  return (
    <AdminTheme>
      <AddSectionControl {...props} />
    </AdminTheme>
  )
}

function AddSectionControl({ page, index, variant }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {variant === 'end' ? (
        <Box className="container" sx={{ py: 3 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{ py: 2.5, borderStyle: 'dashed', borderWidth: 2, '&:hover': { borderStyle: 'dashed', borderWidth: 2 } }}
          >
            Add a section
          </Button>
        </Box>
      ) : (
        // Slim divider; becomes more visible on hover/focus so it doesn't clutter the page.
        <Box
          sx={{
            position: 'relative',
            height: 0,
            zIndex: 2,
            '&:hover .add-line, &:focus-within .add-line': { opacity: 1 },
            '&:hover .add-btn, &:focus-within .add-btn': { opacity: 1 },
          }}
        >
          <Box
            className="add-line"
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              borderTop: 2,
              borderColor: 'primary.main',
              borderStyle: 'dashed',
              opacity: 0,
              transition: 'opacity 0.15s',
            }}
          />
          <Box sx={{ position: 'absolute', left: '50%', top: 0, transform: 'translate(-50%, -50%)' }}>
            <Button
              className="add-btn"
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpen(true)}
              sx={{ opacity: 0.55, transition: 'opacity 0.15s', borderRadius: 999, boxShadow: 2 }}
            >
              Add section
            </Button>
          </Box>
        </Box>
      )}

      {open && <SectionPicker page={page} index={index} onClose={() => setOpen(false)} />}
    </>
  )
}

function SectionPicker({ page, index, onClose }) {
  const site = useSite()
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [adding, setAdding] = useState(null)
  const [error, setError] = useState(null)

  async function add(type) {
    setAdding(type)
    setError(null)
    try {
      const section = await site.addPageSection(page.id, type, index)
      onClose()
      // Bring the new section into view once it has rendered.
      setTimeout(() => {
        document.getElementById(sectionPrefix(section))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    } catch (e) {
      setError(e.message)
      setAdding(null)
    }
  }

  return (
    <Dialog open onClose={() => !adding && onClose()} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ pr: 6 }}>
        Add a section
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Choose a layout. You can fill it in, change its settings, move it or delete it afterwards.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {Object.entries(SECTION_TYPES).map(([key, type]) => (
            <Card key={key} variant="outlined">
              <CardActionArea onClick={() => add(key)} disabled={Boolean(adding)} sx={{ height: '100%' }}>
                <CardContent>
                  <SectionPreview type={key} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                    <Typography variant="subtitle2">{type.label}</Typography>
                    {adding === key && <CircularProgress size={14} />}
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {type.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  )
}
