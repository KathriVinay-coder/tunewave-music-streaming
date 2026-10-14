// Song management API routes for owner/admin
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const Song = require("../models/Song");

const router = express.Router();

// Multer storage for uploading songs directly from computer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../songs"));
  },
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${Date.now()}-${cleanName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Default seed tracks to populate database if empty
const defaultSeedSongs = [
  // 1. Recently Played
  {
    title: "Daylight",
    artist: "David Kushner",
    image: "card1img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: "3:33",
    category: "Recently Played"
  },
  {
    title: "Starboy",
    artist: "The Weeknd, Daft Punk",
    image: "card2img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: "3:50",
    category: "Recently Played"
  },
  {
    title: "Blinding Lights",
    artist: "The Weeknd",
    image: "card3img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: "3:20",
    category: "Recently Played"
  },
  {
    title: "As It Was",
    artist: "Harry Styles",
    image: "card4img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration: "2:47",
    category: "Recently Played"
  },

  // 2. Trending now near you
  {
    title: "Espresso",
    artist: "Sabrina Carpenter",
    image: "card2img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    duration: "2:55",
    category: "Trending now near you"
  },
  {
    title: "Ta Takkara",
    artist: "Kalki 2898 AD",
    image: "card3img.jpeg",
    src: "songs/ta-takkara.mp3",
    duration: "3:45",
    category: "Trending now near you"
  },
  {
    title: "Yeshanagula",
    artist: "The Paradise",
    image: "card4img.jpeg",
    src: "songs/yeshanagula.mp3",
    duration: "3:20",
    category: "Trending now near you"
  },
  {
    title: "Naa Ready",
    artist: "Anirudh Ravichander, Thalapathy Vijay",
    image: "card1img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    duration: "3:08",
    category: "Trending now near you"
  },

  // 3. Featured Charts
  {
    title: "Top Songs - Global",
    artist: "Weekly Music Charts",
    image: "card5img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    duration: "3:15",
    category: "Featured Charts"
  },
  {
    title: "Top Songs - India",
    artist: "Trending Hits & Bollywood",
    image: "card6img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    duration: "4:05",
    category: "Featured Charts"
  },
  {
    title: "Top 50 - Global Hits",
    artist: "Spotify Curated",
    image: "card1img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
    duration: "3:08",
    category: "Featured Charts"
  },
  {
    title: "Viral 50 - India",
    artist: "Daily Viral Trends",
    image: "card2img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    duration: "3:12",
    category: "Featured Charts"
  }
];

// Helper endpoint: Reset all default songs in database
router.post("/reset", async (req, res) => {
  try {
    await Song.deleteMany({});
    const reseededSongs = await Song.insertMany(defaultSeedSongs);
    res.status(200).json({
      success: true,
      message: "Reset and re-added all songs successfully!",
      count: reseededSongs.length,
      songs: reseededSongs
    });
  } catch (error) {
    console.error("Error resetting songs:", error);
    res.status(500).json({ success: false, message: "Error resetting songs" });
  }
});

// 1. Get all songs from MongoDB (seeds defaults if empty)
router.get("/", async (req, res) => {
  try {
    let songs = await Song.find().sort({ createdAt: 1 });

    // Seed defaults if MongoDB has no songs yet
    if (songs.length === 0) {
      songs = await Song.insertMany(defaultSeedSongs);
    }

    res.status(200).json({ success: true, count: songs.length, songs });
  } catch (error) {
    console.error("Error fetching songs:", error);
    res.status(500).json({ success: false, message: "Server error fetching songs" });
  }
});

// 2. Direct MP3 File Upload from computer
router.post("/upload", upload.single("audio"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No audio file uploaded" });
    }

    const relativePath = `songs/${req.file.filename}`;
    res.status(200).json({
      success: true,
      message: "Audio uploaded successfully!",
      filePath: relativePath,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: "File upload failed" });
  }
});

// 2b. Direct Cover Picture Upload from computer
router.post("/upload-image", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file uploaded" });
    }

    const relativePath = `songs/${req.file.filename}`;
    res.status(200).json({
      success: true,
      message: "Image uploaded successfully!",
      filePath: relativePath,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ success: false, message: "Image upload failed" });
  }
});

// 3. Owner can add a new song to the music list
router.post("/", async (req, res) => {
  try {
    // Check owner authorization
    const role = req.headers["x-user-role"] || req.body.userRole;
    if (role && role !== "owner" && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only the Playlist Owner has permission to add songs."
      });
    }

    const { title, artist, image, src, duration, category } = req.body;

    if (!title || !artist || !src) {
      return res.status(400).json({
        success: false,
        message: "Title, artist, and audio URL are required"
      });
    }

    const newSong = new Song({
      title: title.trim(),
      artist: artist.trim(),
      image: image ? image.trim() : "card1img.jpeg",
      src: src.trim(),
      duration: duration ? duration.trim() : "3:30",
      category: category ? category.trim() : "Trending now near you"
    });

    await newSong.save();

    res.status(201).json({
      success: true,
      message: "Song added successfully!",
      song: newSong
    });
  } catch (error) {
    console.error("Error adding song:", error);
    res.status(500).json({ success: false, message: "Server error adding song" });
  }
});

// 3. Owner can delete a song from the music list
router.delete("/:id", async (req, res) => {
  try {
    // Check owner authorization
    const role = req.headers["x-user-role"] || req.query.userRole;
    if (role && role !== "owner" && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only the Playlist Owner has permission to delete songs."
      });
    }

    const { id } = req.params;
    let deletedSong = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      deletedSong = await Song.findByIdAndDelete(id);
    } else {
      // Fallback: match by title if id is not a valid ObjectId
      deletedSong = await Song.findOneAndDelete({ title: decodeURIComponent(id) });
    }

    if (!deletedSong) {
      return res.status(404).json({ success: false, message: "Song not found in database" });
    }

    res.status(200).json({
      success: true,
      message: `Song "${deletedSong.title}" deleted successfully!`,
      deletedSong
    });
  } catch (error) {
    console.error("Error deleting song:", error);
    res.status(500).json({ success: false, message: "Server error deleting song" });
  }
});

// 4. Owner can update song cover image and details
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { image, title, artist, category } = req.body;

    let updatedSong = null;
    const updateData = {};
    if (image) updateData.image = image.trim();
    if (title) updateData.title = title.trim();
    if (artist) updateData.artist = artist.trim();
    if (category) updateData.category = category.trim();

    if (mongoose.Types.ObjectId.isValid(id)) {
      updatedSong = await Song.findByIdAndUpdate(id, updateData, { new: true });
    } else {
      updatedSong = await Song.findOneAndUpdate({ title: decodeURIComponent(id) }, updateData, { new: true });
    }

    if (!updatedSong) {
      return res.status(404).json({ success: false, message: "Song not found" });
    }

    res.status(200).json({
      success: true,
      message: "Song picture updated successfully!",
      song: updatedSong
    });
  } catch (error) {
    console.error("Error updating song:", error);
    res.status(500).json({ success: false, message: "Server error updating song picture" });
  }
});

module.exports = router;
