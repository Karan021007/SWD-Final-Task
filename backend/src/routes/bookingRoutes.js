import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import prisma from '../utils/prisma.js'
import { AppError } from '../middleware/errorHandler.js'
import { sendBookingConfirmation, sendBookingConfirmed, sendCancellationNotification, sendCancellationRequestNotification, sendOrderReadyNotification } from '../services/emailService.js'

const router = Router()

router.post('/', authenticate, validate([
   body('storeId').notEmpty().withMessage('Store ID is required'),
   body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
   body('items.*.itemId').notEmpty().withMessage('Item ID is required'),
   body('items.*.quantity').isInt({ min: 1}).withMessage('Quantity must be atleast 1'),
   body('couponCode').optional().isString(),
 ]),
 async (req, res, next) => {
   try {
    const { storeId, items, couponCode } = req.body
    const userId = req.user.id

    const user = await prisma.user.findUnique({
       where: { id: userId },
    })

    if (user?.isBlocked) {
        throw new AppError('Your account is blocked from placing orders', 403)
    }

    const storeBlock = await prisma.blockedUser.findFirst({
      where: {
        userId,
        storeId,
      },
    })

    if ( storeBlock) {
       throw new AppError('You are blocked from ordering from this store', 403)
    }

    const store = await prisma.store.findUnique({
       where: { id: storeId },
    })

    if (!store || !store.isActive) {
        throw new AppError('Store not found or inactive', 404)
    }

    let total = 0
    const bookingItems = []

    for (const cartItem of items) {
       const item = await prisma.item.findUnique({
        where: { id: cartItem.itemId },
       })

      if ( !item) {
        throw new AppError(`Item ${cartItem.itemId} not found`, 404)
      }

      if (item.storeId !== storeId) {
        throw new AppError(`Item ${item.name} does not belong to this store`, 400)
      }

      if ( !item.isAvailable) {
        throw new AppError(`Item ${item.name} is not available`, 404)
      }

      if (item.quantity < cartItem.quantity) {
        throw new AppError(`Insufficient stock for ${item.name}`, 400)
      }

      const itemTotal = item.price * cartItem.quantity
      total += itemTotal

      bookingItems.push ({
          itemId: item.id,
          name: item.name,
          price: item.price,
          quantity: cartItem.quantity,
      })
   }

   let discount = 0
   if (couponCode) {
      const campaign = await prisma.campaign.findUnique({
        where: { couponCode },
      })
      if (!campaign || !campaign.isActive) {
        throw new AppError('Invalid or inactive coupon code', 400)
      }

      if (campaign.storeId !== storeId) {
        throw new AppError('Coupon is not valid for this store', 400)
      }

      const now = new Date()
      if (campaign.startDate > now || campaign.endDate < now) {
        throw new AppError('Coupon has expired', 400)
      }

     if (campaign.minOrderValue && total < campaign.minOrderValue) {
       throw new AppError(`Minimum Order Value of Rs${campaign.minOrderValue} required`, 400)
     }
     if (campaign.maxUsageCount && campaign.usageCount >= campaign.maxUsageCount) {
       throw new AppError('Coupon usage limit reached', 400)
     }
     if (campaign.maxUsagePerUser) {
       const userUsageCount = await prisma.couponUsage.count({
         where: {
           campaignId: campaign.id,
           userId,
         },
       })

       if  (userUsageCount >= campaign.maxUsagePerUser) {
           throw new AppError('You have reached the usage limit for this coupon', 400)
       }
     }

     if (campaign.discountType === 'PERCENTAGE') {
        discount = (total * campaign.discountValue) / 100
     } else {
        discount = campaign.discountValue
     }

     discount = Math.min(discount, total)
    }

    const finalTotal = total - discount

    const booking = await prisma.$transaction(async (tx) => {
       const newBooking = await tx.booking.create({
         data: {
            userId,
            storeId,
            total: finalTotal,
            status: 'PENDING',
            couponCode,
            discount,
            collectionDeadline: new Date(Date.now() + 5 * 60 * 1000),
          },
        })

        await tx.bookingItem.createMany({
          data: bookingItems.map((item) => ({
            bookingId: newBooking.id,
            ...item,
          })),
        })

        for (const cartItem of items) {
         await tx.item.update({
           where: { id: cartItem.itemId },
           data: { quantity: { decrement: cartItem.quantity } },
         })
        }

        if (couponCode) {
           const campaign = await tx.campaign.findUnique({
              where: { couponCode },
           })

           if (campaign) {
              await tx.couponUsage.create({
                data: {
                  campaignId: campaign.id,
                  userId,
                  bookingId: newBooking.id,
                },
              })

              await tx.campaign.update({
                where: { id: campaign.id },
                data: { usageCount: { increment: 1 } },
              })
            }
          }

          return newBooking
        })

        res.status(201).json({
           message: 'Booking created successfully',
           booking,
        })

        sendBookingConfirmation(userId, booking.id)
       } catch (error) {
         next(error)
       }
    }
 )


