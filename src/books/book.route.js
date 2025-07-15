// back_end/src/books/book.route.js
const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const {
  postABook,
  getAllBooks,
  getSingleBook,
  UpdateBook,
  deleteABook,
} = require("./book.controller");
const verifyAdminToken = require("../middleware/verifyAdminToken");
const verifyToken = require("../middleware/verifyToken");
const Order = require("../orders/order.model");
const { cache } = require("../middleware/cache");
const Book = require("./book.model");

const router = express.Router();

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "epubFile") {
      cb(null, "uploads/books");
    } else if (file.fieldname === "coverImage") {
      cb(null, "uploads/covers");
    }
  },
  filename: (req, file, cb) => {
    // Cryptographically strong unique suffix
    const uniqueSuffix =
      Date.now() + "-" + crypto.randomBytes(8).toString("hex");
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

// Multer with file validation and size limits
const upload = multer({
  storage,
  limits: {
    files: 2,                // max two files per request
    fileSize: 8 * 1024 * 1024, // 8 MB max per file
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "coverImage") {
      if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
        return cb(new Error("Invalid cover image type"), false);
      }
    }
    if (file.fieldname === "epubFile") {
      if (file.mimetype !== "application/epub+zip") {
        return cb(new Error("Invalid EPUB file type"), false);
      }
    }
    cb(null, true);
  },
});

// Admin routes
router.post(
  "/create-book",
  verifyAdminToken,
  upload.fields([
    { name: "epubFile", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  postABook
);
router.put("/edit/:id", verifyAdminToken, UpdateBook);
router.delete("/:id", verifyAdminToken, deleteABook);

// Read endpoint: approved buyers only — place before the cached detail route
router.get("/:id/read", verifyToken, async (req, res) => {
  try {
    const bookId = req.params.id;

    // Awaiting a true Promise
    const orders = await Order.find({
      email: req.user.email,
      status: "approved",
      productIds: bookId,
    })
      .exec();

    if (!orders.length) {
      return res
        .status(403)
        .json({ message: "You are not authorized to read this book." });
    }

    // Awaiting a true Promise
    const book = await Book.findById(bookId).exec();

    if (!book) {
      return res.status(404).json({ message: "Book not found!" });
    }
    res.status(200).json({ book });
  } catch (error) {
    console.error("Error reading book:", error);
    res
      .status(500)
      .json({ message: "Error reading book", error: error.message });
  }
});

// Public / buyer routes
router.get("/", cache("books", 120), getAllBooks);
router.get("/:id", cache("books", 300), getSingleBook);

module.exports = router;
