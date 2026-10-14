let songs = [
  // 1. Recently Played
  {
    _id: "1",
    title: "Daylight",
    artist: "David Kushner",
    image: "card1img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: "3:33",
    category: "Recently Played"
  },
  {
    _id: "2",
    title: "Starboy",
    artist: "The Weeknd, Daft Punk",
    image: "card2img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: "3:50",
    category: "Recently Played"
  },
  {
    _id: "3",
    title: "Blinding Lights",
    artist: "The Weeknd",
    image: "card3img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: "3:20",
    category: "Recently Played"
  },
  {
    _id: "4",
    title: "As It Was",
    artist: "Harry Styles",
    image: "card4img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration: "2:47",
    category: "Recently Played"
  },

  // 2. Trending now near you
  {
    _id: "5",
    title: "Espresso",
    artist: "Sabrina Carpenter",
    image: "card2img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    duration: "2:55",
    category: "Trending now near you"
  },
  {
    _id: "6",
    title: "Ta Takkara",
    artist: "Kalki 2898 AD",
    image: "card3img.jpeg",
    src: "songs/ta-takkara.mp3",
    duration: "3:45",
    category: "Trending now near you"
  },
  {
    _id: "7",
    title: "Yeshanagula",
    artist: "The Paradise",
    image: "card4img.jpeg",
    src: "songs/yeshanagula.mp3",
    duration: "3:20",
    category: "Trending now near you"
  },
  {
    _id: "8",
    title: "Naa Ready",
    artist: "Anirudh Ravichander, Thalapathy Vijay",
    image: "card1img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    duration: "3:08",
    category: "Trending now near you"
  },

  // 3. Featured Charts
  {
    _id: "9",
    title: "Top Songs - Global",
    artist: "Weekly Music Charts",
    image: "card5img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    duration: "3:15",
    category: "Featured Charts"
  },
  {
    _id: "10",
    title: "Top Songs - India",
    artist: "Trending Hits & Bollywood",
    image: "card6img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    duration: "4:05",
    category: "Featured Charts"
  },
  {
    _id: "11",
    title: "Top 50 - Global Hits",
    artist: "Spotify Curated",
    image: "card1img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
    duration: "3:08",
    category: "Featured Charts"
  },
  {
    _id: "12",
    title: "Viral 50 - India",
    artist: "Daily Viral Trends",
    image: "card2img.jpeg",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    duration: "3:12",
    category: "Featured Charts"
  }
];

// Fetch songs from MongoDB backend (with fallback to default array)
async function fetchSongsFromBackend() {
  const API_URL = window.location.origin.includes("3000")
    ? "/api/songs"
    : "http://localhost:3000/api/songs";

  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      const data = await res.json();
      if (data.songs && data.songs.length > 0) {
        songs = data.songs;
      }
    }
  } catch (err) {
    console.log("Using local songs list (server offline or standalone mode):", err);
  }
}
