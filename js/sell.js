// js/sell.js

// DOM references
var sellSearchInput = document.getElementById('sellSearchInput');
var sellProductTableBody = document.getElementById('sellProductTableBody');
var sellLowStockSummary = document.getElementById('sellLowStockSummary');

var cartList = document.getElementById('cartList');
var totalPriceEl = document.getElementById('totalPrice');
var checkoutBtn = document.getElementById('checkoutBtn');
var scanBtn = document.getElementById('scanBtn');
var cameraInput = document.getElementById('cameraInput');

var currentUserId = null;
var products = [];   // inventory products
var cart = [];       // items being sold

/* ============================
   AUTH → LOAD PRODUCTS
   ============================ */
auth.onAuthStateChanged(function (user) {
  if (!user) return; // auth.js already redirects if needed
  currentUserId = user.uid;
  listenForProducts();
});

/* ============================
   REAL-TIME PRODUCTS
   ============================ */
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
      renderProductList();
    });
}

/* ============================
   RENDER PRODUCT TABLE
   ============================ */
function renderProductList() {
  var term = (sellSearchInput.value || '').toLowerCase();
  sellProductTableBody.innerHTML = '';
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
        '<td><button class="small">Add</button></td>';

      var addBtn = tr.querySelector('button');
      addBtn.addEventListener('click', function () {
        addToCart(p);
      });

      sellProductTableBody.appendChild(tr);
    });

  if (lowCount > 0) {
    sellLowStockSummary.textContent = lowCount + ' product(s) are low on stock (10 or less).';
  } else {
    sellLowStockSummary.textContent = '';
  }
}

if (sellSearchInput) {
  sellSearchInput.addEventListener('input', function () {
    renderProductList();
  });
}

/* ============================
   CART FUNCTIONS
   ============================ */
function addToCart(product) {
  if (product.quantity <= 0) {
    alert('This product is out of stock.');
    return;
  }

  var existing = cart.find(function (c) { return c.id === product.id; });

  if (existing) {
    if (existing.quantity >= product.quantity) {
      alert('No more stock available for ' + product.name);
      return;
    }
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      maxStock: product.quantity,
      quantity: 1
    });
  }
  renderCart();
}

function changeCartQty(id, delta) {
  var item = cart.find(function (c) { return c.id === id; });
  if (!item) return;

  var newQty = item.quantity + delta;
  if (newQty <= 0) {
    cart = cart.filter(function (c) { return c.id !== id; });
  } else if (newQty > item.maxStock) {
    alert('You cannot sell more than available stock.');
  } else {
    item.quantity = newQty;
  }
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(function (c) { return c.id !== id; });
  renderCart();
}

function renderCart() {
  cartList.innerHTML = '';
  var total = 0;

  if (cart.length === 0) {
    cartList.innerHTML = '<div class="item"><span class="text-muted">Cart is empty.</span></div>';
    totalPriceEl.textContent = 'Total: 0';
    return;
  }

  cart.forEach(function (item) {
    var lineTotal = item.price * item.quantity;
    total += lineTotal;

    var div = document.createElement('div');
    div.className = 'item';

    var left = document.createElement('div');
    left.textContent = item.name + ' (x' + item.quantity + ') - ' + lineTotal + ' tk';

    var controls = document.createElement('div');

    var btnDec = document.createElement('button');
    btnDec.textContent = '-';
    btnDec.className = 'small secondary';
    btnDec.style.marginRight = '4px';
    btnDec.addEventListener('click', function () {
      changeCartQty(item.id, -1);
    });

    var btnInc = document.createElement('button');
    btnInc.textContent = '+';
    btnInc.className = 'small secondary';
    btnInc.style.marginRight = '4px';
    btnInc.addEventListener('click', function () {
      changeCartQty(item.id, 1);
    });

    var btnDel = document.createElement('button');
    btnDel.textContent = '🗑';
    btnDel.className = 'small danger';
    btnDel.addEventListener('click', function () {
      removeFromCart(item.id);
    });

    controls.appendChild(btnDec);
    controls.appendChild(btnInc);
    controls.appendChild(btnDel);

    div.appendChild(left);
    div.appendChild(controls);
    cartList.appendChild(div);
  });

  totalPriceEl.textContent = 'Total: ' + total + ' tk';
}

/* ============================
   TEACHABLE MACHINE MODEL
   ============================ */
// Folder where model.json, metadata.json, weights.bin will live
const TM_MODEL_URL = "model/";

let tmModel;
let tmMaxPredictions;

async function loadTMModel() {
  try {
    const modelURL = TM_MODEL_URL + "model.json";
    const metadataURL = TM_MODEL_URL + "metadata.json";

    tmModel = await tmImage.load(modelURL, metadataURL);
    tmMaxPredictions = tmModel.getTotalClasses();
    console.log("Teachable Machine model loaded. Classes:", tmMaxPredictions);
  } catch (e) {
    console.error("Error loading TM model:", e);
  }
}

// Start loading model as soon as page loads
if (window.tmImage) {
  loadTMModel();
}

