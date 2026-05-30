import multer from 'multer'
import path from 'path'
import { AppError } from './errorHandler.js'

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)
  if (mimetype && extname) return cb(null, true)
  cb(new AppError('Only image files allowed', 400))
}

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'),
  },
})
