import type { UserConfig } from 'unocss'
import { defineConfig, presetIcons, presetWind3, transformerDirectives } from 'unocss'

const config: UserConfig = defineConfig({
  presets: [
    presetWind3(),
    presetIcons(),
  ],
  transformers: [
    transformerDirectives(),
  ],
})

export default config
