// Main Application Script: Home, Live Search, Owner Add Song & Player Events

function initApp() {
  // 1. Initial immediate render from preloaded tracks (instant UI)
  renderHomeCards();
  loadSong(0);

  // 2. Update user auth header (Sign in / Sign up OR Logged in Name)
  updateAuthUI();

  // 3. Initialize bottom like button
  updateLikeButtonUI();

  // 4. Ensure Home view is visible
  switchToHome();

  // 5. Fetch fresh songs from MongoDB backend in background without blocking UI
  if (typeof fetchSongsFromBackend === "function") {
    fetchSongsFromBackend().then(() => {
      renderHomeCards();
    }).catch((err) => {
      console.warn("Background songs sync notice:", err);
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

  // =========================================================================
  // ROLE & PERMISSION HELPERS
  // =========================================================================
  function getActiveUser() {
    try {
      const saved = localStorage.getItem("spotify_user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  function checkIsOwner() {
    const user = getActiveUser();
    if (!user) return false;
    // User is owner if role is owner or admin, or if signed in as owner@spotify.com
    return user.role === "owner" || user.role === "admin" || (user.email && user.email.toLowerCase() === "owner@spotify.com");
  }
  window.checkIsOwner = checkIsOwner;

  function updateOwnerUI() {
    const isOwner = checkIsOwner();

    // Toggle nav add-song button
    const navAddBtn = document.getElementById("add-song-nav-btn");
    if (navAddBtn) {
      navAddBtn.style.display = isOwner ? "inline-flex" : "none";
    }

    // Toggle sidebar create playlist / add song buttons
    const openAddBtn = document.getElementById("open-add-song-btn");
    if (openAddBtn) {
      openAddBtn.style.display = isOwner ? "inline-flex" : "none";
    }

    const iconAddBtn = document.getElementById("add-song-icon-btn");
    if (iconAddBtn) {
      iconAddBtn.style.display = isOwner ? "inline-flex" : "none";
    }

    // Toggle section "+ Add Song" buttons
    document.querySelectorAll(".add-to-section-btn").forEach((btn) => {
      btn.style.display = isOwner ? "inline-flex" : "none";
    });
  }
  window.updateOwnerUI = updateOwnerUI;

  // =========================================================================
  // CARD RENDERING FUNCTION
  // =========================================================================
  function createCardElement(song, index) {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-song-index", index);
    card.setAttribute("title", `Play ${song.title} - ${song.artist}`);

    const isOwner = checkIsOwner();

    card.innerHTML = `
      <div class="card-img-wrapper">
        <img src="${song.image || "card1img.jpeg"}" class="card-img" alt="${song.title}">
        <button class="card-play-btn" aria-label="Play ${song.title}">
          <i class="fa-solid fa-play"></i>
        </button>
        ${isOwner ? `
        <button class="card-delete-btn" title="Delete ${song.title}" aria-label="Delete song">
          <i class="fa-solid fa-trash"></i>
        </button>` : ""}
      </div>
      <p class="card-title">${song.title}</p>
      <p class="card-info">${song.artist} &bull; ${song.category || "Trending"}</p>
    `;

    // Play button on card
    const playBtn = card.querySelector(".card-play-btn");
    if (playBtn) {
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (currentSong === index) {
          togglePlay();
        } else {
          loadSong(index);
          playSong();
        }
      });
    }

    // Click trash button to delete song (owner only)
    const deleteBtn = card.querySelector(".card-delete-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!checkIsOwner()) {
          showToast("🔒 Access denied: Only the Playlist Owner can delete songs");
          return;
        }
        openDeleteModal(song, index);
      });
    }

    // Click whole card to play / toggle song
    card.addEventListener("click", (e) => {
      if (e.target.closest(".card-delete-btn") || e.target.closest(".card-edit-btn")) return;
      if (currentSong === index) {
        togglePlay();
      } else {
        loadSong(index);
        playSong();
      }
    });

    return card;
  }

  // =========================================================================
  // DYNAMIC RECENTLY PLAYED HISTORY
  // =========================================================================
  function getRecentlyPlayedList() {
    const saved = localStorage.getItem("spotify_recently_played");
    if (saved) {
      try {
        const titles = JSON.parse(saved);
        const matched = [];
        titles.forEach((title) => {
          const foundIdx = songs.findIndex((s) => s.title === title || s._id === title);
          if (foundIdx > -1 && !matched.includes(foundIdx)) {
            matched.push(foundIdx);
          }
        });
        if (matched.length > 0) return matched;
      } catch (e) {
        console.warn("Error reading stored recently played:", e);
      }
    }

    // Default: songs whose category includes "recently"
    const defaults = [];
    songs.forEach((s, idx) => {
      if ((s.category || "").toLowerCase().includes("recently")) {
        defaults.push(idx);
      }
    });
    return defaults;
  }

  function renderRecentlyPlayedContainer(list) {
    const recentlyContainer = document.getElementById("recently-played-container");
    if (!recentlyContainer) return;

    recentlyContainer.innerHTML = "";
    const indices = list || getRecentlyPlayedList();

    indices.forEach((songIndex) => {
      const song = songs[songIndex];
      if (song) {
        const card = createCardElement(song, songIndex);
        recentlyContainer.appendChild(card);
      }
    });

    if (typeof highlightCard === "function") highlightCard(currentSong);
    if (typeof updateCardPlayIcons === "function") updateCardPlayIcons(isPlaying);
  }

  function addToRecentlyPlayed(songIndex) {
    if (songIndex === undefined || songIndex === null) return;
    if (!songs || songIndex < 0 || songIndex >= songs.length) return;
    const targetSong = songs[songIndex];
    if (!targetSong) return;

    let currentList = getRecentlyPlayedList();

    // Remove existing occurrence so we move it to the front
    currentList = currentList.filter((idx) => {
      const s = songs[idx];
      return s && s.title !== targetSong.title;
    });

    // Add this song index to the very front
    currentList.unshift(songIndex);

    // Keep up to 12 recent songs
    if (currentList.length > 12) {
      currentList = currentList.slice(0, 12);
    }

    // Save to localStorage
    try {
      const titlesToSave = currentList.map((idx) => songs[idx].title);
      localStorage.setItem("spotify_recently_played", JSON.stringify(titlesToSave));
    } catch (e) {}

    // Re-render recently played section immediately!
    renderRecentlyPlayedContainer(currentList);
  }
  window.addToRecentlyPlayed = addToRecentlyPlayed;

  // Render cards into their respective Home categories
  function renderHomeCards() {
    const trendingContainer = document.getElementById("trending-container");
    const featuredContainer = document.getElementById("featured-container");

    if (trendingContainer) trendingContainer.innerHTML = "";
    if (featuredContainer) featuredContainer.innerHTML = "";

    // 1. Render Recently Played container dynamically from playback history
    renderRecentlyPlayedContainer();

    // 2. Render Trending and Featured Charts
    songs.forEach((song, index) => {
      const card = createCardElement(song, index);
      const cat = (song.category || "").toLowerCase();

      if (cat.includes("featured") && featuredContainer) {
        featuredContainer.appendChild(card);
      } else if (!cat.includes("recently") && trendingContainer) {
        trendingContainer.appendChild(card);
      }
    });

    // Keep active card and play icon synchronized
    if (typeof highlightCard === "function") highlightCard(currentSong);
    if (typeof updateCardPlayIcons === "function") updateCardPlayIcons(isPlaying);
  }
  window.renderHomeCards = renderHomeCards;

  // =========================================================================
  // =========================================================================
  // TAB NAVIGATION: HOME, SEARCH & YOUR LIBRARY
  // =========================================================================
  // =========================================================================
  // TAB NAVIGATION: HOME & SEARCH
  // =========================================================================
  const navHomeBtn = document.getElementById("nav-home-btn");
  const navSearchBtn = document.getElementById("nav-search-btn");
  const homeView = document.getElementById("home-view");
  const searchView = document.getElementById("search-view");
  const searchInput = document.getElementById("search-input");

  function switchToHome() {
    if (navHomeBtn) navHomeBtn.classList.add("active-nav");
    if (navSearchBtn) navSearchBtn.classList.remove("active-nav");
    if (homeView) homeView.style.display = "block";
    if (searchView) searchView.style.display = "none";
  }

  function switchToSearch() {
    if (navSearchBtn) navSearchBtn.classList.add("active-nav");
    if (navHomeBtn) navHomeBtn.classList.remove("active-nav");
    if (homeView) homeView.style.display = "none";
    if (searchView) searchView.style.display = "block";
    if (searchInput) searchInput.focus();
  }

  if (navHomeBtn) navHomeBtn.addEventListener("click", switchToHome);
  if (navSearchBtn) navSearchBtn.addEventListener("click", switchToSearch);

  // Top navigation back / forward arrows
  const backArrow = document.getElementById("nav-back-arrow");
  const forwardArrow = document.getElementById("nav-forward-arrow");
  if (backArrow) backArrow.addEventListener("click", switchToHome);
  if (forwardArrow) forwardArrow.addEventListener("click", switchToSearch);

  // Bottom player bar heart toggle
  let likedSongIds = JSON.parse(localStorage.getItem("spotify_liked_song_ids") || "[]");

  function isSongLiked(song) {
    if (!song) return false;
    const id = song._id || song.title;
    return likedSongIds.includes(id);
  }

  function toggleLikeSong(song) {
    if (!song) return;
    const id = song._id || song.title;
    const idx = likedSongIds.indexOf(id);

    if (idx > -1) {
      likedSongIds.splice(idx, 1);
      showToast(`Removed "${song.title}" from Liked Songs`);
    } else {
      likedSongIds.push(id);
      showToast(`❤️ Added "${song.title}" to Liked Songs`);
    }

    localStorage.setItem("spotify_liked_song_ids", JSON.stringify(likedSongIds));
    updateLikeButtonUI();
  }

  function updateLikeButtonUI() {
    const likeBtn = document.getElementById("album-like-btn");
    if (likeBtn && songs && songs.length > 0) {
      const currentTrack = songs[currentSong];
      if (isSongLiked(currentTrack)) {
        likeBtn.className = "fa-solid fa-heart album-icon liked";
      } else {
        likeBtn.className = "fa-regular fa-heart album-icon";
      }
    }
  }
  window.updateLikeButtonUI = updateLikeButtonUI;

  // =========================================================================
  // LIVE SEARCH FUNCTIONALITY
  // =========================================================================
  const searchResultsSection = document.getElementById("search-results-section");
  const searchResultsContainer = document.getElementById("search-results-container");
  const searchNoResults = document.getElementById("search-no-results");
  const browseAllSection = document.getElementById("browse-all-section");

  const searchClearBtn = document.getElementById("search-clear-btn");

  function performSearch() {
    if (!searchInput) return;
    const query = searchInput.value.trim().toLowerCase();

    if (searchClearBtn) {
      searchClearBtn.style.display = query ? "flex" : "none";
    }

    if (!query) {
      // If empty, show browse genres and hide search results
      if (searchResultsSection) searchResultsSection.style.display = "none";
      if (browseAllSection) browseAllSection.style.display = "block";
      return;
    }

    // Hide genres and show search results
    if (browseAllSection) browseAllSection.style.display = "none";
    if (searchResultsSection) searchResultsSection.style.display = "block";
    if (searchResultsContainer) searchResultsContainer.innerHTML = "";

    const matchingSongs = [];
    songs.forEach((song, index) => {
      const titleMatch = (song.title || "").toLowerCase().includes(query);
      const artistMatch = (song.artist || "").toLowerCase().includes(query);
      const categoryMatch = (song.category || "").toLowerCase().includes(query);

      if (titleMatch || artistMatch || categoryMatch) {
        matchingSongs.push({ song, index });
      }
    });

    if (matchingSongs.length > 0) {
      if (searchNoResults) searchNoResults.style.display = "none";
      matchingSongs.forEach(({ song, index }) => {
        const card = createCardElement(song, index);
        searchResultsContainer.appendChild(card);
      });
      // Synchronize play icon and active state
      highlightCard(currentSong);
      updateCardPlayIcons(isPlaying);
    } else {
      if (searchNoResults) searchNoResults.style.display = "block";
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", performSearch);
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Escape") {
        searchInput.value = "";
        performSearch();
      }
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
        performSearch();
      }
    });
  }

  // Clicking any browse genre card fills search and filters immediately
  const genreCards = document.querySelectorAll(".genre-card");
  genreCards.forEach((card) => {
    card.addEventListener("click", () => {
      const genre = card.querySelector("span").innerText;
      if (searchInput) {
        searchInput.value = genre;
        performSearch();
      }
    });
  });

  // =========================================================================
  // OWNER: ADD NEW SONG MODAL & BACKEND POST
  // =========================================================================
  const addSongModal = document.getElementById("add-song-modal");
  const openModalBtns = [
    document.getElementById("open-add-song-btn"),
    document.getElementById("add-song-icon-btn"),
    document.getElementById("add-song-nav-btn")
  ];
  const closeModalBtn = document.getElementById("modal-close-btn");
  const cancelModalBtn = document.getElementById("modal-cancel-btn");
  const addSongForm = document.getElementById("add-song-form");

  function openAddSongModal(preferredCategory) {
    if (!checkIsOwner()) {
      showToast("🔒 Access denied: Only the Playlist Owner can add songs");
      return;
    }
    const modal = document.getElementById("add-song-modal");
    if (!modal) return;

    if (preferredCategory && typeof preferredCategory === "string") {
      const catSelect = document.getElementById("new-song-category");
      if (catSelect) {
        for (let opt of catSelect.options) {
          if (opt.value.toLowerCase().includes(preferredCategory.toLowerCase())) {
            catSelect.value = opt.value;
            break;
          }
        }
      }
    }
    modal.classList.add("active");
    modal.style.display = "flex";
    const titleInput = document.getElementById("new-song-title");
    if (titleInput) titleInput.focus();
  }
  window.openAddSongModal = openAddSongModal;

  function closeAddSongModal() {
    const modal = document.getElementById("add-song-modal");
    if (modal) {
      modal.classList.remove("active");
      modal.style.display = "none";
    }
  }
  window.closeAddSongModal = closeAddSongModal;

  function resetAddSongForm() {
    const addForm = document.getElementById("add-song-form");
    const imgPrev = document.getElementById("image-preview-img");
    const imgInp = document.getElementById("new-song-image");
    const upImgName = document.getElementById("uploaded-image-name");
    const upFileName = document.getElementById("uploaded-file-name");
    const pills = document.querySelectorAll("#image-preset-pills .preset-pill");

    if (addForm) addForm.reset();
    if (imgPrev) imgPrev.src = "card1img.jpeg";
    if (imgInp) imgInp.value = "card1img.jpeg";
    if (upImgName) upImgName.textContent = "Default: Card 1";
    if (upFileName) upFileName.textContent = "Sample audio ready";
    pills.forEach((p, idx) => {
      p.classList.toggle("active", idx === 0);
    });
  }
  window.resetAddSongForm = resetAddSongForm;

  // Open modal from sidebar, sticky nav, or plus icons
  openModalBtns.forEach((btn) => {
    if (btn) btn.addEventListener("click", () => openAddSongModal());
  });

  // Open modal from section "+ Add Song" buttons with category preset
  document.querySelectorAll(".add-to-section-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const cat = btn.getAttribute("data-category");
      openAddSongModal(cat);
    });
  });

  if (closeModalBtn) closeModalBtn.addEventListener("click", closeAddSongModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeAddSongModal);

  // Close modal when clicking outside box
  if (addSongModal) {
    addSongModal.addEventListener("click", (e) => {
      if (e.target === addSongModal) closeAddSongModal();
    });
  }

  // Live Cover Image URL Preview & Presets
  const imageInput = document.getElementById("new-song-image");
  const imagePreview = document.getElementById("image-preview-img");
  const presetPills = document.querySelectorAll("#image-preset-pills .preset-pill");

  if (imageInput && imagePreview) {
    imageInput.addEventListener("input", (e) => {
      const url = e.target.value.trim();
      imagePreview.src = url || "card1img.jpeg";

      presetPills.forEach((pill) => {
        pill.classList.toggle("active", pill.getAttribute("data-img") === url);
      });
    });
  }

  presetPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const imgVal = pill.getAttribute("data-img");
      if (imageInput) imageInput.value = imgVal;
      if (imagePreview) imagePreview.src = imgVal;
      if (uploadedImageName) uploadedImageName.textContent = "Preset: " + pill.innerText;

      presetPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
    });
  });

  // Direct Cover Picture Upload when Adding Song
  const imageFileInput = document.getElementById("new-song-image-file");
  const uploadedImageName = document.getElementById("uploaded-image-name");

  if (imageFileInput) {
    imageFileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (uploadedImageName) uploadedImageName.textContent = "Uploading " + file.name + "...";

      // 1. Show instant local preview & read Data URL as guaranteed fallback
      const reader = new FileReader();
      reader.onload = (re) => {
        const dataUrl = re.target.result;
        if (imagePreview) imagePreview.src = dataUrl;
        if (imageInput && !imageInput.value.startsWith("songs/")) {
          imageInput.value = dataUrl;
        }
      };
      reader.readAsDataURL(file);

      // 2. Upload to server to save permanent file
      const formData = new FormData();
      formData.append("image", file);

      try {
        const API_URL = window.location.origin.includes("3000")
          ? "/api/songs/upload-image"
          : "http://localhost:3000/api/songs/upload-image";

        const res = await fetch(API_URL, {
          method: "POST",
          body: formData
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (imageInput) imageInput.value = data.filePath;
          if (uploadedImageName) uploadedImageName.textContent = "✅ " + file.name;
          showToast("🖼️ Cover picture ready!");
        } else {
          if (uploadedImageName) uploadedImageName.textContent = "✅ " + file.name;
        }
      } catch (err) {
        console.warn("Server image upload fallback to local data:", err);
        if (uploadedImageName) uploadedImageName.textContent = "✅ " + file.name;
      }
    });
  }

  // Direct MP3 File Upload from Computer
  const fileInput = document.getElementById("new-song-file");
  const fileNameDisplay = document.getElementById("uploaded-file-name");
  const srcInput = document.getElementById("new-song-src");

  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (fileNameDisplay) fileNameDisplay.textContent = "Uploading " + file.name + "...";

      // Auto-fill title if empty
      const titleInput = document.getElementById("new-song-title");
      if (titleInput && !titleInput.value.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        titleInput.value = cleanName;
      }

      // Instant local blob URL for playback
      const localAudioBlob = URL.createObjectURL(file);
      if (srcInput) srcInput.value = localAudioBlob;

      const formData = new FormData();
      formData.append("audio", file);

      try {
        const API_URL = window.location.origin.includes("3000")
          ? "/api/songs/upload"
          : "http://localhost:3000/api/songs/upload";

        const res = await fetch(API_URL, {
          method: "POST",
          body: formData
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (srcInput) srcInput.value = data.filePath;
          if (fileNameDisplay) fileNameDisplay.textContent = "✅ " + file.name;
          showToast("🎵 Audio ready to add!");
        } else {
          if (srcInput) srcInput.value = localAudioBlob;
          if (fileNameDisplay) fileNameDisplay.textContent = "✅ " + file.name;
        }
      } catch (err) {
        console.warn("Audio upload fallback to local URL:", err);
        if (srcInput) srcInput.value = localAudioBlob;
        if (fileNameDisplay) fileNameDisplay.textContent = "✅ " + file.name;
      }
    });
  }

  // Handle Add Song Form Submit
  async function handleAddSongSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const titleInput = document.getElementById("new-song-title");
    const artistInput = document.getElementById("new-song-artist");
    const categorySelect = document.getElementById("new-song-category");
    const imageInput = document.getElementById("new-song-image");
    const srcInput = document.getElementById("new-song-src");
    const durationInput = document.getElementById("new-song-duration");
    const submitBtn = document.getElementById("modal-submit-btn");

    const title = (titleInput && titleInput.value ? titleInput.value.trim() : "") || "My Favorite Song";
    const artist = (artistInput && artistInput.value ? artistInput.value.trim() : "") || "Spotify Artist";
    const category = (categorySelect && categorySelect.value ? categorySelect.value : "Trending now near you");
    const image = (imageInput && imageInput.value ? imageInput.value.trim() : "") || "card1img.jpeg";
    const src = (srcInput && srcInput.value ? srcInput.value.trim() : "") || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3";
    const duration = (durationInput && durationInput.value ? durationInput.value.trim() : "") || "3:30";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = "Adding...";
    }

    const newSongData = { title, artist, category, image, src, duration };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const API_URL = window.location.origin.includes("3000")
        ? "/api/songs"
        : "http://localhost:3000/api/songs";

      const activeUser = getActiveUser();
      const userRole = activeUser ? (activeUser.role || "user") : "user";

      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole
        },
        body: JSON.stringify(newSongData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (res.status === 403) {
        showToast("🔒 " + (data.message || "Only the Playlist Owner can add songs"));
        return;
      }

      if (res.ok && data.success && data.song) {
        songs.push(data.song);
        showToast(`🎵 Added "${title}" to ${category}!`);
      } else {
        songs.push(newSongData);
        showToast(`🎵 Added "${title}" to ${category}!`);
      }
    } catch (err) {
      console.warn("Server unavailable; added track locally:", err);
      songs.push(newSongData);
      showToast(`🎵 Added "${title}" to ${category}!`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "Add Song";
      }
      resetAddSongForm();
      closeAddSongModal();

      // 1. Re-render home cards
      renderHomeCards();

      // 2. Switch to home view
      switchToHome();

      // 3. Immediately load and play the newly added song!
      const newIndex = songs.length - 1;
      loadSong(newIndex);
      playSong();

      // 4. Smoothly scroll newly added card into view with green pulse
      setTimeout(() => {
        const newCard = document.querySelector(`.card[data-song-index="${newIndex}"]`);
        if (newCard) {
          newCard.scrollIntoView({ behavior: "smooth", block: "center" });
          newCard.classList.add("just-added");
          setTimeout(() => newCard.classList.remove("just-added"), 3000);
        }
      }, 150);
    }
  }
  window.handleAddSongSubmit = handleAddSongSubmit;

  if (addSongForm) {
    addSongForm.addEventListener("submit", handleAddSongSubmit);
  }

  // =========================================================================
  // OWNER: DELETE SONG MODAL & BACKEND DELETE
  // =========================================================================
  const deleteModal = document.getElementById("delete-song-modal");
  const deleteConfirmText = document.getElementById("delete-song-confirm-text");
  const deleteConfirmBtn = document.getElementById("delete-confirm-btn");
  const deleteCancelBtn = document.getElementById("delete-cancel-btn");

  let songToDelete = null;
  let songIndexToDelete = null;

  function openDeleteModal(song, index) {
    if (!checkIsOwner()) {
      showToast("🔒 Access denied: Only the Playlist Owner can delete songs");
      return;
    }
    songToDelete = song;
    songIndexToDelete = index;

    if (deleteConfirmText) {
      deleteConfirmText.innerHTML = `Are you sure you want to remove <strong>"${song.title}"</strong> by <em>${song.artist}</em> from the Spotify playlist?`;
    }

    if (deleteModal) deleteModal.classList.add("active");
  }

  function closeDeleteModal() {
    songToDelete = null;
    songIndexToDelete = null;
    if (deleteModal) deleteModal.classList.remove("active");
  }

  if (deleteCancelBtn) deleteCancelBtn.addEventListener("click", closeDeleteModal);

  if (deleteModal) {
    deleteModal.addEventListener("click", (e) => {
      if (e.target === deleteModal) closeDeleteModal();
    });
  }

  // Execute deletion when confirmed
  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener("click", async () => {
      if (!songToDelete || songIndexToDelete === null) return;

      if (!checkIsOwner()) {
        showToast("🔒 Access denied: Only the Playlist Owner can delete songs");
        closeDeleteModal();
        return;
      }

      const song = songToDelete;
      const index = songIndexToDelete;
      const targetId = song._id || encodeURIComponent(song.title);

      deleteConfirmBtn.disabled = true;
      deleteConfirmBtn.innerText = "Deleting...";

      const activeUser = getActiveUser();
      const userRole = activeUser ? (activeUser.role || "user") : "user";

      try {
        const API_URL = window.location.origin.includes("3000")
          ? `/api/songs/${targetId}`
          : `http://localhost:3000/api/songs/${targetId}`;

        const res = await fetch(API_URL, {
          method: "DELETE",
          headers: {
            "x-user-role": userRole
          }
        });
        const data = await res.json();

        if (res.status === 403) {
          showToast("🔒 " + (data.message || "Only the Playlist Owner can delete songs"));
          return;
        }

        if (res.ok && data.success) {
          showToast(`🗑️ Deleted "${song.title}" from playlist`);
        } else {
          showToast(`🗑️ Removed "${song.title}"`);
        }
      } catch (err) {
        console.warn("Server unavailable; deleted locally:", err);
        showToast(`🗑️ Removed "${song.title}"`);
      } finally {
        deleteConfirmBtn.disabled = false;
        deleteConfirmBtn.innerText = "Delete";
        closeDeleteModal();

        // Remove from songs array
        const wasCurrentSong = currentSong === index;
        songs.splice(index, 1);

        // If we deleted the active song, handle player state
        if (wasCurrentSong) {
          if (songs.length > 0) {
            const nextIdx = Math.min(index, songs.length - 1);
            loadSong(nextIdx);
            if (isPlaying) playSong();
          } else {
            pauseSong();
            document.getElementById("current-album-title").innerText = "No Songs";
            document.getElementById("current-album-artist").innerText = "Add a song to start";
          }
        } else if (currentSong > index) {
          currentSong--;
        }

        // Re-render home cards
        renderHomeCards();

        // If search is active, refresh search results
        if (searchInput && searchInput.value.trim()) {
          searchInput.dispatchEvent(new Event("input"));
        }
      }
    });
  }

  // =========================================================================
  // USER AUTH STATE IN HEADER (Clean Profile display)
  // =========================================================================
  function updateAuthUI() {
    const authSection = document.getElementById("user-auth-section");
    if (!authSection) return;

    // Refresh Add/Delete UI elements according to owner status
    updateOwnerUI();

    const savedUserData = localStorage.getItem("spotify_user");
    if (savedUserData) {
      try {
        const user = JSON.parse(savedUserData);
        const isOwner = checkIsOwner();
        const initial = user.name ? user.name.charAt(0).toUpperCase() : (isOwner ? "👑" : "U");

        authSection.innerHTML = `
          <div class="user-profile-badge ${isOwner ? "owner-profile-badge" : ""}" title="${isOwner ? "Owner" : "User"}: ${user.name} (${user.email || ""})">
            <span class="user-avatar-circle ${isOwner ? "owner-avatar" : ""}">${isOwner ? "👑" : initial}</span>
            <span class="user-display-name">${user.name}</span>
            <span class="role-pill ${isOwner ? "owner-role-pill" : "user-role-pill"}">${isOwner ? "Owner" : "User"}</span>
          </div>
          <button id="logout-btn" class="badge nav-item logout-badge" title="Log out">Log Out</button>
        `;

        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) {
          logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("spotify_user");
            showToast("Logged out successfully");
            updateAuthUI();
            renderHomeCards();
          });
        }
      } catch (err) {
        localStorage.removeItem("spotify_user");
        updateAuthUI();
      }
    } else {
      // Guest visitor (Not logged in) - standard clean Spotify Sign up & Log in
      authSection.innerHTML = `
        <a href="signup.html" class="nav-auth-link signup-link">Sign up</a>
        <a href="signin.html" class="login-badge">Log in</a>
      `;
    }
  }

  // =========================================================================
  // PLAYER PLAYBACK CONTROLS & LISTENERS
  // =========================================================================
  const masterPlayBtn = document.getElementById("master-play-btn");
  if (masterPlayBtn) masterPlayBtn.addEventListener("click", togglePlay);

  document.getElementById("next-btn").addEventListener("click", nextSong);
  document.getElementById("prev-btn").addEventListener("click", prevSong);

  const shuffleBtn = document.getElementById("shuffle-btn");
  shuffleBtn.addEventListener("click", () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle("active-control", isShuffle);
    showToast(isShuffle ? "Shuffle on" : "Shuffle off");
  });

  const loopBtn = document.getElementById("loop-btn");
  loopBtn.addEventListener("click", () => {
    isLoop = !isLoop;
    loopBtn.classList.toggle("active-control", isLoop);
    showToast(isLoop ? "Repeat enabled" : "Repeat disabled");
  });

  const progressBar = document.getElementById("progress-bar");
  progressBar.addEventListener("input", () => {
    if (audio.duration) {
      audio.currentTime = (progressBar.value / 100) * audio.duration;
    }
  });

  const volumeBar = document.getElementById("volume-bar");
  const volumeIcon = document.getElementById("volume-icon");

  volumeBar.addEventListener("input", () => {
    audio.volume = volumeBar.value / 100;
    isMuted = audio.volume === 0;
    updateVolumeIcon();
  });

  volumeIcon.addEventListener("click", () => {
    if (isMuted) {
      isMuted = false;
      audio.volume = lastVolume || 0.8;
      volumeBar.value = (lastVolume || 0.8) * 100;
    } else {
      lastVolume = audio.volume;
      isMuted = true;
      audio.volume = 0;
      volumeBar.value = 0;
    }
    updateVolumeIcon();
  });

  function updateVolumeIcon() {
    if (audio.volume === 0 || isMuted) {
      volumeIcon.className = "fa-solid fa-volume-xmark control-icon";
    } else if (audio.volume < 0.4) {
      volumeIcon.className = "fa-solid fa-volume-low control-icon";
    } else {
      volumeIcon.className = "fa-solid fa-volume-high control-icon";
    }
  }

  const likeBtn = document.getElementById("album-like-btn");
  if (likeBtn) {
    likeBtn.addEventListener("click", () => {
      if (songs && songs.length > 0) {
        toggleLikeSong(songs[currentSong]);
      }
    });
  }

  // Browse podcasts button toast
  const podcastBtn = document.getElementById("browse-podcasts-btn");
  if (podcastBtn) {
    podcastBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showToast("Opening top trending podcasts...");
    });
  }

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" && (e.target.type === "text" || e.target.type === "url")) return;

    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      audio.currentTime = Math.min(audio.currentTime + 5, audio.duration || 0);
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      audio.currentTime = Math.max(audio.currentTime - 5, 0);
    } else if (e.code === "KeyM") {
      volumeIcon.click();
    }
  });

