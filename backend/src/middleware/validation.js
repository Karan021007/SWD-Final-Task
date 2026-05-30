import { validationResult } from 'express-validator'
import { AppError } from './errorHandler.js'

export const validate = (validation) => {
   return async (req, res, next) => {
      await Promise.all(validation.map((v) => v.run(req)))

      const errors = validationResult(req)
      if (errors.isEmpty()) {
        return next()
      }

      const errorMessages = errors.array().map((error) => error.msg).join(', ')
      next(new AppError(errorMessages, 400))
    }
}
