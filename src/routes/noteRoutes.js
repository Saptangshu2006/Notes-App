const express = require('express');
const {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote
} = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');
const {
  createNoteValidation,
  updateNoteValidation
} = require('../middleware/validateMiddleware');

const router = express.Router();

// Protect ALL routes below with JWT authentication middleware
router.use(protect);

router
  .route('/')
  .get(getNotes)
  .post(createNoteValidation, createNote);

router
  .route('/:id')
  .get(getNoteById)
  .put(updateNoteValidation, updateNote)
  .delete(deleteNote);

module.exports = router;
