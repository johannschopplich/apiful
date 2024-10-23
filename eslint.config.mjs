// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu().append({
  rules: {
    'ts/no-unsafe-function-type': 'off',
  }
})
