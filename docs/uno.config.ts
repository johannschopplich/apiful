import type { UserConfig } from 'unocss'
import { defineConfig, presetIcons, presetUno, transformerDirectives } from 'unocss'

const config: UserConfig<object> = defineConfig({
  presets: [
    presetUno(),
    presetIcons(),
  ],
  transformers: [
    transformerDirectives(),
  ],
})

export default config
