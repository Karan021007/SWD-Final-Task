import { Router } from 'express'
import { body } from 'express-validator'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { validate } from '../middleware/validation.js'
import prisma from '../utils/prisma.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

router.post(
 '/register',
 validate([
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required'),
  body('hostel').optional().isString().withMessage('Hostel must be a string'),
 ]),
 async (req, res, next) => {
     try {
        const { email, password, name, hostel} = req.body

        const existingUser = await prisma.user.findUnique({
            where: { email},
        })

        if (existingUser) {
            throw new AppError('Email already registered', 400)
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                hostel,
                role: 'USER',
            },
        })

        await prisma.emailPreference.create({
            data: {
                userId: user.id,
                bookingNotifications: true,
                promotionalAlerts: true,
                newStoreNotifications: true,
            },
        })

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role},
            process.env.JWT_SECRET,
            { expiresIn: '7d'}
        )

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                hostel: user.hostel,
            },
        })
     } catch (error) {
        next(error)
     }
 }
)

router.post(
 '/login',
 validate([
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
 ]),
 async (req, res, next) => {
   try{
    const { email, password} = req.body

    const user = await prisma.user.findUnique({
        where: { email},
    })

    if (!user) {
        throw new AppError('Invalid credentials', 401)
    }

    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401)
    }

    const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role},
            process.env.JWT_SECRET,
            { expiresIn: '7d'}
        )

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                hostel: user.hostel,
                warningCount: user.warningCount,
                isBlocked: user.isBlocked,
            },
        })
   } catch (error) {
    next(error)
   }
 }
)

export default router
