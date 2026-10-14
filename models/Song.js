// Song model for MongoDB
const mongoose = require("mongoose");

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  artist: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    default: "card1img.jpeg"
  },
  src: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: String,
    default: "3:30"
  },
  category: {
    type: String,
    default: "Trending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Song", songSchema);
