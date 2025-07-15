// back_end/src/books/book.model.js
const mongoose = require("mongoose");

const linkedWordSchema = new mongoose.Schema(
  {
    phrase: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    trending: { type: Boolean, required: true },
    coverImage: { type: String, required: true },
    epubUrl: { type: String, required: true }, // your existing file URL
    oldPrice: { type: Number, required: true },
    newPrice: { type: Number, required: true },
    linkedWords: { type: [linkedWordSchema], default: [] },
  },
  { timestamps: true }
);

const Book = mongoose.model("Book", bookSchema);
module.exports = Book;
