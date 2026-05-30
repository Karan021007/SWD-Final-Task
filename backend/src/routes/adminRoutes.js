import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import prisma from '../utils/prisma.js'
import { AppError } from '../middleware/errorHandler.js'
import { sendStoreRequestDecision, sendNewStoreNotification, sendWarningEmail } from '../services/emailService.js'

const router = Router()

router.get('/store-requests', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
   const { status } = req.query

   const requests =  await prisma.storeOwnerRequest.findMany({
     where: {
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
     },
     orderBy: {
       createdAt: 'desc',
     },
   })
  res.json({ requests})
  } catch (error) {
    next(error)
  }
})

router.put('/store-requests/:id/approve', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params

    const request = await prisma.storeOwnerRequest.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!request) throw new AppError('Store owner request not found', 404)
    if (request.status !== 'pending') throw new AppError('Request has already been processed', 400)

    const store = await prisma.$transaction(async (tx) => {
      await tx.storeOwnerRequest.update({
        where: { id },
        data: { status: 'approved' },
      })

      await tx.user.update({
        where: { id: request.userId },
        data: { role: 'STORE_OWNER' },
      })

      return tx.store.create({
        data: {
          name: request.storeName,
          hostel: request.hostel,
          roomNumber: request.roomNumber,
          ownerId: request.userId,
          isActive: true,
        },
      })
    })

    sendStoreRequestDecision(request.userId, true, request.storeName)
    sendNewStoreNotification(store.id)

    res.json({ message: 'Store owner request approved and store created' })
  } catch (error) {
    next(error)
  }
})

router.put('/store-requests/:id/reject', authenticate, authorize('ADMIN'), validate([body('reason').optional().isString()]), async (req, res, next) => {
  try {
    const { id } = req.params
    const { reason} = req.body

    const request = await prisma.storeOwnerRequest.findUnique({
      where: {id},
    })
    if (!request) {
      throw new AppError('Store owner request not found', 404)
    }
    if (request.status !== 'pending') {
      throw new AppError('Request has already been processed', 400)
    }

    await prisma.storeOwnerRequest.update({
      where: { id },
      data: { status: 'rejected' },
    })

    sendStoreRequestDecision(request.userId, false, request.storeName)

    res.json({ message: 'Store owner request rejected' })
  } catch(error) {
    next(error)
  }
})

router.get('/users', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { role, isBlocked } = req.query

    const users = await prisma.user.findMany({
      where: {
        ...(role && { role }),
        ...(isBlocked !== undefined && { isBlocked: isBlocked === 'true'}),
      },
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
        users
    })
  } catch(error) {
    next(error)
  }
})

router.get('/users/:userId', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { userId } = req.params

    const user = await prisma.user.findUnique({
      where: {id: userId},
      include: {
        warnings: {
          orderBy: {createdAt: 'desc'},
        },
        blockedStores: {
          include: {
            store: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        bookings: {
          orderBy: { createdAt: 'desc'},
          take: 10,
        },
      },
    })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    res.json({ user })
  } catch(error) {
    next(error)
  }
})


