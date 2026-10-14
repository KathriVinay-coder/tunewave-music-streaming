// Audio player variables
let currentSong = 0;
let isPlaying = false;
let isShuffle = false;
let isLoop = false;
let isMuted = false;
let lastVolume = 0.8;

// Create audio instance
const audio = new Audio();

// Format time from seconds to M:SS
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// Load a song's info into the bottom player bar
function loadSong(index) {
  if (!songs || songs.length === 0) return;
  if (index < 0) index = 0;
  if (index >= songs.length) index = songs.length - 1;

  currentSong = index;
  const song = songs[currentSong];

  // Update album details in player
  const albumImg = document.getElementById("current-album-img");
  const albumTitle = document.getElementById("current-album-title");
  const albumArtist = document.getElementById("current-album-artist");
  const totTime = document.getElementById("tot-time");
  const currTime = document.getElementById("curr-time");
  const progressBar = document.getElementById("progress-bar");

  if (albumImg) albumImg.src = song.image || "card1img.jpeg";
  if (albumTitle) albumTitle.innerText = song.title;
  if (albumArtist) albumArtist.innerText = song.artist;
  if (totTime) totTime.innerText = song.duration || "3:30";
  if (currTime) currTime.innerText = "0:00";
  if (progressBar) progressBar.value = 0;

  // Set audio source
  audio.src = song.src;

  // Highlight the card currently playing
  highlightCard(index);

  // Sync like button state
  if (typeof updateLikeButtonUI === "function") {
    updateLikeButtonUI();
  }
}

// Play song
function playSong() {
  if (!audio.src && songs && songs.length > 0) {
    loadSong(currentSong);
  }

  // Record this track into Recently Played immediately
  if (typeof addToRecentlyPlayed === "function") {
    addToRecentlyPlayed(currentSong);
  } else if (typeof window.addToRecentlyPlayed === "function") {
    window.addToRecentlyPlayed(currentSong);
  }

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        isPlaying = true;
        updatePlayerUIState(true);
      })
      .catch((err) => {
        console.warn("Audio play prevented or failed:", err);
        isPlaying = false;
        updatePlayerUIState(false);
      });
  }
}

// Pause song
function pauseSong() {
  isPlaying = false;
  audio.pause();
  updatePlayerUIState(false);
}

// Toggle Play/Pause
function togglePlay() {
  if (audio.paused || !isPlaying) {
    playSong();
  } else {
    pauseSong();
  }
}

// Update all player play/pause icons and classes
function updatePlayerUIState(playing) {
  isPlaying = playing;
  const masterIcon = document.getElementById("master-play-icon");
  const masterBtn = document.getElementById("master-play-btn");

  if (masterIcon) {
    masterIcon.className = playing ? "fa-solid fa-pause master-icon" : "fa-solid fa-play master-icon";
  }
  if (masterBtn) {
    masterBtn.classList.toggle("playing", playing);
    masterBtn.title = playing ? "Pause" : "Play";
  }
  updateCardPlayIcons(playing);
}

// Listen to native audio state changes to guarantee UI sync
audio.addEventListener("play", () => {
  updatePlayerUIState(true);
  if (typeof addToRecentlyPlayed === "function") {
    addToRecentlyPlayed(currentSong);
  } else if (typeof window.addToRecentlyPlayed === "function") {
    window.addToRecentlyPlayed(currentSong);
  }
});
audio.addEventListener("pause", () => updatePlayerUIState(false));

// Next song
function nextSong() {
  if (songs.length === 0) return;
  if (isShuffle) {
    let rand = Math.floor(Math.random() * songs.length);
    while (rand === currentSong && songs.length > 1) {
      rand = Math.floor(Math.random() * songs.length);
    }
    currentSong = rand;
  } else {
    currentSong = (currentSong + 1) % songs.length;
  }
  loadSong(currentSong);
  playSong();
}

// Previous song
function prevSong() {
  if (songs.length === 0) return;
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
  } else {
    currentSong = (currentSong - 1 + songs.length) % songs.length;
    loadSong(currentSong);
  }
  playSong();
}

// Update the seek bar and timer as the song plays
audio.addEventListener("timeupdate", () => {
  if (audio.duration) {
    const progressPercent = (audio.currentTime / audio.duration) * 100;
    const progressBar = document.getElementById("progress-bar");
    const currTime = document.getElementById("curr-time");
    const totTime = document.getElementById("tot-time");

    if (progressBar) progressBar.value = progressPercent;
    if (currTime) currTime.innerText = formatTime(audio.currentTime);
    if (totTime) totTime.innerText = formatTime(audio.duration);
  }
});

// Automatically play next song when current one finishes
audio.addEventListener("ended", () => {
  if (isLoop) {
    audio.currentTime = 0;
    playSong();
  } else {
    nextSong();
  }
});

// Audio error handling (invalid URL or network issue)
audio.addEventListener("error", () => {
  // Only show warning if audio.src was actually set and playback was requested
  if (!audio.src || audio.src === window.location.href || !isPlaying) {
    return;
  }
  const failedSong = songs[currentSong];
  if (failedSong) {
    console.warn("Audio error on track:", failedSong.title, failedSong.src);
    showToast(`⚠️ Unable to play "${failedSong.title}". Check connection or file.`);
  }
  pauseSong();
});

// Update the play/pause icon on all song cards
function updateCardPlayIcons(playing) {
  const cards = document.querySelectorAll(".card");
  cards.forEach((card) => {
    const songIndex = parseInt(card.getAttribute("data-song-index"));
    const icon = card.querySelector(".card-play-btn i");
    if (icon) {
      if (songIndex === currentSong && playing) {
        icon.className = "fa-solid fa-pause";
      } else {
        icon.className = "fa-solid fa-play";
      }
    }
  });
}

// Highlight the active card in the grid
function highlightCard(index) {
  const cards = document.querySelectorAll(".card");
  cards.forEach((card) => {
    const songIndex = parseInt(card.getAttribute("data-song-index"));
    if (songIndex === index) {
      card.classList.add("active-card");
    } else {
      card.classList.remove("active-card");
    }
  });
}

// Show a small notification toast
function showToast(message) {
  let toast = document.getElementById("spotify-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "spotify-toast";
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.className = "show";
  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 2200);
}
