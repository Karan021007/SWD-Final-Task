import { Router } from 'express'
import { body } from 'express-validator'
import { validate } from '../middleware/validation.js'
import prisma from '../utils/prisma.js'
import { AppError } from '../middleware/errorHandler.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: {id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hostel: true,
        warningCount: true,
        isBlocked: true,
        createdAt: true,
      },
  })

  if (!user) {
    throw new AppError('User not found', 404)
  }

  res.json({ user})
  } catch (error) {
    next(error)
  }
  })


router.post('/store-owner-request',
       authenticate,
       validate([
        body('storeName').notEmpty(). withMessage('Store name is required'),
        body('hostel').notEmpty().withMessage('Hostel is required'),
        body('roomNumber').notEmpty().withMessage('Room Number is required'),
        ]),
        async (req, res, next) => {
        try {
          const { storeName, hostel, roomNumber} = req.body
          const userId = req.user.id

          const existingRequest = await prisma.storeOwnerRequest.findUnique({
            where: { userId },
          })

          if (existingRequest) {
            throw new AppError('You already have a store owner request', 400)
          }

          const user = await prisma.user.findUnique({
            where: { id: userId},
          })

          if (user?.role === 'STORE_OWNER') {
            throw new AppError('You are already a store owner', 400)
          }

          const request = await prisma.storeOwnerRequest.create({
            data: {
              userId,
              storeName,
              hostel,
              roomNumber,
              status: 'pending',
            },
          })

          res.status(201).json({
            message: 'Store owner request submitted successfully',
          })
        } catch (error) {
          next(error)
        }
})


router.put(
  '/email-preferences',
  authenticate,
  validate([
    body('bookingNotifications').isBoolean().withMessage('bookingNotifications must be a boolean'),
    body('promotionalAlerts').isBoolean().withMessage('promotionAlerts must be a boolean'),
    body('newStoreNotifications').isBoolean().withMessage('newStoreNotifications must be a boolean'),
  ]),
    async (req, res, next) => {
      try {
        const { bookingNotifications, promotionalAlerts, newStoreNotifications} = req.body
        const userId = req.user.id

        const preferences = await prisma.emailPreference.upsert({
          where: { userId},
          update: {
            bookingNotifications,
            promotionalAlerts,
            newStoreNotifications,
          },
          create: {
            userId,
            bookingNotifications,
            promotionalAlerts,
            newStoreNotifications,
          },
        })

        res.json({
          message: 'Email preferenes updated successfully',
          preferences,
        })
      } catch (error) {
        next(error)
      }

})


router.get('/email-preferences', authenticate, async (req, res, next) => {
      try {
        const userId = req.user.id

        let preferences = await prisma.emailPreference.findUnique({
          where: { userId},
        })

        if (!preferences) {
          preferences = await prisma.emailPreference.create({
            data: {
              userId,
              bookingNotifications: true,
              promotionalAlerts: true,
              newStoreNotifications: true,
            },
          })
        }

        res.json({ preferences })
      } catch (error) {
        next(error)
      }

})


export default router
