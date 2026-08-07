(() => {
  "use strict";

  const DUMMY_DURATION_SECONDS = 30;

  const setCards = [...document.querySelectorAll("[data-set-card]")];
  const setSelectors = [...document.querySelectorAll(".set-selector")];
  const fileInputs = [...document.querySelectorAll(".file-input")];
  const songButtons = [...document.querySelectorAll(".song-button")];
  const disc = document.querySelector(".disc");
  const discLabel = document.querySelector(".disc-label");
  const player = document.querySelector(".player");
  const playButton = document.querySelector(".play-button");
  const playIcon = document.querySelector(".play-icon");
  const seekInput = document.querySelector(".seek-input");
  const currentTimeElement = document.querySelector(".current-time");

  let activeSet = 1;
  let activeSong = 1;
  let currentPosition = 0;
  let isPlaying = false;
  let animationFrame = null;
  let previousFrameTime = 0;

  const formatTime = (seconds) => {
    const wholeSeconds = Math.floor(Math.max(0, seconds));
    const minutes = Math.floor(wholeSeconds / 60);
    const remainingSeconds = wholeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const updateTimeline = () => {
    const formattedCurrent = formatTime(currentPosition);
    const formattedTotal = formatTime(DUMMY_DURATION_SECONDS);

    seekInput.value = String(currentPosition);
    seekInput.setAttribute("aria-valuetext", `${formattedCurrent} of ${formattedTotal}`);
    currentTimeElement.textContent = formattedCurrent;
    currentTimeElement.dateTime = `PT${Math.floor(currentPosition)}S`;
  };

  const updatePlayerState = () => {
    player.classList.toggle("is-playing", isPlaying);
    player.classList.toggle("is-paused", !isPlaying);
    player.dataset.playerState = isPlaying ? "playing" : "paused";
    playButton.setAttribute("aria-pressed", String(isPlaying));
    playButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
    playIcon.textContent = isPlaying ? "⏸" : "▶";
  };

  const pause = () => {
    isPlaying = false;
    previousFrameTime = 0;

    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    updatePlayerState();
  };

  const resetPlayback = () => {
    pause();
    currentPosition = 0;
    updateTimeline();
  };

  const advancePlayback = (frameTime) => {
    if (!isPlaying) {
      return;
    }

    if (previousFrameTime === 0) {
      previousFrameTime = frameTime;
    } else {
      currentPosition += (frameTime - previousFrameTime) / 1000;
      previousFrameTime = frameTime;
    }

    if (currentPosition >= DUMMY_DURATION_SECONDS) {
      currentPosition = DUMMY_DURATION_SECONDS;
      updateTimeline();
      pause();
      return;
    }

    updateTimeline();
    animationFrame = requestAnimationFrame(advancePlayback);
  };

  const play = () => {
    if (currentPosition >= DUMMY_DURATION_SECONDS) {
      currentPosition = 0;
      updateTimeline();
    }

    isPlaying = true;
    previousFrameTime = 0;
    updatePlayerState();
    animationFrame = requestAnimationFrame(advancePlayback);
  };

  setSelectors.forEach((button) => {
    button.addEventListener("click", () => {
      const nextSet = Number(button.dataset.set);

      if (nextSet === activeSet) {
        return;
      }

      activeSet = nextSet;
      setCards.forEach((card) => {
        card.classList.toggle("is-active", Number(card.dataset.setCard) === activeSet);
      });
      setSelectors.forEach((selector) => {
        selector.setAttribute("aria-pressed", String(Number(selector.dataset.set) === activeSet));
      });
      resetPlayback();
    });
  });

  fileInputs.forEach((input) => {
    input.addEventListener("change", () => {
      const isLoaded = Boolean(input.files && input.files.length > 0);
      const trigger = document.querySelector(`label[for="${input.id}"]`);

      trigger.classList.toggle("is-loaded", isLoaded);
      input.setAttribute(
        "aria-label",
        `SET ${String(input.dataset.set).padStart(2, "0")} ${input.dataset.sound} audio file, ${isLoaded ? "loaded" : "unloaded"}`,
      );
    });
  });

  songButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextSong = Number(button.dataset.song);

      if (nextSong === activeSong) {
        return;
      }

      activeSong = nextSong;
      songButtons.forEach((songButton) => {
        const isActive = Number(songButton.dataset.song) === activeSong;
        songButton.classList.toggle("is-active", isActive);
        songButton.setAttribute("aria-pressed", String(isActive));
      });
      discLabel.textContent = `CD ${String(activeSong).padStart(2, "0")}`;
      disc.setAttribute("aria-label", `CD placeholder for song ${activeSong}`);
      resetPlayback();
    });
  });

  playButton.addEventListener("click", () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  });

  seekInput.addEventListener("input", () => {
    currentPosition = Number(seekInput.value);
    previousFrameTime = isPlaying ? performance.now() : 0;
    updateTimeline();
  });

  updateTimeline();
  updatePlayerState();
})();
