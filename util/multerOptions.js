const multer = require("multer");
const path = require("path");

const uploadDir = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // store in /uploads folder
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // e.g., 16946323.jpg
  }
});

const upload = multer({ storage: storage });
module.exports = upload;