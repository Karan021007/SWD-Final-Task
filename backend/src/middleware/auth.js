import jwt from 'jsonwebtoken'
import { AppError } from './errorHandler.js'

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      throw new AppError('Authentication required', 401)
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = decoded
    next()
   } catch (error) {
     next(new AppError('Invalid or expired token', 401))
   }
 }

 export const authorize = (...roles) => {
   return (req, res, next) => {
     if (!req.user) {
       return next(new AppError('Authentication required', 401))
     }

     if (!roles.includes(req.user.role)) {
       return next(new AppError('Insufficient permissions', 403))
     }

     next()
    }
  }
