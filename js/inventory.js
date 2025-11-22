// js/inventory.js

// DOM elements
var searchInput = document.getElementById('searchInput');
var productTableBody = document.getElementById('productTableBody');
var lowStockSummary = document.getElementById('lowStockSummary');

var showAddFormBtn = document.getElementById('showAddFormBtn');
var productPanel = document.getElementById('productPanel');
var panelTitle = document.getElementById('panelTitle');
var closePanelBtn = document.getElementById('closePanelBtn');
var panelName = document.getElementById('panelName');
var panelPrice = document.getElementById('panelPrice');
var panelQty = document.getElementById('panelQty');
var panelWarning = document.getElementById('panelWarning');
var saveProductBtn = document.getElementById('saveProductBtn');
var deleteProductBtn = document.getElementById('deleteProductBtn');

var currentUserId = null;
var products = [];
var editingProductId = null;

/* ===== AUTH READY → LOAD PRODUCTS ===== */
auth.onAuthStateChanged(function (user) {
  if (!user) return; // auth.js already redirects if needed
  currentUserId = user.uid;
  listenForProducts();
});

/* ===== REAL-TIME LISTENER ===== */
function listenForProducts() {
  db.collection('users')
    .doc(currentUserId)
    .collection('products')
    .orderBy('name')
    .onSnapshot(function (snapshot) {
      products = [];
      snapshot.forEach(function (docSnap) {
        var data = docSnap.data();
        products.push({
          id: docSnap.id,
          name: data.name || '',
          price: data.price || 0,
          quantity: data.quantity || 0
        });
      });
      renderProducts();
    });
}

/* ===== RENDER PRODUCT TABLE ===== */
function renderProducts() {
  var term = (searchInput.value || '').toLowerCase();
  productTableBody.innerHTML = '';
  var lowCount = 0;

  products
    .filter(function (p) {
      return p.name.toLowerCase().indexOf(term) !== -1;
    })
    .forEach(function (p) {
      if (p.quantity <= 10) lowCount++;

      var tr = document.createElement('tr');

      var statusHtml =
        p.quantity <= 10
          ? "<span class='table-low-stock'>Low stock</span>"
          : "<span class='table-ok'>OK</span>";

      tr.innerHTML =
        '<td>' + p.name + '</td>' +
        '<td>' + p.price + ' tk</td>' +
        '<td>' + p.quantity + '</td>' +
        '<td>' + statusHtml + '</td>' +
        '<td><button class="small secondary">Edit</button></td>';

      var editBtn = tr.querySelector('button');
      editBtn.addEventListener('click', function () {
        openEditPanel(p);
      });

      productTableBody.appendChild(tr);
    });

  if (lowCount > 0) {
    lowStockSummary.textContent = lowCount + ' product(s) are low on stock (10 or less).';
  } else {
    lowStockSummary.textContent = '';
  }
}

/* ===== PANEL HELPERS ===== */
function clearPanelFields() {
  panelName.value = '';
  panelPrice.value = '';
  panelQty.value = '';
  panelWarning.textContent = '';
}

function openAddPanel() {
  editingProductId = null;
  panelTitle.textContent = 'Add product';
  clearPanelFields();
  deleteProductBtn.style.display = 'none';
  productPanel.style.display = 'block';
}

function openEditPanel(p) {
  editingProductId = p.id;
  panelTitle.textContent = 'Edit product';
  panelName.value = p.name;
  panelPrice.value = p.price;
  panelQty.value = p.quantity;
  panelWarning.textContent = p.quantity <= 10 ? 'Warning: low stock (10 or less).' : '';
  deleteProductBtn.style.display = 'inline-block';
  productPanel.style.display = 'block';
}

function closePanel() {
  productPanel.style.display = 'none';
  editingProductId = null;
}

/* ===== EVENTS ===== */
if (showAddFormBtn) {
  showAddFormBtn.addEventListener('click', function () {
    openAddPanel();
  });
}

if (closePanelBtn) {
  closePanelBtn.addEventListener('click', function () {
    closePanel();
  });
}

if (searchInput) {
  searchInput.addEventListener('input', function () {
    renderProducts();
  });
}

/* ===== SAVE PRODUCT (ADD or UPDATE) ===== */
if (saveProductBtn) {
  saveProductBtn.addEventListener('click', function () {
    if (!currentUserId) return;

    var name = panelName.value.trim();
    var price = parseFloat(panelPrice.value);
    var qty = parseInt(panelQty.value, 10);

    if (!name || isNaN(price) || isNaN(qty)) {
      panelWarning.textContent = 'Please fill in all fields with valid values.';
      return;
    }

    if (qty <= 10) {
      panelWarning.textContent = 'Warning: low stock (10 or less).';
    } else {
      panelWarning.textContent = '';
    }

    var colRef = db.collection('users').doc(currentUserId).collection('products');
    var data = {
      name: name,
      price: price,
      quantity: qty
    };

    if (!editingProductId) {
      // add
      colRef.add(data).then(function () {
        closePanel();
      }).catch(function (err) {
        panelWarning.textContent = err.message;
      });
    } else {
      // update
      colRef.doc(editingProductId).update(data).then(function () {
        closePanel();
      }).catch(function (err) {
        panelWarning.textContent = err.message;
      });
    }
  });
}

/* ===== DELETE PRODUCT ===== */
if (deleteProductBtn) {
  deleteProductBtn.addEventListener('click', function () {
    if (!currentUserId || !editingProductId) return;
    var sure = confirm('Are you sure you want to delete this product?');
    if (!sure) return;

    db.collection('users')
      .doc(currentUserId)
      .collection('products')
      .doc(editingProductId)
      .delete()
      .then(function () {
        closePanel();
      })
      .catch(function (err) {
        panelWarning.textContent = err.message;
      });
  });
}
