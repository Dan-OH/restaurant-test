import { describePlacement } from '../../lib/media'
import { variableUsageKeys } from '../../lib/variables'

/** Where a variable is used: the site_content keys, and the distinct page names. */
export function variableUsage(site, key) {
  const keys = variableUsageKeys(site.content, key)
  const context = { pages: site.pages, sections: site.pageSections }
  const pages = [...new Set(keys.map((k) => describePlacement(k, 0, 1, context).page))]
  return { keys, pages }
}
