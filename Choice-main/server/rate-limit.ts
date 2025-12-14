import rateLimit from "express-rate-limit";

const isDev = process.env.NODE_ENV !== "production";
const RATE_LIMITING_ENABLED = process.env.RATE_LIMITING_ENABLED !== "false";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 5,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !RATE_LIMITING_ENABLED,
});

export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 1000 : 5,
  message: {
    success: false,
    message: "Too many signup attempts. Please try again in 1 hour.",
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !RATE_LIMITING_ENABLED,
});

export const inquiryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 1000 : 10,
  message: {
    success: false,
    message: "Too many requests. Please wait a minute before trying again.",
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !RATE_LIMITING_ENABLED,
});

export const newsletterLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 1000 : 3,
  message: {
    success: false,
    message: "Too many subscription attempts. Please wait a minute.",
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !RATE_LIMITING_ENABLED,
});
