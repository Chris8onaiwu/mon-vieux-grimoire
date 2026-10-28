const Book = require('../models/book');
const fs = require('fs');

exports.createBook = (req, res, next) => {
  const url = req.protocol + '://' + req.get('host');
  const bookObject = JSON.parse(req.body.book);

  const book = new Book({
    userId: req.auth.userId,
    title: bookObject.title,
    author: bookObject.author,
    imageUrl: url + '/images/' + req.file.filename,
    year: bookObject.year,
    genre: bookObject.genre,
    ratings: [],
    averageRating: 0
  });

  book.save()
    .then(() => {
      res.status(201).json({
        message: 'Book saved successfully!'
      });
    })
    .catch((error) => {
      res.status(400).json({
        error: error
      });
    });
};

exports.getAllBooks = (req, res, next) => {
  Book.find()
    .then((books) => {
      res.status(200).json(books);
    })
    .catch((error) => {
      res.status(400).json({
        error: error
      });
    });
};

exports.getOneBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (!book) {
        return res.status(404).json({
          error: new Error('Book not found')
        });
      }

      res.status(200).json(book);
    })
    .catch((error) => {
      res.status(404).json({
        error: error
      });
    });
};

exports.modifyBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (!book) {
        return res.status(404).json({
          error: new Error('Book not found')
        });
      }

      if (book.userId !== req.auth.userId) {
        return res.status(403).json({
          error: new Error('Unauthorized request')
        });
      }

      const bookObject = req.file
        ? {
            ...JSON.parse(req.body.book),
            imageUrl:
              req.protocol +
              '://' +
              req.get('host') +
              '/images/' +
              req.file.filename
          }
        : { ...req.body };

      delete bookObject.userId;
      delete bookObject.ratings;
      delete bookObject.averageRating;

      if (req.file) {
        const oldFilename = book.imageUrl.split('/images/')[1];

        fs.unlink('images/' + oldFilename, (error) => {
          if (error) {
            console.log('Unable to delete old image:', error);
          }
        });
      }

      Book.updateOne(
        { _id: req.params.id },
        {
          ...bookObject,
          _id: req.params.id
        }
      )
        .then(() => {
          res.status(200).json({
            message: 'Book updated successfully!'
          });
        })
        .catch((error) => {
          res.status(400).json({
            error: error
          });
        });
    })
    .catch((error) => {
      res.status(400).json({
        error: error
      });
    });
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (!book) {
        return res.status(404).json({
          error: new Error('Book not found')
        });
      }

      if (book.userId !== req.auth.userId) {
        return res.status(403).json({
          error: new Error('Unauthorized request')
        });
      }

      const filename = book.imageUrl.split('/images/')[1];

      fs.unlink('images/' + filename, () => {
        Book.deleteOne({ _id: req.params.id })
          .then(() => {
            res.status(200).json({
              message: 'Deleted!'
            });
          })
          .catch((error) => {
            res.status(400).json({
              error: error
            });
          });
      });
    })
    .catch((error) => {
      res.status(400).json({
        error: error
      });
    });
};

exports.getBestRatedBooks = (req, res, next) => {
  Book.find()
    .sort({ averageRating: -1 })
    .limit(3)
    .then((books) => {
      res.status(200).json(books);
    })
    .catch((error) => {
      res.status(400).json({
        error: error
      });
    });
};

exports.rateBook = (req, res, next) => {
  const rating = req.body.rating;
  const userId = req.auth.userId;

  if (rating < 0 || rating > 5) {
    return res.status(400).json({
      error: new Error('Rating must be between 0 and 5')
    });
  }

  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (!book) {
        return res.status(404).json({
          error: new Error('Book not found')
        });
      }

      const alreadyRated = book.ratings.some(
        (ratingObject) => ratingObject.userId === userId
      );

      if (alreadyRated) {
        return res.status(400).json({
          error: new Error('User has already rated this book')
        });
      }

      book.ratings.push({
        userId: userId,
        grade: rating
      });

      const totalRatings = book.ratings.reduce(
        (total, ratingObject) => total + ratingObject.grade,
        0
      );

      book.averageRating = totalRatings / book.ratings.length;

      return book.save();
    })
    .then((book) => {
      if (book) {
        res.status(200).json(book);
      }
    })
    .catch((error) => {
      res.status(400).json({
        error: error
      });
    });
};