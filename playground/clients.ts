/* eslint-disable antfu/no-top-level-await */
import type { PetStoreRequestQuery, PetStoreResponse } from 'apiful/schema'
import { consola } from 'consola'
import { apiRouterBuilder, createClient, ofetchBuilder, OpenAPIBuilder } from '../src'

interface JSONPlaceholderTodoResponse {
  userId: number
  id: number
  title: string
  completed: boolean
}

type _Status = PetStoreRequestQuery<'findPetsByStatus'>['status']
type _Pet = PetStoreResponse<'getPetById'>

const client = createClient({
  baseURL: 'https://jsonplaceholder.typicode.com',
}).with(ofetchBuilder())
consola.success(await client<JSONPlaceholderTodoResponse>('todos/1'))

const rest = createClient({
  baseURL: 'https://jsonplaceholder.typicode.com',
}).with(apiRouterBuilder())
const response = await rest.todos!(1).get<JSONPlaceholderTodoResponse>()
consola.success(response)

const petStore = createClient({
  baseURL: 'https://petstore3.swagger.io/api/v3',
}).with(OpenAPIBuilder<'petStore'>())
const userResponse = await petStore('/user/{username}', {
  method: 'GET',
  path: { username: 'user1' },
})
const petResponse = await petStore('/pet/{petId}', {
  method: 'GET',
  path: { petId: 1 },
})
consola.success(userResponse)
consola.success(petResponse)
