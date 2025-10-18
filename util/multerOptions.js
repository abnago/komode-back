import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// Multer configuration

export const __filename = fileURLToPath(import.meta.url);
// By resolving the path to the parent folder(root)
// __dirname will be /uploads instead of /utils/uploads when you use it in another file
export const __dirname = path.resolve(path.dirname(__filename), '..');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, './uploads')); // store in /uploads folder
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // e.g., 16946323.jpg
  }
});

const upload = multer({ storage: storage });
export default upload;