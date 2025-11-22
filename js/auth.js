// js/auth.js

// Shared DOM elements (may be null on some pages)
var emailInput = document.getElementById('email');
var passwordInput = document.getElementById('password');
var message = document.getElementById('message');

// Register-page only
var registerBtn = document.getElementById('registerBtn');
var confirmPasswordInput = document.getElementById('confirmPassword');
var countrySelect = document.getElementById('country');
var phoneInput = document.getElementById('phone');

// Login-page only
var loginBtn = document.getElementById('loginBtn');

/* ===== LIVE PASSWORD MATCH HIGHLIGHT ===== */
function checkPasswordMatch() {
  if (!passwordInput || !confirmPasswordInput || !message) return;

  var pwd = passwordInput.value;
  var confirm = confirmPasswordInput.value;

  confirmPasswordInput.style.borderColor = '#d4d4d4';
  confirmPasswordInput.style.boxShadow = 'none';

  if (confirm === '') {
    if (message.textContent === 'Passwords do not match.') {
      message.textContent = '';
    }
    return;
  }

  if (pwd !== confirm) {
    confirmPasswordInput.style.borderColor = '#dc2626';
    confirmPasswordInput.style.boxShadow = '0 0 0 2px rgba(220,38,38,0.4)';
    message.className = 'error-text';
    message.textContent = 'Passwords do not match.';
  } else {
    confirmPasswordInput.style.borderColor = '#22c55e';
    confirmPasswordInput.style.boxShadow = '0 0 0 2px rgba(34,197,94,0.4)';
    if (message.textContent === 'Passwords do not match.') {
      message.textContent = '';
    }
  }
}

if (passwordInput && confirmPasswordInput) {
  passwordInput.addEventListener('input', checkPasswordMatch);
  confirmPasswordInput.addEventListener('input', checkPasswordMatch);
}

/* ===== REGISTER ===== */
function handleRegister() {
  if (!emailInput || !passwordInput || !confirmPasswordInput || !countrySelect || !message) return;

  var email = emailInput.value.trim();
  var password = passwordInput.value;
  var confirmPassword = confirmPasswordInput.value;
  var country = countrySelect.value;
  var phone = phoneInput ? phoneInput.value.trim() : '';

  message.className = 'error-text';
  message.textContent = '';

  if (!email || !password || !confirmPassword || !country) {
    message.textContent = 'Please fill in all required fields.';
    return;
  }

  if (password.length < 6) {
    message.textContent = 'Password must be at least 6 characters.';
    return;
  }

  if (password !== confirmPassword) {
    message.textContent = 'Passwords do not match.';
    checkPasswordMatch();
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then(function (userCred) {
      var uid = userCred.user.uid;

      return db.collection('users').doc(uid).set({
        email: email,
        country: country,
        phone: phone || null,
        createdAt: new Date().toISOString()
      });
    })
    .then(function () {
      message.className = 'success-text';
      message.textContent = 'Account created successfully. Redirecting to login...';
      setTimeout(function () {
        window.location.href = 'login.html';
      }, 1200);
    })
    .catch(function (err) {
      message.className = 'error-text';
      message.textContent = err.message;
    });
}

if (registerBtn) {
  registerBtn.addEventListener('click', function (e) {
    e.preventDefault();
    handleRegister();
  });
}

/* ===== LOGIN ===== */
function handleLogin() {
  if (!emailInput || !passwordInput || !message) return;

  var email = emailInput.value.trim();
  var password = passwordInput.value;

  message.className = 'error-text';
  message.textContent = '';

  if (!email || !password) {
    message.textContent = 'Please enter both email and password.';
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(function () {
      message.className = 'success-text';
      message.textContent = 'Login successful. Redirecting...';
      setTimeout(function () {
        window.location.href = 'dashboard.html';
      }, 1000);
    })
    .catch(function (err) {
      message.className = 'error-text';
      message.textContent = err.message;
    });
}

if (loginBtn) {
  loginBtn.addEventListener('click', function (e) {
    e.preventDefault();
    handleLogin();
  });
}

/* ===== ENTER KEY ===== */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    if (registerBtn) {
      e.preventDefault();
      handleRegister();
    } else if (loginBtn) {
      e.preventDefault();
      handleLogin();
    }
  }
});

/* ===== PROTECT PAGES (simple) ===== */
auth.onAuthStateChanged(function (user) {
  var protectedPages = ['dashboard.html','inventory.html','sell.html','sales.html'];
  var current = window.location.pathname.split('/').pop();

  if (!user && protectedPages.indexOf(current) !== -1) {
    window.location.href = 'login.html';
  }
});

/* ===== LOGOUT HELPER ===== */
function logout() {
  auth.signOut().then(function () {
    window.location.href = 'login.html';
  });
}

// make available to HTML (onclick="logout()")
window.logout = logout;
