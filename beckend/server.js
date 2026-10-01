require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const Database = require('./config/database');
const NounRouter = require('./routes/Noun.route');

const app = express();

// The API is meant to be read from the frontend's origin, so the default `same-origin` CORP would be wrong.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// Plain `querystring` parsing: `?level[$ne]=A1` stays a string instead of becoming an object that
// could slip operators into a Mongo filter. The API takes no bodies, so no body parsers either.
app.set('query parser', 'simple');

// Comma-separated list of allowed frontend origins; unset means open, which is fine for local dev only.
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim());
app.use(cors({ origin: allowedOrigins ?? '*', methods: ['GET'] }));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'Success' });
});

app.use('/api', async (req, res, next) => {
  try {
    await Database.connect();
    next();
  } catch (error) {
    next(error);
  }
});

app.use('/api/noun', NounRouter);

app.use((req, res) => {
  res.status(404).json({ status: 'Error', message: 'Not found' });
});

// Express needs all four arguments to recognise an error handler. Details go to the log, never to
// the client — error messages leak schema and query internals.
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ status: 'Error', message: 'Server error' });
});

// Vercel imports the exported app and handles the port itself; listening is only for local runs.
if (!process.env.VERCEL) {
  const port = process.env.PORT || 4001;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

module.exports = app;
