const { check, validationResult } = require('express-validator');

// Middleware to evaluate validation rules
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Validation rules for User Registration
const registerValidation = [
  check('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  check('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  check('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validate
];

// Validation rules for User Login
const loginValidation = [
  check('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  check('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate
];

// Validation rules for Note Creation
const createNoteValidation = [
  check('title')
    .trim()
    .notEmpty()
    .withMessage('Note title is required')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),
  check('content')
    .optional()
    .isString()
    .withMessage('Content must be a string'),
  check('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array of strings'),
  check('isPinned')
    .optional()
    .isBoolean()
    .withMessage('isPinned must be a boolean'),
  validate
];

// Validation rules for Note Update
const updateNoteValidation = [
  check('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),
  check('content')
    .optional()
    .isString()
    .withMessage('Content must be a string'),
  check('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array of strings'),
  check('isPinned')
    .optional()
    .isBoolean()
    .withMessage('isPinned must be a boolean'),
  validate
];

// Validation rules for Change Password
const changePasswordValidation = [
  check('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  check('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  validate
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  changePasswordValidation,
  createNoteValidation,
  updateNoteValidation
};
