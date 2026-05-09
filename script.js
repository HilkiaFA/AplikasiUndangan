const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz8763CetWtbFryY9ecS2WOVlg0g2_JLdkf90g74V0j5hD-ajBJQB2jq0UoI7Jveu0E/exec";

let guests = [];
let html5QrcodeScanner = null;

document.addEventListener("DOMContentLoaded", () => {
    fetchData();
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
    
    if (tabId === 'setup') {
        fetchData();
    }
}

function fetchData() {
    document.querySelector('#guestTable tbody').innerHTML = '<tr><td colspan="4">Memuat data dari Google Sheets...</td></tr>';
    
    fetch(SCRIPT_URL)
        .then(response => response.json())
        .then(data => {
            guests = data;
            renderTable();
        })
        .catch(error => {
            console.error('Error:', error);
            document.querySelector('#guestTable tbody').innerHTML = '<tr><td colspan="4" style="color:red;">Gagal memuat data. Periksa koneksi internet.</td></tr>';
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
let isProcessing = false;

function onScanSuccess(decodedText, decodedResult) {
    if (decodedText !== lastScan && !isProcessing) {
        lastScan = decodedText;
        processCheckIn(decodedText);
        setTimeout(() => { lastScan = ""; }, 3000); 
    }
}

function onScanFailure(error) {}

function manualCheckIn() {
    const query = document.getElementById('manualInput').value;
    processCheckIn(query);
}

function processCheckIn(query) {
    if (!query || isProcessing) return; 

    const queryClean = String(query).trim().toLowerCase();
    isProcessing = true;
    showMessage('scan-result', 'Menyinkronkan dengan server...', 'success');

    fetch(`${SCRIPT_URL}?action=update&id=${encodeURIComponent(queryClean)}`)
        .then(response => response.json())
        .then(data => {
            isProcessing = false;
            if (data.status === "success") {
                showMessage('scan-result', `✅ Berhasil! Selamat datang, ${data.nama}`, 'success');
                fetchData(); 
            } else if (data.status === "already_checked_in") {
                showMessage('scan-result', `⚠️ Tamu atas nama ${data.nama} SUDAH check-in sebelumnya!`, 'error');
            } else {
                showMessage('scan-result', `❌ Tidak terdaftar! Scanner membaca: "${query}"`, 'error');
            }
        })
        .catch(error => {
            isProcessing = false;
            showMessage('scan-result', '❌ Gagal terhubung ke server!', 'error');
        });
    
    document.getElementById('manualInput').value = '';
}

function showMessage(elementId, msg, type) {
    const el = document.getElementById(elementId);
    el.innerText = msg;
    el.className = `status-msg ${type}`;
    if (msg !== 'Menyinkronkan dengan server...') {
        setTimeout(() => el.innerText = '', 5000); 
    }
}