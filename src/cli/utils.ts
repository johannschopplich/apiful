import type { ConfigLayerMeta, ResolvedConfig } from 'c12'
import type { ApifulConfig } from '../config'
import { loadConfig as _loadConfig } from 'c12'

export function loadConfig(cwd: string): Promise<ResolvedConfig<Partial<ApifulConfig>, ConfigLayerMeta>> {
  return _loadConfig<Partial<ApifulConfig>>({
    cwd,
    name: 'apiful',
    rcFile: false,
    packageJson: false,
  })
}
