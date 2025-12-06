const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
  
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({ status: 'error', errors });
    }
    next();
  };
};

const schemas = {
  createSchool: Joi.object({
    code: Joi.string().required(),
    name: Joi.string().required(),
    region: Joi.string().required(),
    division: Joi.string().required(),
    latitude: Joi.number().optional().allow(null),
    longitude: Joi.number().optional().allow(null),
    altitude: Joi.number().optional().allow(null)
  }),

  upsertStructure: Joi.object({
    class_level_id: Joi.number().integer().required(),
    series_id: Joi.number().integer().required(),
    number_of_divisions: Joi.number().integer().min(0).required()
  }),

  createPersonnel: Joi.object({
    matricule: Joi.string().required(),
    full_name: Joi.string().required(),
    grade_code: Joi.string().required(),
    teaching_domain_id: Joi.number().integer().required(),
    date_of_birth: Joi.date().iso().optional().allow(null) // New Field
  }),

  updatePersonnel: Joi.object({
    full_name: Joi.string().optional(),
    grade_code: Joi.string().optional(),
    teaching_domain_id: Joi.number().integer().optional(),
    date_of_birth: Joi.date().iso().optional().allow(null),
    status_code: Joi.string().optional()
  }),

  transferPersonnel: Joi.object({
    personnel_matricule: Joi.string().required(),
    new_school_id: Joi.number().integer().required(),
    admin_position_code: Joi.string().allow(null, '').optional()
  })
};

module.exports = { validate, schemas };