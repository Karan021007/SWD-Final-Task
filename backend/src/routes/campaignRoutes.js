import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import prisma from '../utils/prisma.js'
import { AppError } from '../middleware/errorHandler.js'
import { getCache, setCache, deleteCachePattern } from '../utils/redis.js'
import { sendCampaignNotification } from '../services/emailService.js'

const router = Router()

const generateCouponCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

router.get('/active', async (req, res, next) => {
  try {
    const cacheKey = 'campaign:active'

    const cachedCampaigns = await getCache(cacheKey)
    if (cachedCampaigns) {
      return res.json({ campaigns: cachedCampaigns, fromCache: true})
    }

    const now = new Date()

    const campaigns = await prisma.campaign.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: {gte: now},
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            hostel: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    await setCache(cacheKey, campaigns, 300)

    res.json({ campaigns })
  } catch (error) {
    next(error)
  }

})

router.get('/store/:storeId', async (req, res, next) => {
 try {
  const { storeId } = req.params
  const { activeOnly } = req.query

  const now = new Date()

  const campaigns = await prisma.campaign.findMany({
    where: {
      storeId,
      ...(activeOnly === 'true' && {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      }),
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

   res.json({ campaigns })
 }catch (error) {
    next(error)
  }

})

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            hostel: true,
          },
        },
        _count: {
          select: {
            couponUsages: true,
          },
        },
      },
    })

    if (!campaign) {
      throw new AppError('Campaign not found', 404)
    }

    res.json({ campaign })
  } catch (error) {
    next(error)
  }

})

router.post('/',
  authenticate,
  authorize('STORE_OWNER'),
  validate([
    body('name').notEmpty().withMessage('Campaign name is required'),
    body('description').optional().isString(),
    body('discountType').isIn(['PERCENTAGE', 'FLAT']).withMessage('Invalid discount type'),
    body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be positive'),
    body('minOrderValue').optional().isFloat({ min: 0 }),
    body('maxUsageCount').optional().isInt({ min: 1 }),
    body('maxUsagePerUser').optional().isInt({ min: 1 }),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
  ]),
    async (req, res, next) => {
      try {
        const {
          name,
          description,
          discountType,
          discountValue,
          minOrderValue,
          maxUsageCount,
          maxUsagePerUser,
          startDate,
          endDate,
        } = req.body
        const ownerId = req.user.id

        const store = await prisma.store.findUnique({
          where: { ownerId },
        })

        if (!store) {
          throw new AppError('You do not own any store', 404)
        }

        const start = new Date(startDate)
        const end = new Date(endDate)

        if (end <= start) {
          throw new AppError('End date must be after start date', 400)
        }

        if (discountType === 'PERCENTAGE' && discountValue > 100) {
          throw new AppError('Percentage discount cannot exceed 100%', 400)
        }

        let couponCode = generateCouponCode()
        let existingCoupon = await prisma.campaign.findUnique({
          where: { couponCode},
        })

        while (existingCoupon) {
          couponCode = generateCouponCode()
          existingCoupon = await prisma.campaign.findUnique({
            where: { couponCode },
          })
        }

        const now = new Date()

        const campaign = await prisma.campaign.create({
          data: {
            storeId: store.id,
            name,
            description,
            couponCode,
            discountType,
            discountValue: parseFloat(discountValue),
            minOrderValue: minOrderValue ? parseFloat(minOrderValue) : null,
            maxUsageCount: maxUsageCount ? parseInt(maxUsageCount) : null,
            maxUsagePerUser: maxUsagePerUser ? parseInt(maxUsagePerUser) : null,
            startDate: start,
            endDate: end,
            isActive: start <= now,
          },
        })

        await deleteCachePattern('campaign:*')

        res.status(201).json({
          message: 'Campaign created successfully',
          campaign,
        })

        if (start <= now && end >= now) {
          prisma.emailPreference.findMany({
            where: { promotionalAlerts: true },
            include: { user: true },
          }).then(preferences => {
            for (const pref of preferences) {
              sendCampaignNotification(pref.userId, campaign.id)
            }
          }).catch(err => console.error('Campaign notification error:', err))
        }
      } catch (error) {
         next(error)
     }

})

