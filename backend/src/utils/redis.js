import { createClient } from 'redis'

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
})

redisClient.on('error', (err) => console.error('Redis Client Error', err))

export const connectRedis = async () => {
  await redisClient.connect()
  console.log('Redis connected')
}

export const getCache = async (key) => {
  try {
   const data = await redisClient.get(key)
   return data ? JSON.parse(data) : null
  } catch (error) {
   console.error('Redis get error:', error)
   return null
  }
}

export const setCache = async (key, value, ttl = 3600) => {
  try {
   await redisClient.setEx(key, ttl, JSON.stringify(value))
  } catch (error) {
   console.error('Redis set error:', error)
  }
}

export const deleteCache = async (key) => {
  try {
   await redisClient.del(key)
  } catch (error) {
   console.error('Redis delete error:', error)
  }
}

export const deleteCachePattern = async (pattern) => {
  try {
   const keys = await redisClient.keys(pattern)
   if (keys.length > 0) {
     await redisClient.del(keys)
   }
  } catch (error) {
   console.error('Redis delete pattern error:', error)
  }
}

export default redisClient
