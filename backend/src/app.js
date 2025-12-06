const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const schoolRoutes = require('./routes/schoolRoutes');
const personnelRoutes = require('./routes/personnelRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/schools', schoolRoutes);
app.use('/api', personnelRoutes); // Includes /personnel and /postings
app.use('/api/reports', reportRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('PNEDS API is running');
});

// Error Handler
app.use(errorHandler);

module.exports = app;