router.put(
  '/:id',
  authenticate,
  authorize('STORE_OWNER'),
  validate([
    body('name').optional().notEmpty(),
    body('description').optional().isString(),
    body('discountType').optional().isIn(['PERCENTAGE', 'FLAT']),
    body('discountValue').optional().isFloat({ min: 0 }),
    body('minOrderValue').optional().isFloat({ min: 0 }),
    body('maxUsageCount').optional().isInt({ min: 1 }),
    body('maxUsagePerUser').optional().isInt({ min: 1 }),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ]),
    async (req, res, next) => {
      try {
        const { id } = req.params
        const ownerId = req.user.id
        const updateData = req.body

        const campaign = await prisma.campaign.findUnique({
          where: { id },
          include: { store: true },
        })

        if (!campaign) {
          throw new AppError('Campaign not found', 404)
        }

        if (campaign.store.ownerId !== ownerId) {
          throw new AppError('You do not own this campaign', 403)
        }

        if(updateData.discountType === 'PERCENTAGE' && updateData.discountValue > 100) {
          throw new AppError('Percentage discount cannot exceed 100%', 400)
        }

        if (updateData.startDate && updateData.endDate) {
          const start = new Date(updateData.startDate)
          const end = new Date(updateData.endDate)

          if (end <= start) {
           throw new AppError('End date must be after start date', 400)
          }
       }

        const updatedCampaign = await prisma.campaign.update({
          where: { id },
          data: {
            ...(updateData.name && {name: updateData.name}),
            ...(updateData.description !== undefined && {description: updateData.description}),
            ...(updateData.discountType && {discountType: updateData.discountType}),
            ...(updateData.discountValue && {discountValue: parseFloat(updateData.discountValue) }),
            ...(updateData.minOrderValue !== undefined  && {minOrderValue: updateData.minOrderValue ? parseFloat(updateData.minOrderValue) : null }),
            ...(updateData.maxUsageCount !== undefined  && {maxUsageCount: updateData.maxUsageCount ? parseInt(updateData.maxUsageCount) : null }),
            ...(updateData.maxUsagePerUser !== undefined  && {maxUsagePerUser: updateData.maxUsagePerUser ? parseInt(updateData.maxUsagePerUser) : null }),
            ...(updateData.startDate && { startDate: new Date(updateData.startDate) }),
            ...(updateData.endDate && { endDate: new Date(updateData.endDate) }),
          },
        })

        await deleteCachePattern('campaign:*')

        res.json({
          message: 'Campaign updated successfully',
          campaign: updatedCampaign,
         })
      } catch (error) {
         next(error)
     }

})

router.delete('/:id', authenticate, authorize('STORE_OWNER'), async (req, res, next) => {
  try {
      const { id } = req.params
      const ownerId = req.user.id

      const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: { store: true },
      })

      if (!campaign) {
        throw new AppError('Campaign not found', 404)
      }

      if (campaign.store.ownerId !== ownerId) {
        throw new AppError('You do not own this campaign', 403)
      }

      await prisma.campaign.delete({
        where: { id },
      })

        await deleteCachePattern('campaign:*')

        res.json({
          message: 'Campaign deleted successfully',
        })
      } catch (error) {
         next(error)
     }
})

router.post(
  '/validate',
  authenticate,
  validate([
    body('couponCode').notEmpty().withMessage('Coupon code is required'),
    body('storeId').notEmpty().withMessage('Store ID is required'),
    body('orderTotal').isFloat({ min: 0 }).withMessage('Order total must be positive'),
  ]),
  async (req, res, next) => {
   try {
    const { couponCode, storeId, orderTotal } = req.body
    const userId = req.user.id

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

    if (campaign.minOrderValue && parseFloat(orderTotal) < campaign.minOrderValue) {
      throw new AppError(`Minimum order value of Rs${campaign.minOrderValue} required`, 400)
    }

    if (campaign.maxUsageCount && campaign.usageCount >= campaign.maxUsageCount) {
      throw new AppError('Coupon usage limit reached', 400)
    }

    if (campaign.maxUsagePerUser ) {
      const userUsageCount = await prisma.couponUsage.count({
        where: {
          campaignId: campaign.id,
          userId,
        },
      })

      if (userUsageCount >= campaign.maxUsagePerUser) {
        throw new AppError('You have reached the usage limit for this coupon', 400)
      }
    }

    let discount = 0
    if (campaign.discountType === 'PERCENTAGE') {
      discount = (parseFloat(orderTotal) * campaign.discountValue) / 100
    } else{
      discount = campaign.discountValue
    }

    discount = Math.min(discount, parseFloat(orderTotal))

    res.json({
      valid: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        discountType: campaign.discountType,
        discountValue: campaign.discountValue,
      },
      discount,
      finalTotal: parseFloat(orderTotal) - discount,
    })
   } catch (error) {
    next(error)
   }
 }
)

export default router