router.post('/users/:userId/block', authenticate, authorize('ADMIN'), validate([body('storeId').optional().isString(), body('reason').optional().isString(), body('isGlobal').optional().isBoolean()]), async (req, res, next) => {
  try {
    const { userId} = req.params
    const { storeId, reason, isGlobal = true} = req.body

    const user = await prisma.user.findUnique({
      where: {id: userId},
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    if (isGlobal) {
      await prisma.user.update({
        where: { id: userId},
        data: { isBlocked: true},
      })

      await prisma.blockedUser.create({
        data: {
          userId,
          reason,
          isGlobal: true,
        },
      })
    } else {
      if (!storeId) {
        throw new AppError('Store ID is required for store-specific block', 400)
      }

      const store = await prisma.store.findUnique({
        where: {id: storeId},
      })

      if(!store) {
        throw new AppError('Store not found', 404)
      }

      const existingBlock = await prisma.blockedUser.findUnique({
        where: {
          userId_storeId: {
            userId,
            storeId,
          },
        },
      })

      if (existingBlock) {
        throw new AppError('User is already blocked for this store', 400)
      }

      await prisma.blockedUser.create({
        data: {
          userId,
          storeId,
          reason,
          isGlobal: false,
        }
      })
    }

    res.json({
      message: isGlobal ? 'User blocked globally' : 'User blocked from store',
    })
  } catch (error) {
    next(error)
  }
})

router.post('/users/:userId/unblock', authenticate, authorize('ADMIN'), validate([body('storeId').optional().isString()]), async (req, res, next) => {
  try {
    const { userId} = req.params
    const { storeId } = req.body

    const user = await prisma.user.findUnique({
      where: {id: userId},
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    if (storeId) {
      const block = await prisma.blockedUser.findUnique({
        where: {
          userId_storeId: {
            userId,
            storeId,
          },
        },
      })

      if(!block) {
        throw new AppError('User is not blocked from this store', 400)
      }

      await prisma.blockedUser.delete({
        where: {
          userId_storeId: {
            userId,
            storeId,
          },
        },
      })

      res.json({
        message: 'User unblocked from store',
      })
    } else {
      await prisma.user.update({
        where: {id: userId},
        data: { isBlocked: false},
      })

      await prisma.blockedUser.deleteMany({
        where: { userId, isGlobal: true},
      })

      res.json({
        message: 'User unblocked globally',
      })
    }
  } catch (error) {
    next(error)
  }
})

router.get('/warnings', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const warnings = await prisma.warning.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, hostel: true, warningCount: true, isBlocked: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ warnings })
  } catch (error) {
    next(error)
  }
})

router.get('/blocked', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const blocks = await prisma.blockedUser.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, hostel: true, warningCount: true, isBlocked: true },
        },
        store: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ blocks })
  } catch (error) {
    next(error)
  }
})

router.post('/users/:userId/warn', authenticate, authorize('ADMIN'), validate([body('reason').optional().isString()]), async (req, res, next) => {
  try {
    const { userId } = req.params
    const { reason = 'Manual warning issued by admin' } = req.body

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new AppError('User not found', 404)

    await prisma.warning.create({ data: { userId, reason } })

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { warningCount: { increment: 1 } },
    })

    if (updated.warningCount >= 3 && !user.isBlocked) {
      await prisma.user.update({ where: { id: userId }, data: { isBlocked: true } })
      await prisma.blockedUser.create({ data: { userId, reason: 'Auto-blocked after 3 warnings', isGlobal: true } })
    }

    sendWarningEmail(userId, reason)

    res.json({ message: 'Warning issued', warningCount: updated.warningCount })
  } catch (error) {
    next(error)
  }
})

router.post('/users/:userId/reset-warnings', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const {userId } = req.params

    const user = await prisma.user.findUnique({
      where: { id: userId},
    })

    if(!user) {
      throw new AppError ('user not found', 404)
    }

    await prisma.user.update({
      where: {id: userId},
      data: {warningCount: 0 },
    })

    res.json({
      message: 'User warnings reset successfully',
    })

  } catch (error) {
    next(error)
  }
})

router.get('/stats', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalStores,
      totalBookings,
      pendingRequests,
      blockedUsers,
      activeStores,
      activeCampaigns,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.store.count(),
        prisma.booking.count(),
        prisma.storeOwnerRequest.count({ where: { status: 'pending'}}),
        prisma.user.count({where: { isBlocked: true}}),
        prisma.store.count({where: { isActive: true}}),
        prisma.campaign.count({ where: { isActive: true}}),
      ])

      const stats = {
        totalUsers,
        totalStores,
        activeStores,
        totalBookings,
        pendingRequests,
        blockedUsers,
        activeCampaigns,
      }

        res.json({ stats })

  } catch (error) {
    next(error)
  }
})

export default router
