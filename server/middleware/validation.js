import Joi from 'joi';

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Validation schemas
export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid('customer', 'staff', 'admin').default('customer'),
    phone: Joi.string().optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  createSpace: Joi.object({
    number: Joi.string().required(),
    floor: Joi.number().integer().min(1).required(),
    section: Joi.string().required(),
    type: Joi.string().valid('regular', 'compact', 'disabled', 'electric').required(),
    hourlyRate: Joi.number().positive().required(),
    position: Joi.object({
      x: Joi.number().required(),
      y: Joi.number().required()
    }).required()
  }),

  createBooking: Joi.object({
    spaceId: Joi.string().uuid().required(),
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
    vehicleNumber: Joi.string().optional()
  }),

  updateBooking: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'active', 'completed', 'cancelled').optional(),
    vehicleNumber: Joi.string().optional()
  }),

  processPayment: Joi.object({
    bookingId: Joi.string().uuid().required(),
    method: Joi.string().valid('card', 'paypal', 'wallet', 'cash').required(),
    amount: Joi.number().positive().required()
  })
};