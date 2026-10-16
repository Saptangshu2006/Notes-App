const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Note = require('../src/models/Note');

// In-memory data collections
const usersDB = [];
const notesDB = [];

const setupMockDB = () => {
  // Clear collections
  usersDB.length = 0;
  notesDB.length = 0;

  // Mock User.findOne
  User.findOne = (query) => {
    let selectPassword = false;
    const promise = (async () => {
      const email = query.email ? query.email.toLowerCase() : null;
      const user = usersDB.find((u) => u.email === email);
      if (!user) return null;

      const userCopy = {
        _id: user._id,
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        matchPassword: async (pwd) => await bcrypt.compare(pwd, user.password)
      };

      if (selectPassword) {
        userCopy.password = user.password;
      }
      return userCopy;
    })();

    promise.select = (fields) => {
      if (fields && fields.includes('+password')) {
        selectPassword = true;
      }
      return promise;
    };

    return promise;
  };

  // Mock User.create
  User.create = async (userData) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    const newUser = {
      _id: new mongoose.Types.ObjectId(),
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      matchPassword: async (pwd) => await bcrypt.compare(pwd, hashedPassword)
    };
    newUser.id = newUser._id.toString();
    usersDB.push(newUser);
    return newUser;
  };

  // Mock User.findById
  User.findById = (id) => {
    let excludePassword = true;
    const promise = (async () => {
      const user = usersDB.find((u) => u._id.toString() === id.toString());
      if (!user) return null;

      const userCopy = {
        _id: user._id,
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        matchPassword: user.matchPassword
      };

      if (!excludePassword) {
        userCopy.password = user.password;
      }

      userCopy.save = async function () {
        if (this.password && this.password !== user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(this.password, salt);
          user.matchPassword = async (pwd) => await bcrypt.compare(pwd, user.password);
        }
        user.name = this.name;
        user.updatedAt = new Date();
        return this;
      };

      return userCopy;
    })();

    promise.select = (fields) => {
      if (fields && fields.includes('+password')) {
        excludePassword = false;
      }
      if (fields && fields.includes('-password')) {
        excludePassword = true;
      }
      return promise;
    };

    return promise;
  };

  // Mock Note.create
  Note.create = async (noteData) => {
    const newNote = {
      _id: new mongoose.Types.ObjectId(),
      user: noteData.user,
      title: noteData.title,
      content: noteData.content || '',
      tags: noteData.tags || [],
      isPinned: Boolean(noteData.isPinned),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    newNote.save = async function () {
      this.updatedAt = new Date();
      const idx = notesDB.findIndex((n) => n._id.toString() === this._id.toString());
      if (idx !== -1) {
        notesDB[idx] = this;
      }
      return this;
    };

    newNote.deleteOne = async function () {
      const idx = notesDB.findIndex((n) => n._id.toString() === this._id.toString());
      if (idx !== -1) {
        notesDB.splice(idx, 1);
      }
      return {};
    };

    notesDB.push(newNote);
    return newNote;
  };

  // Mock Note.findById
  Note.findById = async (id) => {
    const note = notesDB.find((n) => n._id.toString() === id.toString());
    if (!note) return null;

    // Attach document methods
    note.save = async function () {
      this.updatedAt = new Date();
      return this;
    };
    note.deleteOne = async function () {
      const idx = notesDB.findIndex((n) => n._id.toString() === this._id.toString());
      if (idx !== -1) {
        notesDB.splice(idx, 1);
      }
      return {};
    };
    return note;
  };

  // Mock Note.countDocuments
  Note.countDocuments = async (query) => {
    return filterNotes(query).length;
  };

  // Mock Note.find
  Note.find = (query) => {
    let filtered = filterNotes(query);

    const queryObj = {
      sort: (sortObj) => {
        filtered.sort((a, b) => {
          if (sortObj.isPinned) {
            if (a.isPinned !== b.isPinned) {
              return a.isPinned ? -1 : 1;
            }
          }
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
        return queryObj;
      },
      skip: (n) => {
        filtered = filtered.slice(n);
        return queryObj;
      },
      limit: (n) => {
        filtered = filtered.slice(0, n);
        return queryObj;
      },
      then: (resolve, reject) => {
        return Promise.resolve(filtered).then(resolve, reject);
      }
    };

    return queryObj;
  };

  const filterNotes = (query) => {
    return notesDB.filter((note) => {
      if (query.user && note.user.toString() !== query.user.toString()) {
        return false;
      }
      if (query.isPinned !== undefined && note.isPinned !== query.isPinned) {
        return false;
      }
      if (query.tags && !note.tags.includes(query.tags)) {
        return false;
      }
      if (query.$or) {
        const matches = query.$or.some((condition) => {
          if (condition.title) {
            const regex = new RegExp(condition.title.$regex, condition.title.$options);
            return regex.test(note.title);
          }
          if (condition.content) {
            const regex = new RegExp(condition.content.$regex, condition.content.$options);
            return regex.test(note.content);
          }
          return false;
        });
        if (!matches) return false;
      }
      return true;
    });
  };
};

module.exports = { setupMockDB, usersDB, notesDB };
