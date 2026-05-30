import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import prisma from '../utils/prisma.js'
import { AppError } from '../middleware/errorHandler.js'
import { getCache, setCache } from '../utils/redis.js'

const router = Router()

router.get('/store/:storeId', authenticate, authorize('STORE_OWNER'), async (req, res, next) => {
 try {
    const { storeId } = req.params
    const ownerId = req.user.id

    const store = await prisma.store.findUnique({
      where: { id: storeId},
    })

    if(!store || store.ownerId !== ownerId) {
      throw new AppError(' You do not own this store', 403)
    }

    const cacheKey = `analytics:store:${storeId}`

    const cachedAnalytics = await getCache(cacheKey)
    if (cachedAnalytics) {
      return res.json({ analytics: cachedAnalytics, fromCache: true})
    }

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const allBookings = await prisma.booking.findMany({
      where: {
        storeId,
        status: { in: ['CONFIRMED', 'READY', 'COLLECTED']},
      },
      include: {
        items: true,
      },
    })

    const totalRevenue = allBookings.reduce((sum, booking) => sum + booking.total, 0)

    const weeklyBookings = allBookings.filter(
      (booking) => new Date(booking.createdAt) >= weekAgo
    )
    const weeklyRevenue = weeklyBookings.reduce((sum, booking) => sum + booking.total, 0)

    const monthlyBookings = allBookings.filter(
      (booking) => new Date(booking.createdAt) >= monthAgo
    )
    const monthlyRevenue = monthlyBookings.reduce((sum, booking) => sum + booking.total, 0)

    const itemSales = {}

    allBookings.forEach((booking) => {
      booking.items.forEach((item) => {
        if (!itemSales[item.itemId]) {
          itemSales[item.itemId] = {
          name: item.name,
          count: 0,
          revenue: 0,
        }
      }
      itemSales[item.itemId].count += item.quantity
      itemSales[item.itemId].revenue += item.price * item.quantity
      })
    })

    const sortedItems = Object.entries(itemSales).sort((a, b) => b[1].count - a[1].count)
    const mostSoldItem = sortedItems.length > 0 ? { itemId: sortedItems[0][0], ...sortedItems[0][1] } : null
    const leastSoldItem = sortedItems.length > 0 ? { itemId: sortedItems[sortedItems.length - 1][0], ...sortedItems[sortedItems.length - 1][1] } : null

    const bookingStats = {
      total: allBookings.length,
      weekly: weeklyBookings.length,
      monthly: monthlyBookings.length,
      byStatus: {
        pending: await prisma.booking.count({ where: { storeId, status: 'PENDING'}}),
        confirmed: await prisma.booking.count({ where: { storeId, status: 'CONFIRMED'}}),
        ready: await prisma.booking.count({ where: { storeId, status: 'READY'}}),
        collected: await prisma.booking.count({ where: { storeId, status: 'COLLECTED'}}),
        cancelled: await prisma.booking.count({ where: { storeId, status: 'CANCELLED'}}),
        expired: await prisma.booking.count({ where: { storeId, status: 'EXPIRED'}}),
      },
    }

    const lowStockItems = await prisma.item.findMany({
      where: {
        storeId,
        quantity: { lt: 10},
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        price: true,
      },
    })

    const monthlyBreakdown = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() -i + 1, 0)

      const monthBookings = allBookings.filter((booking) => {
        const bookingDate = new Date(booking.createdAt)
        return bookingDate >= monthStart && bookingDate <= monthEnd
      })

      const monthRevenue = monthBookings.reduce((sum, booking) => sum + booking.total, 0)

      monthlyBreakdown.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric'}),
        revenue: monthRevenue,
        bookings: monthBookings.length,
      })
    }

    const analytics = {
      revenue: {
        total: totalRevenue,
        weekly: weeklyRevenue,
        monthly: monthlyRevenue,
        monthlyBreakdown,
      },
      bookings: bookingStats,
      items: {
        mostSold: mostSoldItem,
        leastSold: leastSoldItem,
        lowStock: lowStockItems,
      },
    }

    await setCache(cacheKey, analytics, 600)

    res.json({ analytics})
 } catch (error) {
  next(error)
 }
})

router.get('/user', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id

    const cacheKey = `analytics:user:${userId}`

    const cachedAnalytics = await getCache(cacheKey)
    if (cachedAnalytics) {
      return res.json({analytics: cachedAnalytics, fromCache: true})
    }

    const allBookings = await prisma.booking.findMany({
      where: {
        userId,
        status: { in: ['CONFIRMED', 'READY', 'COLLECTED'] },
      },
      include: {
        items: true,
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const totalSpending = allBookings.reduce((sum, booking) => sum + booking.total, 0)

    const totalBookings = allBookings.length

    const storeCounts = {}
    allBookings.forEach((booking) => {
      if (!storeCounts[booking.storeId]) {
        storeCounts[booking.storeId] = {
          name: booking.store.name,
          count: 0,
          spending: 0,
        }
      }
      storeCounts[booking.storeId].count++
      storeCounts[booking.storeId].spending += booking.total
    })

    const sortedStores = Object.entries(storeCounts).sort((a,b) => b[1].count - a[1].count)
    const mostFrequentStore = sortedStores.length > 0
      ? { storeId: sortedStores[0][0], ...sortedStores[0][1] }
      : null

    const itemCounts = {}
    allBookings.forEach((booking) => {
      booking.items.forEach((item) => {
        if (!itemCounts[item.itemId]) {
          itemCounts[item.itemId] = {
            name: item.name,
            count: 0,
          }
        }
        itemCounts[item.itemId].count += item.quantity
      })
    })

    const sortedItems = Object.entries(itemCounts).sort((a,b) => b[1].count - a[1].count)
    const mostFrequentItem = sortedItems.length > 0
      ? { itemId: sortedItems[0][0], ...sortedItems[0][1] }
      : null

    const now = new Date()
    const monthlyBreakdown = []

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() -i + 1, 0)

      const monthBookings = allBookings.filter((booking) => {
        const bookingDate = new Date(booking.createdAt)
        return bookingDate >= monthStart && bookingDate <= monthEnd
      })

      const monthSpending = monthBookings.reduce((sum, booking) => sum + booking.total, 0)

      monthlyBreakdown.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric'}),
        spending: monthSpending,
        bookings: monthBookings.length,
      })
    }

    const warnings = await prisma.warning.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc'},
      take: 5,
    })

    const bookingsByStatus = {
        pending: await prisma.booking.count({ where: { userId, status: 'PENDING'}}),
        confirmed: await prisma.booking.count({ where: { userId, status: 'CONFIRMED'}}),
        ready: await prisma.booking.count({ where: { userId, status: 'READY'}}),
        collected: await prisma.booking.count({ where: { userId, status: 'COLLECTED'}}),
        cancelled: await prisma.booking.count({ where: { userId, status: 'CANCELLED'}}),
        expired: await prisma.booking.count({ where: { userId, status: 'EXPIRED'}}),
    }

    const analytics = {
      spending: {
        total: totalSpending,
        monthlyBreakdown,
      },
      bookings: {
        total: totalBookings,
        byStatus: bookingsByStatus,
      },
      favorites: {
        store: mostFrequentStore,
        item: mostFrequentItem,
      },
      warnings: warnings,
    }

    await setCache(cacheKey, analytics, 600)

    res.json({ analytics })
  } catch (error) {
  next(error)
 }
})

export default router
