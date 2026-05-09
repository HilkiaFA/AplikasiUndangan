let guests = JSON.parse(localStorage.getItem('guests')) || [];
let html5QrcodeScanner = null;

document.addEventListener("DOMContentLoaded", () => {
    renderTable();
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    if (tabId === 'scanner') {
        startScanner();
    } else if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
    }
}

function processCSV() {
    const fileInput = document.getElementById('csvFileInput');
    if (!fileInput.files[0]) {
        showMessage('setup-status', 'Pilih file CSV terlebih dahulu!', 'error');
        return;
    }

    Papa.parse(fileInput.files[0], {
        header: true,
        skipEmptyLines: true,
        transformHeader: function(header) {
            return header.trim().toLowerCase();
        },
        complete: function(results) {
            console.log("Data mentah dari CSV:", results.data);

            const validData = results.data.filter(row => row.id && row.id.trim() !== "");

            if (validData.length === 0) {
                showMessage('setup-status', 'Data kosong! Pastikan ada kolom "id", "nama", dan "kategori".', 'error');
                return;
            }

            guests = validData.map(row => ({
                id: (row.id || '').trim(),
                nama: (row.nama || '').trim(),
                kategori: (row.kategori || '').trim(),
                hadir: false
            }));
            
            saveData();
            renderTable();
            showMessage('setup-status', `Berhasil! ${guests.length} data tamu ditambahkan.`, 'success');
        }
    });
}

function renderTable() {
    const tbody = document.querySelector('#guestTable tbody');
    tbody.innerHTML = '';
    guests.forEach(g => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${g.id}</td>
            <td>${g.nama}</td>
            <td>${g.kategori}</td>
            <td style="color: ${g.hadir ? 'green' : 'red'}"><b>${g.hadir ? 'Hadir' : 'Belum'}</b></td>
        `;
        tbody.appendChild(tr);
    });
}

function saveData() {
    localStorage.setItem('guests', JSON.stringify(guests));
}

function clearData() {
    if(confirm("Yakin ingin menghapus semua data tamu?")) {
        guests = [];
        saveData();
        renderTable();
    }
}

let qrcode = null;

function findGuest() {
    const query = document.getElementById('guestSearch').value.trim().toLowerCase();
    const guest = guests.find(g => g.id.toLowerCase() === query || g.nama.toLowerCase().includes(query));
    
    const resultDiv = document.getElementById('guest-result');
    const qrContainer = document.getElementById('qrcode-container');
    const instruction = document.getElementById('guest-instruction');
    
    if (guest) {
        resultDiv.classList.remove('hidden');
        document.getElementById('guest-name-display').innerText = guest.nama;
        document.getElementById('guest-category-display').innerText = guest.kategori;
        
        qrContainer.innerHTML = ''; 
        if (guest.kategori.toLowerCase() === 'digital') {
            qrcode = new QRCode(qrContainer, {
                text: String(guest.id).trim(), 
                width: 150,
                height: 150
            });
            instruction.innerText = "Tunjukkan QR Code ini di pintu masuk.";
        } else {
            instruction.innerText = "Anda adalah tamu VIP/Fisik. Silakan sebutkan nama Anda di meja resepsionis.";
        }
    } else {
        alert("Data tamu tidak ditemukan!");
        resultDiv.classList.add('hidden');
    }
}

function startScanner() {
    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} });
        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    }
}

let lastScan = "";

function onScanSuccess(decodedText, decodedResult) {
    if (decodedText !== lastScan) {
        lastScan = decodedText;
        processCheckIn(decodedText);
        
        setTimeout(() => { lastScan = ""; }, 3000); 
    }
}

function onScanFailure(error) {
}

function manualCheckIn() {
    const query = document.getElementById('manualInput').value;
    processCheckIn(query);
}

function processCheckIn(query) {
    if (!query) return; 

    const queryClean = String(query).trim().toLowerCase();
    
    const guestIndex = guests.findIndex(g => 
        String(g.id).trim().toLowerCase() === queryClean || 
        String(g.nama).trim().toLowerCase() === queryClean
    );
    
    if (guestIndex !== -1) {
        if (guests[guestIndex].hadir) {
            showMessage('scan-result', `⚠️ Tamu atas nama ${guests[guestIndex].nama} SUDAH check-in sebelumnya!`, 'error');
        } else {
            guests[guestIndex].hadir = true;
            saveData();
            renderTable();
            showMessage('scan-result', `✅ Berhasil! Selamat datang, ${guests[guestIndex].nama} (${guests[guestIndex].kategori})`, 'success');
        }
    } else {
        showMessage('scan-result', `❌ Tidak terdaftar! Scanner membaca: "${query}"`, 'error');
    }
    
    document.getElementById('manualInput').value = '';
}

function showMessage(elementId, msg, type) {
    const el = document.getElementById(elementId);
    el.innerText = msg;
    el.className = `status-msg ${type}`;
    setTimeout(() => el.innerText = '', 5000); 
}