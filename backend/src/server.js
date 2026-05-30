import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler.js'
import { startCronJobs } from './services/cronService.js'
import { connectRedis } from './utils/redis.js'
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import storeRoutes from './routes/storeRoutes.js'
import itemRoutes from './routes/itemRoutes.js'
import cartRoutes from './routes/cartRoutes.js'
import bookingRoutes from './routes/bookingRoutes.js'
import campaignRoutes from './routes/campaignRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet())
app.use(cors({
   origin: (origin, callback) => {
     if (!origin) return callback(null, true)
     const allowed = process.env.FRONTEND_URL
       ? [process.env.FRONTEND_URL]
       : null
     if (!allowed) {
       if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true)
       return callback(new Error(`CORS: origin ${origin} not allowed`))
     }
     if (allowed.includes(origin)) return callback(null, true)
     return callback(new Error(`CORS: origin ${origin} not allowed`))
   },
   credentials: true
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/uploads', express.static('uploads'))

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/stores', storeRoutes)
app.use('/api/items', itemRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/campaigns', campaignRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/analytics', analyticsRoutes)

app.use(errorHandler)

const start = async () => {
  await connectRedis()
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    startCronJobs()
  })
}

start()

export default app
