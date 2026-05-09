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

// ================= PERUBAHAN FUNGSI MANUAL CHECK-IN =================
function manualCheckIn() {
    const query = document.getElementById('manualInput').value.trim().toLowerCase();
    
    if (!query) {
        Swal.fire({
            icon: 'warning',
            title: 'Kolom Kosong',
            text: 'Silakan ketik nama atau ID tamu terlebih dahulu!',
            confirmButtonColor: '#f59e0b'
        });
        return;
    }

    const guest = guests.find(g => 
        g.id.toLowerCase() === query || 
        g.nama.toLowerCase().includes(query) 
    );

    if (guest) {
        processCheckIn(guest.id);
    } else {
        Swal.fire({
            icon: 'error',
            title: 'TIDAK DITEMUKAN',
            text: `Tidak ada tamu dengan nama atau ID "${document.getElementById('manualInput').value}"`,
            confirmButtonColor: '#ef4444'
        });
    }
}
function processCheckIn(query) {
    if (!query || isProcessing) return; 

    const queryClean = String(query).trim().toLowerCase();
    isProcessing = true;

    Swal.fire({
        title: 'Memeriksa Tiket...',
        text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    fetch(`${SCRIPT_URL}?action=update&id=${encodeURIComponent(queryClean)}`)
        .then(response => response.json())
        .then(data => {
            isProcessing = false;
            
            if (data.status === "success") {
                Swal.fire({
                    icon: 'success',
                    title: 'BERHASIL!',
                    html: `Selamat datang,<br><b style="font-size: 20px;">${data.nama}</b><br>Kategori: ${data.kategori}`,
                    confirmButtonColor: '#10b981'
                });
                fetchData();
                
            } else if (data.status === "already_checked_in") {
                Swal.fire({
                    icon: 'warning',
                    title: 'SUDAH HADIR',
                    html: `Tamu atas nama <b>${data.nama}</b> sudah melakukan scan sebelumnya!`,
                    confirmButtonColor: '#f59e0b'
                });
                
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'TIDAK VALID',
                    text: 'Barcode ini tidak terdaftar dalam buku tamu.',
                    confirmButtonColor: '#ef4444'
                });
            }
        })
        .catch(error => {
            isProcessing = false;
            Swal.fire({
                icon: 'error',
                title: 'Gagal Terhubung',
                text: 'Pastikan HP Anda terhubung ke internet.',
                confirmButtonColor: '#ef4444'
            });
        });
    
    document.getElementById('manualInput').value = '';
}

function showMessage(elementId, msg, type) {
}