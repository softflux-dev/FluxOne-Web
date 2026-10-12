import { Router } from 'express'
import { changePassword, login, logout, me, refresh, updateMe } from './auth.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { asyncHandler } from '../../middlewares/error.middleware.js'
import { upload } from '../../middlewares/upload.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema, 
  updateProfileSchema,
} from './auth.validator.js'

const router = Router()

// Multipart empty strings break zod optional() — treat as omitted
function clearEmptyMultipartFields(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (req.body[key] === '') req.body[key] = undefined
    }
  }
  next()
}

router.post('/login', validate(loginSchema), asyncHandler(login))
router.post('/refresh', validate(refreshSchema), asyncHandler(refresh))
// No authMiddleware: client clears access token before logout; revoke via refreshToken body
router.post('/logout', validate(logoutSchema), asyncHandler(logout))
router.get('/me', authMiddleware, asyncHandler(me))
router.patch(
  '/me',
  authMiddleware,
  upload.single('image'),
  clearEmptyMultipartFields,
  validate(updateProfileSchema),
  asyncHandler(updateMe),
)
router.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema),
  asyncHandler(changePassword),
)

export default router
