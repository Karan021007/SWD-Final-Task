import cron from 'node-cron'
import prisma from '../utils/prisma.js'
import { sendWarningEmail } from './emailService.js'
import { deleteCachePattern } from '../utils/redis.js'

export const checkExpiredBookings = async () => {
  const now = new Date()

  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED', 'READY'] },
      collectionDeadline: { lt: now },
    },
    include: { user: true },
  })

  for (const booking of expiredBookings) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'EXPIRED' },
    })

    const bookingItems = await prisma.bookingItem.findMany({
      where: { bookingId: booking.id },
    })

    for (const item of bookingItems) {
      await prisma.item.update({
        where: { id: item.itemId },
        data: { quantity: { increment: item.quantity } },
      })
    }

    await prisma.warning.create({
      data: {
        userId: booking.userId,
        reason: `Order not collected within the allowed time (Booking ID: ${booking.id})`,
      },
    })

    const updatedUser = await prisma.user.update({
      where: { id: booking.userId },
      data: { warningCount: { increment: 1 } },
    })

    sendWarningEmail(
      booking.userId,
      `Your order was not collected within the allowed time. This is warning ${updatedUser.warningCount} of 3.`
    )

    if (updatedUser.warningCount >= 3 && !booking.user.isBlocked) {
      await prisma.user.update({
        where: { id: booking.userId },
        data: { isBlocked: true },
      })

      await prisma.blockedUser.create({
        data: {
          userId: booking.userId,
          reason: 'Auto-blocked after 3 uncollected orders',
          isGlobal: true,
        },
      })
    }
  }

  if (expiredBookings.length > 0) {
    console.log(`Processed ${expiredBookings.length} expired bookings`)
  }
}

export const manageCampaigns = async () => {
  const now = new Date()

  const toActivate = await prisma.campaign.updateMany({
    where: {
      isActive: false,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    data: { isActive: true },
  })

  const toDeactivate = await prisma.campaign.updateMany({
    where: {
      isActive: true,
      endDate: { lt: now },
    },
    data: { isActive: false },
  })

  if (toActivate.count > 0 || toDeactivate.count > 0) {
    await deleteCachePattern('campaign:*')
    console.log(`Activated ${toActivate.count} and deactivated ${toDeactivate.count} campaigns`)
  }
}

export const startCronJobs = () => {
  cron.schedule('* * * * *', () => {
    checkExpiredBookings()
  })

  cron.schedule('* * * * *', () => {
    manageCampaigns()
  })

  console.log('Cron jobs started')
}