/* Identify product name from base64 image using TM model */
async function identifyProduct(imageBase64) {
  if (!tmModel) {
    alert("Model is not loaded yet. Please wait a moment and try again.");
    return null;
  }

  // Convert base64 → Image element
  const img = new Image();
  img.src = "data:image/jpeg;base64," + imageBase64;

  await new Promise(resolve => {
    img.onload = resolve;
  });

  // Predict
  const prediction = await tmModel.predict(img);

  // Sort by probability descending
  prediction.sort((a, b) => b.probability - a.probability);

  const best = prediction[0];
  console.log("TM prediction:", prediction);

  // If probability is too low, consider it unknown
  if (best.probability < 0.6) {
    return null;
  }

  return best.className; // This should match your inventory product name
}

/* ============================
   SCAN BUTTON: CAMERA / GALLERY
   ============================ */
if (scanBtn && cameraInput) {
  scanBtn.addEventListener('click', function () {
    cameraInput.value = ''; // reset
    cameraInput.click();
  });

  cameraInput.addEventListener('change', function () {
    var file = cameraInput.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = async function () {
      var base64 = reader.result.split(',')[1];

      var productName = await identifyProduct(base64);

      if (!productName) {
        alert('Could not recognize product. Try a clearer picture or re-train the model.');
        return;
      }

      var lower = productName.toLowerCase();

      // Try to find exact match in inventory
      var found = products.find(function (p) {
        return p.name.toLowerCase() === lower;
      });

      if (!found) {
        // fallback: contains
        found = products.find(function (p) {
          return p.name.toLowerCase().includes(lower);
        });
      }

      if (!found) {
        alert('Recognized: ' + productName + ' — but not found in your inventory list.');
      } else {
        addToCart(found);
        alert('Recognized: ' + productName + '\nAdded "' + found.name + '" to cart.');
      }
    };
    reader.readAsDataURL(file);
  });
}

/* ============================
   PDF RECEIPT
   ============================ */
function generateReceiptPDF(sale) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('PDF library not loaded.');
    return;
  }

  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF();
  var y = 10;

  doc.setFontSize(16);
  doc.text('StoreBuddy Receipt', 10, y);
  y += 8;

  doc.setFontSize(11);
  doc.text('Date: ' + sale.date, 10, y);
  y += 6;

  if (sale.id) {
    doc.text('Sale ID: ' + sale.id, 10, y);
    y += 6;
  }

  y += 4;
  doc.setFontSize(12);
  doc.text('Items:', 10, y);
  y += 6;

  doc.setFontSize(11);
  sale.items.forEach(function (item) {
    var line = item.productName +
      '  x ' + item.quantity +
      '  price ' + item.price +
      '  total ' + (item.price * item.quantity);
    doc.text(line, 10, y);
    y += 6;
    if (y > 270) {
      doc.addPage();
      y = 10;
    }
  });

  var total = sale.total || 0;
  var vat = Math.round(total * 0.05 * 100) / 100;
  var grandTotal = Math.round((total + vat) * 100) / 100;

  y += 4;
  doc.setFontSize(12);
  doc.text('Subtotal: ' + total + ' tk', 10, y);
  y += 6;
  doc.text('VAT (5%): ' + vat + ' tk', 10, y);
  y += 6;
  doc.text('Grand Total: ' + grandTotal + ' tk', 10, y);

  var filename = 'receipt_' + sale.date + (sale.id ? '_' + sale.id : '') + '.pdf';
  doc.save(filename);
}

/* ============================
   CHECKOUT: ONE SALE RECORD + PDF
   ============================ */
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', function () {
    if (!currentUserId) return;
    if (cart.length === 0) {
      alert('Cart is empty.');
      return;
    }

    var confirmSell = confirm('Save this sale, update inventory and create a receipt PDF?');
    if (!confirmSell) return;

    var today = new Date();
    var dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    var total = 0;
    var items = cart.map(function (item) {
      var lineTotal = item.price * item.quantity;
      total += lineTotal;
      return {
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price
      };
    });

    var saleDoc = {
      date: dateStr,
      createdAt: today.toISOString(),
      total: total,
      items: items
    };

    var salesRef = db.collection('users').doc(currentUserId).collection('sales');
    var productsRef = db.collection('users').doc(currentUserId).collection('products');

    salesRef.add(saleDoc)
      .then(function (docRef) {
        saleDoc.id = docRef.id;

        var invPromises = [];
        cart.forEach(function (item) {
          var currentProd = products.find(function (p) { return p.id === item.id; });
          if (currentProd) {
            var newQty = currentProd.quantity - item.quantity;
            if (newQty < 0) newQty = 0;
            invPromises.push(
              productsRef.doc(item.id).update({ quantity: newQty })
            );
          }
        });

        return Promise.all(invPromises).then(function () {
          generateReceiptPDF(saleDoc);

          alert('Sale saved, inventory updated and receipt created.');
          cart = [];
          renderCart();
        });
      })
      .catch(function (err) {
        alert('Error saving sale: ' + err.message);
      });
  });
}
