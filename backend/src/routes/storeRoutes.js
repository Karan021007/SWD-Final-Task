import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { validate } from '../middleware/validation.js'
import prisma from '../utils/prisma.js'
import { AppError } from '../middleware/errorHandler.js'
import { getCache, setCache, deleteCachePattern } from '../utils/redis.js'
import { sendNewStoreNotification } from '../services/emailService.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try{
    const { hostel} = req.query

    const cacheKey = hostel ? `stores:hostel:${hostel}` : 'stores:all'

    const cachedStores = await getCache(cacheKey)
    if (cachedStores) {
      return res.json({ stores: cachedStores, fromCache: true})
    }

    const stores = await prisma.store.findMany({
      where: {
        isActive: true,
        ...(hostel && {hostel}),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
  })

  await setCache(cacheKey, stores, 3600)

  res.json({ stores})
  } catch (error) {
    next(error)
  }

})

router.get('/owner/my-store', authenticate, authorize('STORE_OWNER'), async (req, res, next) => {
   try {
    const ownerId = req.user.id

    const store = await prisma.store.findUnique({
      where: { ownerId },
      include: {
        items: true,
        campaigns: true,
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    })

    if(!store) {
        throw new AppError('You do not own a store', 404)
      }

      res.json({ store})
   } catch (error) {
    next(error)
   }
})

router.get('/:id', async (req, res, next) => {
   try {
    const { id} = req.params

    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
          items: {
            where: {
              isAvailable: true,
            },
          },
          campaigns: {
            where: {
              isActive: true,
            },
          },
        },
      })

      if(!store) {
        throw new AppError('Store not found', 404)
      }

      res.json({ store})
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
  body('name').notEmpty().withMessage('Store name is required'),
  body('hostel').notEmpty().withMessage('Hostel is required'),
  body('roomNumber').notEmpty().withMessage('roomNumber is required'),
  body('description').notEmpty().withMessage('Description is required'),
 ]),
 async (req, res, next) => {
   try {
    const { name, description, hostel, roomNumber} = req.body
    const ownerId = req.user.id
    const image = req.file ? `/uploads/${req.file.filename}` : undefined

    const existingStore = await prisma.store.findFirst({
      where: {ownerId},
    })

    if(existingStore) {
      throw new AppError('You already own a store', 400)
    }

    const store = await prisma.store.create({
      data: {
        name,
        description,
        hostel,
        roomNumber,
        image,
        ownerId,
        isActive: true,
      },
    })

    await deleteCachePattern('stores:*')

    await sendNewStoreNotification(store.id)

    res.status(201).json({
      message: 'Store created successfully',
      store,
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
  body('name').optional().notEmpty().withMessage('Store name cannot be empty'),
  body('hostel').optional().notEmpty().withMessage('Hostel cannot be empty'),
  body('roomNumber').optional().notEmpty().withMessage('roomNumber cannot be empty'),
  body('description').optional().isString(),
  body('isActive').optional().isBoolean(),
 ]),
 async (req, res, next) => {
   try {
    const { id } = req.params
    const { name, description, hostel, roomNumber, isActive } = req.body
    const ownerId = req.user.id
    const image = req.file ? `/uploads/${req.file.filename}` : undefined

    const store = await prisma.store.findUnique({
      where: {id},
    })

    if(!store) {
      throw new AppError('Store not found', 404)
    }

    if (store.ownerId !== ownerId) {
      throw new AppError('You do not own this store', 403)
    }

    const updatedStore = await prisma.store.update({
      where: { id },
      data: {
        ...(name && {name}),
        ...(description !== undefined && { description }),
        ...(hostel && {hostel}),
        ...(roomNumber && {roomNumber}),
        ...(image && {image}),
        ...(isActive !== undefined && { isActive }),
      },
    })

    await deleteCachePattern('stores:*')

    res.json({
      message: 'Store updated successfully',
      store: updatedStore,
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

    const store = await prisma.store.findUnique({
      where: {id},
    })

    if(!store) {
      throw new AppError('Store not found', 404)
    }

    if (store.ownerId !== ownerId) {
      throw new AppError('You do not own this store', 403)
    }

    await prisma.store.delete({
      where: { id },
    })

    await deleteCachePattern('stores:*')

    res.json({
      message: 'Store deleted successfully',
    })
   } catch (error) {
    next(error)
   }
 }
)


export default router