router.get('/user', authenticate, async (req, res, next) => {
  try {
     const userId = req.user.id
     const { status } = req.query

     const bookings = await prisma.booking.findMany({
       where: {
         userId,
         ...(status && { status }),
       },
       include: {
         store: {
           select: {
             id: true,
             name: true,
             hostel: true,
             roomNumber: true,
         },
       },
       items: true,
       cancellationRequest: true,
      },
      orderBy: {
       createdAt: 'desc',
      },
    })

    res.json({ bookings })
  } catch (error) {
    next(error)
   }
 })


router.get('/store/:storeId', authenticate, authorize('STORE_OWNER'), async (req, res, next) => {
  try {
     const { storeId } = req.params
     const ownerId = req.user.id
     const { status } = req.query

     const store = await prisma.store.findUnique({
       where: { id: storeId },
     })

     if (!store || store.ownerId !== ownerId) {
        throw new AppError('You do not own this store', 403)
     }

     const bookings = await prisma.booking.findMany({
       where: {
         storeId,
         ...(status && { status }),
       },
       include: {
         user: {
           select: {
             id: true,
             name: true,
             email: true,
             hostel: true,
         },
       },
       items: true,
       cancellationRequest: true,
      },
      orderBy: {
       createdAt: 'desc',
      },
    })

    res.json({ bookings })
  } catch (error) {
    next(error)
   }
 })

router.get('/:id', authenticate, async (req, res, next) => {
  try {
     const { id } = req.params
     const userId = req.user.id

     const booking = await prisma.booking.findUnique({
       where: { id },
       include: {
         store: true,
         user: true,
         items: true,
         cancellationRequest: true,
         },
       })

       if(!booking) {
         throw new AppError('Booking not found', 404)
       }

       const store = await prisma.store.findUnique({
         where: {id: booking.storeId },
       })

       const isOwner = store?.ownerId === userId
       const isCustomer = booking.userId === userId

       if (!isOwner && !isCustomer && req.user.role !== 'ADMIN') {
            throw new AppError('Unauthorized', 403)
       }

       res.json({ booking })
       } catch (error) {
          next(error)
     }
  })


router.post('/:id/cancel-request', authenticate, validate([body('reason').optional().isString()]), async (req, res, next) => {
  try {
     const { id } = req.params
     const { reason } = req.body
     const userId = req.user.id

     const booking = await prisma.booking.findUnique({
       where: { id },
       include: { cancellationRequest: true },
     })

     if (!booking) {
        throw new AppError('Booking not found', 404)
     }

     if (booking.userId !== userId) {
        throw new AppError('Unauthorized', 403)
     }

     if (booking.status === 'CANCELLED' || booking.status === 'COLLECTED') {
        throw new AppError('Cannot cancel this booking', 400)
     }

     if (booking.cancellationRequest) {
        throw new AppError('Cancellation request already exists', 400)
     }

     const cancellationRequest = await prisma.cancellationRequest.create({
       data: {
             bookingId: id,
             userId,
             reason,
             total: booking.total,
             status: 'REQUESTED',
         },
       })

       res.status(201).json({
         message: 'Cancellation request submitted',
         cancellationRequest,
       })

       sendCancellationRequestNotification(id)
     } catch (error) {
    next(error)
   }
 }
)


