export class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = (err, req, res, next) => {
   if (err instanceof AppError) {
       return res.status(err.statusCode).json({
         status: 'error',
         message: err.message,
       })
   }

   console.error('ERROR:', err)

   return res.status(500).json({
     status: 'error',
     message: 'Internal server error',
   })
}
