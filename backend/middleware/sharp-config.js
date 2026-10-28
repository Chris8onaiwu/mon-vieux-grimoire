const sharp = require('sharp');
const fs = require('fs');

module.exports = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const originalPath = req.file.path;

    const optimizedFilename =
      req.file.filename.replace(/\.[^/.]+$/, '') + '.webp';

    const optimizedPath = `images/${optimizedFilename}`;

    await sharp(originalPath)
      .resize({
        width: 800,
        height: 1200,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({
        quality: 80
      })
      .toFile(optimizedPath);

    fs.unlink(originalPath, () => {});

    req.file.filename = optimizedFilename;
    req.file.path = optimizedPath;

    next();
  } catch (error) {
    res.status(500).json({
      error
    });
  }
};