router.put('/:id/cancel-approve', authenticate, authorize('STORE_OWNER'), async (req, res, next) => {
   try {
     const { id } = req.params
     const ownerId = req.user.id

     const booking = await prisma.booking.findUnique({
       where: { id },
       include: {
         store: true,
         cancellationRequest: true,
         items: true,
       },
     })

     if (!booking) {
        throw new AppError('Booking not found', 404)
     }

     if (booking.store.ownerId !== ownerId) {
        throw new AppError('You do not own this store', 403)
     }

     if (!booking.cancellationRequest) {
        throw new AppError('No cancellation request found', 400)
     }

     if (booking.cancellationRequest.status !== 'REQUESTED') {
        throw new AppError('Cancellation request already processed', 400)
     }

       await prisma.$transaction(async (tx) => {
         await tx.cancellationRequest.update({
           where: { id: booking.cancellationRequest.id},
           data: { status: 'APPROVED' },
         })

           await tx.booking.update({
             where: { id },
             data: { status: 'CANCELLED' },
           })

           for (const item of booking.items) {
             await tx.item.update({
               where: { id: item.itemId },
               data: { quantity: {increment: item.quantity } },
             })
          }
        })

        res.json({
         message: 'Cancellation approved',
        })

        sendCancellationNotification(booking.userId, id, 'Approved')
     } catch (error) {
    next(error)
   }
 }
)

router.put('/:id/cancel-reject', authenticate, authorize('STORE_OWNER'), async (req, res, next) => {
   try {
     const { id } = req.params
     const ownerId = req.user.id

     const booking = await prisma.booking.findUnique({
       where: { id },
       include: {
         store: true,
         cancellationRequest: true,
       },
     })

     if (!booking) {
        throw new AppError('Booking not found', 404)
     }

     if (booking.store.ownerId !== ownerId) {
        throw new AppError('You do not own this store', 403)
     }

     if (!booking.cancellationRequest) {
        throw new AppError('No cancellation request found', 400)
     }

     if (booking.cancellationRequest.status !== 'REQUESTED') {
        throw new AppError('Cancellation request already processed', 400)
     }

       await prisma.cancellationRequest.update({
           where: { id: booking.cancellationRequest.id},
           data: { status: 'REJECTED' },
         })

        res.json({
         message: 'Cancellation rejected',
        })

        sendCancellationNotification(booking.userId, id, 'Rejected')
     } catch (error) {
    next(error)
   }
 }
)


router.put('/:id/status', authenticate, authorize('STORE_OWNER'), validate([body('status').isIn(['CONFIRMED', 'READY', 'COLLECTED']).withMessage('Invalid status')]),
async (req, res, next) => {
   try {
     const { id } = req.params
     const { status } = req.body
     const ownerId = req.user.id

     const booking = await prisma.booking.findUnique({
       where: { id },
       include: {
         store: true,
       },
     })

     if (!booking) {
        throw new AppError('Booking not found', 404)
     }

     if (booking.store.ownerId !== ownerId) {
        throw new AppError('You do not own this store', 403)
     }

       const validTransitions = {
         PENDING: ['CONFIRMED', 'CANCELLED'],
         CONFIRMED: ['READY', 'CANCELLED'],
         READY: ['COLLECTED', 'CANCELLED'],
       }

       if (!validTransitions[booking.status]?.includes(status)) {
          throw new AppError(`Cannot transition from ${booking.status} to ${status}`, 400)
       }

       const updatedBooking = await prisma.booking.update({
           where: { id },
           data: { status },
       })

        res.json({
         message: 'Booking status updated',
         booking: updatedBooking,
        })

        if (status === 'CONFIRMED') sendBookingConfirmed(booking.userId, id)
        if (status === 'READY') sendOrderReadyNotification(booking.userId, id)
     } catch (error) {
    next(error)
   }
 }
)

export default router
