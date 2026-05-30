import nodemailer from 'nodemailer'
import prisma from '../utils/prisma.js'

let _transporter = null

async function getTransporter() {
  if (_transporter) return _transporter

  if (process.env.EMAIL_HOST) {
    _transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    })
    console.log(`📧 Email configured via ${process.env.EMAIL_HOST}`)
  } else {
    const account = await nodemailer.createTestAccount()
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: account.user, pass: account.pass },
    })
    console.log('\n📬 No EMAIL_HOST found — using Ethereal test SMTP')
    console.log(`   View sent emails at: https://ethereal.email/login`)
    console.log(`   User: ${account.user}  |  Pass: ${account.pass}\n`)
  }

  return _transporter
}

export const sendEmail = async (options) => {
  try {
    const transport = await getTransporter()
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || '"Munchies 🍜" <noreply@munchies.local>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
    console.log(`📧 Email sent to ${options.to} — subject: "${options.subject}"`)
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
      console.log(`   🔗 Preview: ${previewUrl}`)
    }
  } catch (error) {
    console.error('❌ Email delivery failed (non-fatal):', error)
  }
}

export const sendBookingConfirmation = async (userId, bookingId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { store: true, items: true },
  })
  if (!user || !booking) return

  const preferences = await prisma.emailPreference.findUnique({ where: { userId } })
  if (preferences && !preferences.bookingNotifications) return

  await sendEmail({
    to: user.email,
    subject: `Order Received – ${booking.store.name}`,
    html: `
      <h2>Order Received 🎉</h2>
      <p>Hi ${user.name},</p>
      <p>We've received your order at <strong>${booking.store.name}</strong>. The store owner will confirm it shortly.</p>
      <ul>${booking.items.map(i => `<li>${i.name} × ${i.quantity} — ₹${i.price * i.quantity}</li>`).join('')}</ul>
      <p><strong>Total: ₹${booking.total}</strong></p>
    `,
  })
}

export const sendBookingConfirmed = async (userId, bookingId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { store: true },
  })
  if (!user || !booking) return

  const preferences = await prisma.emailPreference.findUnique({ where: { userId } })
  if (preferences && !preferences.bookingNotifications) return

  await sendEmail({
    to: user.email,
    subject: `Booking Confirmed – ${booking.store.name}`,
    html: `
      <h2>Booking Confirmed ✅</h2>
      <p>Hi ${user.name},</p>
      <p>Your order at <strong>${booking.store.name}</strong> has been confirmed by the store owner.</p>
      <p>You will receive another email when your order is ready for pickup.</p>
    `,
  })
}

export const sendOrderReadyNotification = async (userId, bookingId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { store: true },
  })
  if (!user || !booking) return

  const preferences = await prisma.emailPreference.findUnique({ where: { userId } })
  if (preferences && !preferences.bookingNotifications) return

  await sendEmail({
    to: user.email,
    subject: `Your order is ready for pickup – ${booking.store.name}`,
    html: `
      <h2>Your order is ready! 🎉</h2>
      <p>Hi ${user.name},</p>
      <p>Your order from <strong>${booking.store.name}</strong> is ready for pickup.</p>
      <p>Head over to <strong>${booking.store.hostel} – Room ${booking.store.roomNumber}</strong> to collect it now.</p>
    `,
  })
}

export const sendCancellationRequestNotification = async (bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      store: { include: { owner: true } },
      user: true,
      cancellationRequest: true,
    },
  })
  if (!booking) return

  await sendEmail({
    to: booking.store.owner.email,
    subject: `Cancellation request – Order from ${booking.user.name}`,
    html: `
      <h2>Cancellation Request Received</h2>
      <p>Hi ${booking.store.owner.name},</p>
      <p><strong>${booking.user.name}</strong> has requested to cancel their order at <strong>${booking.store.name}</strong>.</p>
      ${booking.cancellationRequest?.reason ? `<p>Reason: <em>${booking.cancellationRequest.reason}</em></p>` : ''}
      <p>Please log in to your dashboard to approve or reject this request.</p>
    `,
  })
}

export const sendCancellationNotification = async (userId, bookingId, status) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return

  const preferences = await prisma.emailPreference.findUnique({ where: { userId } })
  if (preferences && !preferences.bookingNotifications) return

  await sendEmail({
    to: user.email,
    subject: `Cancellation ${status} – Munchies`,
    html: `
      <h2>Cancellation ${status}</h2>
      <p>Hi ${user.name},</p>
      <p>Your cancellation request for booking <code>${bookingId}</code> has been <strong>${status.toLowerCase()}</strong>.</p>
    `,
  })
}

export const sendWarningEmail = async (userId, reason) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return

  await sendEmail({
    to: user.email,
    subject: 'Warning – Uncollected Order',
    html: `
      <h2>⚠️ Warning: Uncollected Order</h2>
      <p>Hi ${user.name},</p>
      <p>${reason}</p>
      <p>You now have <strong>${user.warningCount} warning(s)</strong>. After 3 warnings, your account will be blocked from placing new orders.</p>
    `,
  })
}

export const sendCampaignNotification = async (userId, campaignId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { store: true },
  })
  if (!user || !campaign) return

  const preferences = await prisma.emailPreference.findUnique({ where: { userId } })
  if (preferences && !preferences.promotionalAlerts) return

  await sendEmail({
    to: user.email,
    subject: `🎉 New Sale: ${campaign.name}`,
    html: `
      <h2>${campaign.name}</h2>
      <p>Hi ${user.name},</p>
      <p>${campaign.description}</p>
      <p>Use coupon code: <strong>${campaign.couponCode}</strong></p>
      <p>Valid until: ${new Date(campaign.endDate).toLocaleString('en-IN')}</p>
      <p>Shop now at <strong>${campaign.store.name}</strong>!</p>
    `,
  })
}

export const sendNewStoreNotification = async (storeId) => {
  const store = await prisma.store.findUnique({ where: { id: storeId } })
  if (!store) return

  const prefs = await prisma.emailPreference.findMany({
    where: { newStoreNotifications: true },
    include: { user: true },
  })

  for (const pref of prefs) {
    await sendEmail({
      to: pref.user.email,
      subject: `🍜 New Store: ${store.name}`,
      html: `
        <h2>New Store Opened! 🎉</h2>
        <p>Hi ${pref.user.name},</p>
        <p><strong>${store.name}</strong> is now available in ${store.hostel} – Room ${store.roomNumber}.</p>
        ${store.description ? `<p>${store.description}</p>` : ''}
        <p>Browse and order now on Munchies!</p>
      `,
    })
  }
}

export const sendStoreRequestDecision = async (userId, approved, storeName) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return

  await sendEmail({
    to: user.email,
    subject: approved
      ? `✅ Store request approved – ${storeName}`
      : `❌ Store request rejected – ${storeName}`,
    html: approved
      ? `
        <h2>Your store request has been approved! 🎉</h2>
        <p>Hi ${user.name},</p>
        <p>Great news! Your request to open <strong>${storeName}</strong> has been <strong>approved</strong>.</p>
        <p>Your store is now live on Munchies. Log in to your dashboard to start adding items and accepting orders.</p>
      `
      : `
        <h2>Store request not approved</h2>
        <p>Hi ${user.name},</p>
        <p>Unfortunately, your request to open <strong>${storeName}</strong> has been <strong>rejected</strong> by the admin.</p>
        <p>If you have any questions, please reach out to support.</p>
      `,
  })
}
