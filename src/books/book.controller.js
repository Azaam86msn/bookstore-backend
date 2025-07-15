// back_end/src/books/book.controller.js
const Book = require("./book.model");

// Helper: parse & validate linkedWords
function normalizeLinkedWords(raw) {
  if (raw === undefined) return { value: undefined };
  if (Array.isArray(raw)) return { value: raw };

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return { value: parsed };
      return { error: "linkedWords must be an array." };
    } catch {
      return { error: "linkedWords must be valid JSON." };
    }
  }

  return { error: "linkedWords has invalid format." };
}

// POST a book (admin upload)
const postABook = async (req, res) => {
  try {
    const { title, description, category, trending, oldPrice, newPrice } =
      req.body;

    // Expect both EPUB and cover
    if (
      !req.files?.epubFile?.length ||
      !req.files?.coverImage?.length
    ) {
      return res
        .status(400)
        .json({ message: "Both EPUB file and cover image are required." });
    }

    const { error, value: linkedWords } = normalizeLinkedWords(
      req.body.linkedWords
    );
    if (error) {
      return res.status(400).json({ message: error });
    }

    const host = `${req.protocol}://${req.get("host")}`;
    const epubUrl = `${host}/uploads/books/${req.files.epubFile[0].filename}`;
    const coverImageUrl = `${host}/uploads/covers/${req.files.coverImage[0].filename}`;

    const newBook = new Book({
      title,
      description,
      category,
      trending: trending === "true" || trending === true,
      coverImage: coverImageUrl,
      epubUrl,
      oldPrice,
      newPrice,
      linkedWords,
    });

    const savedBook = await newBook.save();
    res
      .status(201)
      .json({ message: "Book posted successfully", book: savedBook });
  } catch (error) {
    console.error("Error creating book:", error);
    res
      .status(500)
      .json({ message: "Failed to create book", error: error.message });
  }
};

// GET /api/books/ — public listing
const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find(
      {},
      "title description category trending coverImage oldPrice newPrice linkedWords"
    )
      .sort({ createdAt: -1 })
      .exec();
    res.status(200).json(books);
  } catch (error) {
    console.error("Error fetching books:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch books", error: error.message });
  }
};

// GET /api/books/:id — public detail
const getSingleBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id)
      .select("title description category trending coverImage oldPrice newPrice linkedWords")
      .exec();
    if (!book) {
      return res.status(404).json({ message: "Book not found!" });
    }
    res.status(200).json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch book", error: error.message });
  }
};

// PUT /api/books/edit/:id — admin-only update
const UpdateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Normalize linkedWords
    const nw = normalizeLinkedWords(updateData.linkedWords);
    if (nw.error) {
      return res.status(400).json({ message: nw.error });
    }
    if (nw.value !== undefined) {
      updateData.linkedWords = nw.value;
    }

    // Ensure trending is boolean
    if (updateData.trending !== undefined) {
      updateData.trending =
        updateData.trending === "true" || updateData.trending === true;
    }

    const updatedBook = await Book.findByIdAndUpdate(id, updateData, {
      new: true,
    }).exec();

    if (!updatedBook) {
      return res.status(404).json({ message: "Book not found!" });
    }
    res
      .status(200)
      .json({ message: "Book updated successfully", book: updatedBook });
  } catch (error) {
    console.error("Error updating book:", error);
    res
      .status(500)
      .json({ message: "Failed to update book", error: error.message });
  }
};

// DELETE /api/books/:id — admin-only delete
const deleteABook = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBook = await Book.findByIdAndDelete(id).exec();
    if (!deletedBook) {
      return res.status(404).json({ message: "Book not found!" });
    }
    res
      .status(200)
      .json({ message: "Book deleted successfully", book: deletedBook });
  } catch (error) {
    console.error("Error deleting book:", error);
    res
      .status(500)
      .json({ message: "Failed to delete book", error: error.message });
  }
};

module.exports = {
  postABook,
  getAllBooks,
  getSingleBook,
  UpdateBook,
  deleteABook,
};
