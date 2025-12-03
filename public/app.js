/* --------------------------------------------------------
 *  Choices.js 初始化
 * -------------------------------------------------------- */
const choices = new Choices('#multi', { removeItemButton: true });
const selectedList = document.getElementById('selected-list');
let sumbitted = false;
const riskVectors = new Set();

/* --------------------------------------------------------
 *  渲染已選擇的項目
 * -------------------------------------------------------- */
const render = () => {
    selectedList.innerHTML = '';
    choices.getValue(true).forEach(v => {
        const li = document.createElement('li');
        li.textContent = v;
        li.dataset.value = v;
        selectedList.appendChild(li);
    });
};

document.getElementById('multi').addEventListener('change', render);

// Sortable.js 可排序
Sortable.create(selectedList, {
    animation: 150,
    onSort: () => {
        const priority = [...selectedList.children].map(li => li.dataset.value);
        console.log('priority:', priority);
    }
});

// 初始渲染
render();

// Reset 按鈕
document.getElementById("resetBtn").onclick = () => location.reload();

/* --------------------------------------------------------
 *  CSV 上傳與解析
 * -------------------------------------------------------- */
const csvInput = document.getElementById("csvFile");

const postCSV = async () => {
    if (!csvInput.files.length) return;
    localStorage.clear();

    const file = csvInput.files[0];
    const sizeMB = await detectCSVSize(file);

    console.log("CSV 檔案大小 (MB):", sizeMB);

    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('riskVector', document.getElementById('riskVector').value);

    const resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '處理中...';

    updateCreateTableBtn();

    const response = await fetch('/upload-csv', { method: 'POST', body: formData });
    const data = await response.json();
    sumbitted = true;

    // 解析 CSV 找 risk vector
    // Papa.parse(file, {
    //     header: true,
    //     skipEmptyLines: true,
    //     complete: function (result) {
            // const lowerArr = ['severe', 'material', 'moderate'];
            // result.data.forEach(row => {
            //     if (lowerArr.includes(String(row["Finding Severity"]).toLowerCase())) {
            //         riskVectors.add(row["Risk Vector"]);
            //     }
            // });

            // createOptionsFromArray([...riskVectors]);
    //    }
   // });

    /* --------------------------------------------------------
     * 儲存資料：< 5MB → localStorage；> 5MB → IndexedDB
     * -------------------------------------------------------- */
    if (data.totalRecords) {
        const jsonStr = JSON.stringify(data.data);

        if (sizeMB <= 5) {
            localStorage.setItem("csvData", jsonStr);
            localStorage.setItem("storageMode", "localStorage");
        } else {
            await saveToIndexedDB(data.data);
            localStorage.setItem("storageMode", "indexedDB");
        }
    }

    /* --------------------------------------------------------
     *  預覽第一筆資料
     * -------------------------------------------------------- */
    const firstRecord = data.data?.[0] ?? null;

    resultDiv.innerHTML = `
        <p>總筆數: ${data.totalRecords}</p>
        <h4>第一筆資料 (預覽 JSON)</h4>
        <pre style="
            background:#f8f8f8;
            padding:10px;
            border-radius:6px;
            border:1px solid #ddd;
            overflow:auto;
        ">
${firstRecord ? JSON.stringify(firstRecord, null, 2) : "（無資料）"}
        </pre>
    `;

    updateCreateTableBtn();
};

csvInput.addEventListener('change', postCSV);

// Risk Vector 變更時自動重新 POST
document.getElementById("riskVector").addEventListener("change", () => {
    if (!sumbitted) return;
    postCSV();
});

/* --------------------------------------------------------
 * Create Table 按鈕 啟用/停用修正版
 * -------------------------------------------------------- */
const createTableBtn = document.getElementById('createTableBtn');

function updateCreateTableBtn() {
    const pre = document.querySelector('#result pre');
    let hasData = false;

    try {
        if (pre) {
           hasData = true;
        }
    } catch {
        hasData = false;
    }

    if (hasData) {
        createTableBtn.disabled = false;
        createTableBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-green-600/50');
        createTableBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    } else {
        createTableBtn.disabled = true;
        createTableBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        createTableBtn.classList.add('bg-green-600/50', 'opacity-50', 'cursor-not-allowed');
    }
}

/* --------------------------------------------------------
 *  按下 Create Table 按鈕 → 儲存 header & chinese → 開啟 report.html
 * -------------------------------------------------------- */
document.getElementById('createTableBtn').addEventListener('click', () => {
    localStorage.setItem('header', JSON.stringify(choices.getValue(true)));
    localStorage.setItem('chinese', JSON.stringify(choices.getValue()));
    window.open('report.html', '_blank');
});

/* --------------------------------------------------------
 *  Risk Vector 下拉選單動態更新
 * -------------------------------------------------------- */
function createOptionsFromArray(array) {
    const originalSelect = document.getElementById("riskVector");
    const originalOptions = [...originalSelect.querySelectorAll('option')];

    originalSelect.innerHTML = ""; // 清空

    array.forEach(value => {
        const opt = originalOptions.find(o => o.value === value);
        if (opt) originalSelect.appendChild(opt.cloneNode(true));
    });
}

/* --------------------------------------------------------
 *  CSV 檔案大小偵測
 * -------------------------------------------------------- */
async function detectCSVSize(file) {
    return file.size / (1024 * 1024);
}

/* --------------------------------------------------------
 *  IndexedDB 儲存與讀取
 * -------------------------------------------------------- */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("CSV_DB", 1);

        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("csvStore")) {
                db.createObjectStore("csvStore", { keyPath: "id" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveToIndexedDB(data) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("csvStore", "readwrite");
        const store = tx.objectStore("csvStore");

        store.put({ id: "csvData", value: data });

        tx.oncomplete = resolve;
        tx.onerror = reject;
    });
}

async function loadFromIndexedDB() {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("csvStore", "readonly");
        const store = tx.objectStore("csvStore");

        const req = store.get("csvData");

        req.onsuccess = () => resolve(req.result?.value ?? null);
        req.onerror = reject;
    });
}
