// One color-scheme preference for the whole site (ADR 0006). The manager is
// shared by MantineProvider and ColorSchemeScript (via the storage key) so the
// SSR no-flash script and the client provider read/write the same value, and
// an explicit toggle choice persists across visits. Default is `auto`.
import { localStorageColorSchemeManager } from '@mantine/core'

export const COLOR_SCHEME_STORAGE_KEY = 'ufc-color-scheme'

export const colorSchemeManager = localStorageColorSchemeManager({
  key: COLOR_SCHEME_STORAGE_KEY,
})
