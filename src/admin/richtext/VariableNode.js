import { Node } from '@tiptap/core'
import { createChip } from '../../components/editableDom'

// Current site variables, for drawing chips. Set by RichTextField on every render (variables
// are site-wide, so one shared reference is enough).
let currentVariables = {}
export function setChipVariables(variables) {
  currentVariables = variables
}

/**
 * A site variable inside formatted text. Shown as the same chip as in plain fields (hover for
 * details, click to edit), but saved as plain "{{key}}" text so stored HTML keeps working with
 * variable renames, deletes and usage tracking: the editor outputs
 * <span data-variable="key">{{key}}</span> and stripVariableSpans() removes the wrapper on save;
 * tokensToSpans() adds it back when content is loaded.
 */
export const VariableNode = Node.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      key: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-variable'),
        renderHTML: (attrs) => ({ 'data-variable': attrs.key }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', HTMLAttributes, `{{${node.attrs.key}}}`]
  },

  renderText({ node }) {
    return `{{${node.attrs.key}}}`
  },

  addNodeView() {
    return ({ node }) => ({
      dom: createChip(node.attrs.key, currentVariables),
      // The chip's text is display-only (refreshed when variables change).
      ignoreMutation: () => true,
    })
  },
})
