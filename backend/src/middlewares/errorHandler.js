const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';

  if (err.code === 'P2002') {
    status = 409;
    message = 'A record with these details already exists';
  } else if (err.code === 'P2025') {
    status = 404;
    message = 'Record not found';
  } else if (err.code === 'P2003') {
    status = 400;
    message = 'This record is linked to other records and cannot be changed';
  }

  if (status >= 500) {
    console.error(err);
    message = process.env.NODE_ENV === 'production' ? 'Something went wrong' : message;
  }

  res.status(status).json({ message });
};

const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

module.exports = { errorHandler, notFound };
