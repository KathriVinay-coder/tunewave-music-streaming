// Authentication client logic for Sign In and Sign Up
document.addEventListener("DOMContentLoaded", () => {
  // Determine API base URL (works on http://localhost:3000, 5501, or file://)
  const API_BASE = window.location.origin.includes("3000")
    ? ""
    : "http://localhost:3000";

  const alertBox = document.getElementById("auth-alert");
  const submitBtn = document.getElementById("submit-btn");

  // Helper: Display alert message (supports HTML for helpful links)
  function showAlert(message, type = "error") {
    alertBox.innerHTML = message;
    alertBox.className = `auth-alert ${type}`;
    alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function hideAlert() {
    alertBox.textContent = "";
    alertBox.className = "auth-alert";
  }

  // =========================================================================
  // Role Tabs & Auto-Fill for Viewer and Owner
  // =========================================================================
  let selectedRole = "viewer"; // 'viewer' or 'owner'
  const tabViewer = document.getElementById("tab-viewer");
  const tabOwner = document.getElementById("tab-owner");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const emailLabel = document.getElementById("email-label");

  function setRole(role) {
    selectedRole = role;
    if (role === "owner") {
      if (tabOwner) {
        tabOwner.classList.add("active-owner");
        tabOwner.classList.remove("active-viewer");
      }
      if (tabViewer) {
        tabViewer.classList.remove("active-viewer", "active-owner");
      }
      if (emailLabel) emailLabel.textContent = "Owner Email address";
      if (emailInput) emailInput.placeholder = "owner@spotify.com";
      if (submitBtn) {
        submitBtn.textContent = "Log In as Playlist Owner";
        submitBtn.style.background = "linear-gradient(135deg, #f59e0b, #d97706)";
      }
    } else {
      if (tabViewer) {
        tabViewer.classList.add("active-viewer");
        tabViewer.classList.remove("active-owner");
      }
      if (tabOwner) {
        tabOwner.classList.remove("active-viewer", "active-owner");
      }
      if (emailLabel) emailLabel.textContent = "Viewer Email address";
      if (emailInput) emailInput.placeholder = "name@domain.com";
      if (submitBtn) {
        submitBtn.textContent = "Log In as Viewer";
        submitBtn.style.background = "#1ed760";
      }
    }
  }

  if (tabViewer) tabViewer.addEventListener("click", () => setRole("viewer"));
  if (tabOwner) tabOwner.addEventListener("click", () => setRole("owner"));

  // =========================================================================
  // Forgot Password Modal & Email Sending Workflow
  // =========================================================================
  const forgotModal = document.getElementById("forgot-password-modal");
  const closeForgotModalBtn = document.getElementById("close-forgot-modal");
  const forgotRequestForm = document.getElementById("forgot-request-form");
  const forgotVerifyForm = document.getElementById("forgot-verify-form");
  const forgotEmailInput = document.getElementById("forgot-email");
  const forgotModalAlert = document.getElementById("forgot-modal-alert");
  const sendResetBtn = document.getElementById("send-reset-btn");
  const resetPasswordBtn = document.getElementById("reset-password-btn");

  function showForgotAlert(msg, type = "error") {
    if (!forgotModalAlert) return;
    forgotModalAlert.innerHTML = msg;
    forgotModalAlert.className = `auth-alert ${type}`;
    forgotModalAlert.style.display = "block";
  }

  function hideForgotAlert() {
    if (!forgotModalAlert) return;
    forgotModalAlert.innerHTML = "";
    forgotModalAlert.style.display = "none";
  }

  function openForgotModal(prefillEmail = "") {
    if (!forgotModal) return;
    hideForgotAlert();
    if (forgotEmailInput) {
      forgotEmailInput.value = prefillEmail || (emailInput && emailInput.value ? emailInput.value.trim() : "");
    }
    if (forgotRequestForm) forgotRequestForm.style.display = "block";
    if (forgotVerifyForm) forgotVerifyForm.style.display = "none";
    forgotModal.style.display = "flex";
  }
  window.openForgotModal = openForgotModal;

  function closeForgotModal() {
    if (forgotModal) forgotModal.style.display = "none";
    hideForgotAlert();
  }

  const formForgotLink = document.getElementById("form-forgot-password-link");
  if (formForgotLink) {
    formForgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      openForgotModal();
    });
  }

  if (closeForgotModalBtn) {
    closeForgotModalBtn.addEventListener("click", closeForgotModal);
  }

  if (forgotModal) {
    forgotModal.addEventListener("click", (e) => {
      if (e.target === forgotModal) closeForgotModal();
    });
  }

  // Step 1: Submit email to send reset code
  let targetResetEmail = "";
  if (forgotRequestForm) {
    forgotRequestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideForgotAlert();

      const email = forgotEmailInput ? forgotEmailInput.value.trim() : "";
      if (!email) {
        showForgotAlert("Please enter your email address.");
        return;
      }

      if (sendResetBtn) {
        sendResetBtn.disabled = true;
        sendResetBtn.textContent = "Sending Email...";
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const data = await response.json();

        if (response.ok && data.success) {
          targetResetEmail = data.email;
          showForgotAlert(`
            Reset code sent to <strong>${data.email}</strong>.<br>
            <span style="font-size: 0.85rem; color: #fff;">Your code is: <strong>${data.resetCode}</strong></span>
          `, "success");

          // Transition to Step 2: enter code & new password
          if (forgotRequestForm) forgotRequestForm.style.display = "none";
          if (forgotVerifyForm) {
            forgotVerifyForm.style.display = "block";
            const codeInput = document.getElementById("reset-code");
            if (codeInput) {
              codeInput.value = data.resetCode || "";
              codeInput.focus();
            }
          }
        } else {
          showForgotAlert(data.message || "Unable to send reset email.");
        }
      } catch (err) {
        console.error("Forgot password request failed:", err);
        showForgotAlert("❌ Could not connect to server. Please try again.");
      } finally {
        if (sendResetBtn) {
          sendResetBtn.disabled = false;
          sendResetBtn.textContent = "Send Email to My Address";
        }
      }
    });
  }

  // Step 2: Submit code & new password
  if (forgotVerifyForm) {
    forgotVerifyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideForgotAlert();

      const resetCode = document.getElementById("reset-code").value.trim();
      const newPassword = document.getElementById("reset-new-password").value;

      if (!resetCode || !newPassword) {
        showForgotAlert("Please enter both the reset code and your new password.");
        return;
      }

      if (newPassword.length < 6) {
        showForgotAlert("Password must be at least 6 characters long.");
        return;
      }

      if (resetPasswordBtn) {
        resetPasswordBtn.disabled = true;
        resetPasswordBtn.textContent = "Updating Password...";
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: targetResetEmail || (forgotEmailInput ? forgotEmailInput.value.trim() : ""),
            resetCode,
            newPassword
          })
        });
        const data = await response.json();

        if (response.ok && data.success) {
          showForgotAlert("🎉 Password reset successfully! Redirecting to login...", "success");
          setTimeout(() => {
            closeForgotModal();
            showAlert("✅ Password updated! Please log in with your new password.", "success");
            if (passwordInput) passwordInput.value = newPassword;
            if (emailInput && targetResetEmail) emailInput.value = targetResetEmail;
          }, 1200);
        } else {
          showForgotAlert(`❌ ${data.message || "Invalid verification code."}`);
        }
      } catch (err) {
        console.error("Reset password failed:", err);
        showForgotAlert("❌ Could not connect to server. Please try again.");
      } finally {
        if (resetPasswordBtn) {
          resetPasswordBtn.disabled = false;
          resetPasswordBtn.textContent = "Save New Password";
        }
      }
    });
  }

  // 1. Handle Sign In Form Submission (Both Viewer & Owner require Email & Password)
  const signinForm = document.getElementById("signin-form");
  if (signinForm) {
    signinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();

      const email = emailInput ? emailInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";

      if (!email || !password) {
        showAlert("Please fill in both email and password.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = `Logging in as ${selectedRole === "owner" ? "Owner" : "Viewer"}...`;

      try {
        const response = await fetch(`${API_BASE}/api/auth/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // If user specifically picked Viewer tab or account is regular user, ensure role is user
          if (selectedRole === "viewer" && data.user.email !== "owner@spotify.com") {
            data.user.role = "user";
          }
          // Save user to localStorage
          localStorage.setItem("spotify_user", JSON.stringify(data.user));

          const roleBadge = data.user.role === "owner" ? "👑 Owner" : "🎧 Viewer";
          showAlert(`Logged in as ${roleBadge}! Redirecting...`, "success");

          setTimeout(() => {
            window.location.href = "index.html";
          }, 900);
        } else {
          // Display failure message with clear suggestions to sign up or reset password
          const serverMsg = data.message || "Invalid email or password.";

          if (serverMsg.includes("Wrong password")) {
            showAlert(`
              <div style="line-height: 1.5;">
                <div style="font-weight: 700; margin-bottom: 0.35rem;">${serverMsg}</div>
                <div style="font-size: 0.82rem; margin-top: 0.4rem; padding-top: 0.35rem; border-top: 1px solid rgba(255,255,255,0.2);">
                  Forgot your password? 
                  <a href="#" id="forgot-password-link" style="color: #fff; text-decoration: underline; font-weight: 700; margin-left: 0.25rem;">Reset password</a>
                </div>
              </div>
            `);

            // Hook up password reset modal
            const resetLink = document.getElementById("forgot-password-link");
            if (resetLink) {
              resetLink.addEventListener("click", (ev) => {
                ev.preventDefault();
                openForgotModal(email);
              });
            }
          } else {
            // Unregistered email or invalid account
            showAlert(`
              <div style="line-height: 1.5;">
                <div style="font-weight: 700; margin-bottom: 0.35rem;">Invalid email or password.</div>
                <div style="font-size: 0.82rem; margin-top: 0.4rem; padding-top: 0.35rem; border-top: 1px solid rgba(255,255,255,0.2);">
                  Don't have an account yet? 
                  <a href="signup.html" style="color: #fff; text-decoration: underline; font-weight: 700; margin-left: 0.25rem;">Sign up for Spotify</a> 
                  or 
                  <a href="#" id="forgot-password-link" style="color: #fff; text-decoration: underline; font-weight: 700; margin-left: 0.25rem;">Forgot password?</a>
                </div>
              </div>
            `);

            const resetLink = document.getElementById("forgot-password-link");
            if (resetLink) {
              resetLink.addEventListener("click", (ev) => {
                ev.preventDefault();
                openForgotModal(email);
              });
            }
          }
        }
      } catch (err) {
        console.error("Login error:", err);
        showAlert("Cannot connect to server. Please check your connection.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = selectedRole === "owner" ? "Log In as Playlist Owner" : "Log In as Viewer";
      }
    });
  }

  // 2. Handle Sign Up Form Submission
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();

      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirm-password").value;

      // Validation
      if (!name || !email || !password || !confirmPassword) {
        showAlert("Please fill in all fields.");
        return;
      }

      if (password.length < 6) {
        showAlert("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        showAlert("Passwords do not match. Please try again.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Creating account...";

      try {
        const response = await fetch(`${API_BASE}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Save user to localStorage
          localStorage.setItem("spotify_user", JSON.stringify(data.user));
          showAlert("Account created successfully! Redirecting...", "success");

          setTimeout(() => {
            window.location.href = "index.html";
          }, 1200);
        } else {
          showAlert(data.message || "Failed to create account.");
        }
      } catch (err) {
        console.error("Signup request failed:", err);
        showAlert("Cannot connect to server. Make sure MongoDB backend is running (npm start).");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign Up";
      }
    });
  }
});
