import { FetchError } from 'ofetch'

export type ValidateResult<T> = T | true | false | void

export type ValidateFunction<T> = (
  data: unknown,
) => ValidateResult<T> | Promise<ValidateResult<T>>

export async function validateData<T>(
  data: unknown,
  fn: ValidateFunction<T>,
): Promise<T> {
  try {
    const res = await fn(data)
    if (res === false)
      throw createValidationError()

    if (res === true)
      return data as T

    return res ?? (data as T)
  }
  catch (error) {
    throw createValidationError(error)
  }
}

function createValidationError(validateError?: any) {
  return new FetchError({
    status: 400,
    message: validateError.message || 'Validation Failed',
    ...validateError,
  })
}
