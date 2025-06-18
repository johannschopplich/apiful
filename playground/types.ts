/* eslint-disable unused-imports/no-unused-vars */
import type { PetStore } from 'apiful/schema'

// Query parameters
type PetStatus = PetStore<'/pet/findByStatus', 'get'>['query']['status']
type LoginCredentials = PetStore<'/user/login', 'get'>['query']

// Path parameters
type PetId = PetStore<'/pet/{petId}', 'get'>['path']['petId']
type Username = PetStore<'/user/{username}', 'get'>['path']['username']

// Request bodies for POST/PUT operations
type CreatePetData = PetStore<'/pet', 'post'>['request']
type CreateUserData = PetStore<'/user', 'post'>['request']
type PlaceOrderData = PetStore<'/store/order', 'post'>['request']

// Response types
type Pet = PetStore<'/pet/{petId}', 'get'>['response']
type PetList = PetStore<'/pet/findByStatus', 'get'>['response']
type User = PetStore<'/user/{username}', 'get'>['response']
type Order = PetStore<'/store/order/{orderId}', 'get'>['response']

// Error responses
type PetNotFound = PetStore<'/pet/{petId}', 'get'>['responses'][404]

// Full endpoint definitions (useful for building API clients)
type GetPetEndpoint = PetStore<'/pet/{petId}', 'get'>
type CreatePetEndpoint = PetStore<'/pet', 'post'>
