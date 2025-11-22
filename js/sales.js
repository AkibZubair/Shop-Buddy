// js/sales.js

var dateInput = document.getElementById('dateInput');
var loadBtn = document.getElementById('loadBtn');
var salesList = document.getElementById('salesList');

var saleIdInput = document.getElementById('saleIdInput');
var searchIdBtn = document.getElementById('searchIdBtn');

var currentUserId = null;

auth.onAuthStateChanged(function (user) {
  if (!user) return;
  currentUserId = user.uid;
});

/* ===== RENDER HELPER (with expandable details) ===== */
function renderSalesListFromSnapshot(snapshot) {
  salesList.innerHTML = '';

  if (snapshot.empty) {
    salesList.innerHTML =
      '<div class="item"><span class="text-muted">No sales found.</span></div>';
    return;
  }

  snapshot.forEach(function (docSnap) {
    var data = docSnap.data();
    var items = data.items || [];
    var total = data.total || 0;

    // outer container
    var wrapper = document.createElement('div');
    wrapper.className = 'sale-record'; // for styling

    // top row (summary + delete button)
    var topRow = document.createElement('div');
    topRow.className = 'sale-summary-row';

    var summary = document.createElement('div');
    summary.className = 'sale-summary';
    summary.textContent =
      'Sale ID: ' + docSnap.id +
      '  |  Items: ' + items.length +
      '  |  Total: ' + total +
      '  |  Date: ' + data.date +
      '  (click to see details)';

    var deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑';
    deleteBtn.className = 'small danger';
    deleteBtn.addEventListener('click', function (event) {
      event.stopPropagation(); // do not toggle details when deleting
      var sure = confirm('Are you sure you want to delete this sale?');
      if (!sure) return;

      db.collection('users')
        .doc(currentUserId)
        .collection('sales')
        .doc(docSnap.id)
        .delete()
        .then(function () {
          if (dateInput.value) {
            loadBtn.click();
          } else {
            salesList.innerHTML =
              '<div class="item"><span class="text-muted">Sale deleted.</span></div>';
          }
        })
        .catch(function (err) {
          alert('Error deleting record: ' + err.message);
        });
    });

    topRow.appendChild(summary);
    topRow.appendChild(deleteBtn);

    // details block (initially hidden)
    var details = document.createElement('div');
    details.className = 'sale-details';
    if (items.length === 0) {
      details.textContent = 'No item details stored.';
    } else {
      // each item on its own line
      items.forEach(function (it) {
        var line = document.createElement('div');
        line.textContent =
          it.productName +
          ' (Qty: ' + it.quantity +
          ', Price: ' + it.price + ' tk)';
        details.appendChild(line);
      });
    }

    // toggle details when clicking summary area
    summary.addEventListener('click', function () {
      var isHidden = details.style.display === '' || details.style.display === 'none';
      details.style.display = isHidden ? 'block' : 'none';
    });

    wrapper.appendChild(topRow);
    wrapper.appendChild(details);
    salesList.appendChild(wrapper);
  });
}

/* ===== LOAD BY DATE (no index needed) ===== */
if (loadBtn) {
  loadBtn.addEventListener('click', function () {
    if (!currentUserId) return;
    if (!dateInput.value) {
      salesList.innerHTML =
        '<div class="item"><span class="text-muted">Please choose a date.</span></div>';
      return;
    }

    salesList.innerHTML =
      '<div class="item"><span class="text-muted">Loading records...</span></div>';

    var salesRef = db.collection('users').doc(currentUserId).collection('sales');
    salesRef.where('date', '==', dateInput.value)
      .get()
      .then(function (snapshot) {
        renderSalesListFromSnapshot(snapshot);
      })
      .catch(function (err) {
        salesList.innerHTML =
          '<div class="item"><span class="text-warning">Error: ' + err.message + '</span></div>';
      });
  });
}

/* ===== SEARCH BY SALE ID (document ID) ===== */
if (searchIdBtn) {
  searchIdBtn.addEventListener('click', function () {
    if (!currentUserId) return;
    var saleId = (saleIdInput.value || '').trim();

    if (!saleId) {
      salesList.innerHTML =
        '<div class="item"><span class="text-muted">Please enter a Sale ID.</span></div>';
      return;
    }

    salesList.innerHTML =
      '<div class="item"><span class="text-muted">Searching by ID...</span></div>';

    var docRef = db.collection('users')
      .doc(currentUserId)
      .collection('sales')
      .doc(saleId);

    docRef.get()
      .then(function (docSnap) {
        if (!docSnap.exists) {
          salesList.innerHTML =
            '<div class="item"><span class="text-muted">No sale found with that ID.</span></div>';
          return;
        }

        var fakeSnapshot = {
          empty: false,
          forEach: function (fn) {
            fn(docSnap);
          }
        };
        renderSalesListFromSnapshot(fakeSnapshot);
      })
      .catch(function (err) {
        salesList.innerHTML =
          '<div class="item"><span class="text-warning">Error: ' + err.message + '</span></div>';
      });
  });
}
