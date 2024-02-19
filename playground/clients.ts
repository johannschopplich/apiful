import { consola } from 'consola'
import { OpenAPI, createClient, ofetch, routeBuilder } from '../src'

interface JSONPlaceholderTodoResponse {
  userId: number
  id: number
  title: string
  completed: boolean
}

const client = createClient({
  baseURL: 'https://jsonplaceholder.typicode.com',
}).with(ofetch())
consola.success(await client<JSONPlaceholderTodoResponse>('todos/1'))

const rest = createClient({
  baseURL: 'https://jsonplaceholder.typicode.com',
}).with(routeBuilder())
const response = await rest.todos(1).get<JSONPlaceholderTodoResponse>()
consola.success(response)

const petStore = createClient({
  baseURL: 'https://petstore3.swagger.io/api/v3',
}).with(OpenAPI<'petStore'>())
const userResponse = await petStore('user/{username}', {
  method: 'GET',
  pathParams: { username: 'user1' },
})
consola.success(userResponse)
