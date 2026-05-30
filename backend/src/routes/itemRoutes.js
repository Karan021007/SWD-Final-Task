import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { validate } from '../middleware/validation.js'
import prisma from '../utils/prisma.js'
import { AppError } from '../middleware/errorHandler.js'
import { deleteCachePattern } from '../utils/redis.js'
import { uploadToCloudinary } from '../utils/cloudinary.js'


const router = Router()

router.get('/store/:storeId', async (req, res, next) => {
  try {
    const { storeId} = req.params
    const { availableOnly } = req.query

    const items = await prisma.item.findMany({
        where: {
            storeId,
            ...(availableOnly === 'true' && { isAvailable: true, quantity: { gt: 0 } }),
        },
        orderBy: {
            createdAt: 'desc',
        },
    })

    res.json({ items})
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const item = await prisma.item.findUnique({
        where: { id },
        include: {
            store: {
                select: {
                id: true,
                name: true,
                hostel: true,
                },
            },
        },
    })

    if (!item) {
        throw new AppError('Item not found', 404)
    }

    res.json({ item})
  } catch (error) {
    next(error)
  }
})

router.post(
 '/',
 authenticate,
 authorize('STORE_OWNER'),
 upload.single('image'),
 validate([
  body('storeId').notEmpty().withMessage('Store ID is required'),
  body('name').notEmpty().withMessage('Item Name is required'),
  body('price').isFloat({ min: 0}).withMessage('Price must be a positive number'),
  body('quantity').isInt({ min: 0}).withMessage('Quantity must be a non-negative integer'),
  body('description').optional().isString(),
 ]),
 async (req, res, next) => {
   try {
    const { storeId, name, description, price, quantity} = req.body
    const ownerId = req.user.id
    const image = req.file ? await uploadToCloudinary(req.file.buffer, 'munchies/items') : undefined

    const store = await prisma.store.findUnique({
      where: { id: storeId},
    })

    if(!store) {
      throw new AppError('Store not found', 404)
    }

    if (store.ownerId !== ownerId) {
        throw new AppError('You do not own this store', 403)
    }

    const item = await prisma.item.create({
      data: {
        storeId,
        name,
        description,
        price: parseFloat(price),
        quantity:parseInt(quantity),
        image,
        isAvailable: true,
      },
    })

    await deleteCachePattern('stores:*')

    res.status(201).json({
      message: 'Item created successfully',
      item,
    })
   } catch (error) {
    next(error)
   }
 }
)

router.put(
 '/:id',
 authenticate,
 authorize('STORE_OWNER'),
 upload.single('image'),
 validate([
  body('name').optional().notEmpty().withMessage('Item Name cannot be empty'),
  body('price').optional().isFloat({ min: 0}).withMessage('Price must be a positive number'),
  body('quantity').optional().isInt({ min: 0}).withMessage('Quantity must be a non-negative integer'),
  body('description').optional().isString(),
  body('isAvailable').optional().isBoolean(),
 ]),
 async (req, res, next) => {
   try {
    const { id } = req.params
    const { name, description, price, quantity, isAvailable, removeImage } = req.body
    const ownerId = req.user.id
    const image = req.file
      ? await uploadToCloudinary(req.file.buffer, 'munchies/items')
      : removeImage === 'true' ? null : undefined

    const item = await prisma.item.findUnique({
      where: {id},
      include: { store: true},
    })

    if(!item) {
      throw new AppError('Item not found', 404)
    }

    if (item.store.ownerId !== ownerId) {
      throw new AppError('You do not own this store', 403)
    }

    const updatedItem = await prisma.item.update({
      where: { id },
      data: {
        ...(name && {name}),
        ...(description !== undefined && { description }),
        ...(price && { price: parseFloat(price)}),
        ...(quantity !== undefined && { quantity: parseInt(quantity)}),
        ...(image !== undefined && { image }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
    })

    res.json({
      message: 'Item updated successfully',
      item: updatedItem,
    })
   } catch (error) {
    next(error)
   }
 }
)

router.delete('/:id',
 authenticate,
 authorize('STORE_OWNER'),
 async (req, res, next) => {
  try {
    const { id } = req.params
    const ownerId = req.user.id

    const item = await prisma.item.findUnique({
      where: {id},
      include: { store: true},
    })

    if(!item) {
      throw new AppError('Item not found', 404)
    }

    if (item.store.ownerId !== ownerId) {
      throw new AppError('You do not own this store', 403)
    }

    await prisma.item.delete({
      where: { id },
    })

    await deleteCachePattern('stores:*')

    res.json({
      message: 'Item deleted successfully',
    })
   } catch (error) {
    next(error)
   }
 }
)

export default router
