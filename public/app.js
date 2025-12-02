// Choices.js 初始化
const choices = new Choices('#multi', { removeItemButton: true });
const selectedList = document.getElementById('selected-list');
let sumbitted = false;

// 渲染已選擇的項目
const render = () => {
    selectedList.innerHTML = '';
    choices.getValue(true).forEach(v => {
        const li = document.createElement('li');
        li.textContent = v;
        li.dataset.value = v;
        selectedList.appendChild(li);
    });
};

// 監聽選擇變更
document.getElementById('multi').addEventListener('change', render);

// Sortable.js 初始化
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

// CSV input 監聽（選擇檔案後自動 POST）
const csvInput = document.getElementById("csvFile");

const postCSV = async () => {
    if (!csvInput.files.length) return;

    const formData = new FormData();
    formData.append('csvFile', csvInput.files[0]);
    formData.append('riskVector', document.getElementById('riskVector').value);

    const resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '處理中...';
    updateCreateTableBtn();

    const response = await fetch('/upload-csv', { method: 'POST', body: formData });
    const data = await response.json();
    sumbitted = true;

    if(data.totalRecords){
        // 將 JSON 轉成字串後存入 localStorage
        localStorage.setItem('csvData', JSON.stringify(data.data));
    }

    resultDiv.innerHTML = `
        <p>總筆數: ${data.totalRecords}</p>
        <h4>JSON資料:</h4>
        <pre>${JSON.stringify(data.data, null, 2)}</pre>
    `;

    updateCreateTableBtn();
};

csvInput.addEventListener('change', postCSV);

// Risk Vector 監聽（改變自動重新送出）
document.getElementById("riskVector").addEventListener("change", () => {
    if (!sumbitted) return;
    postCSV();
});

// Create Table 按鈕啟用/停用
const createTableBtn = document.getElementById('createTableBtn');

function updateCreateTableBtn() {
    const resultDiv = document.getElementById('result');
    let hasData = false;

    try {
        const pre = resultDiv.querySelector('pre');
        if (pre) {
            const data = JSON.parse(pre.innerText);
            if (Array.isArray(data) && data.length > 0) hasData = true;
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

// Create Table 按鈕簡化 onclick
createTableBtn.addEventListener('click', () => {
    const pre = document.querySelector('#result pre');
    const data = JSON.parse(pre.innerText);

    let tableHTML = '<table class="table-auto border border-gray-300 w-full">';
    tableHTML += '<thead><tr>';
    Object.keys(data[0]).forEach(key => tableHTML += `<th class="border px-2 py-1">${key}</th>`);
    tableHTML += '</tr></thead><tbody>';
    data.forEach(row => {
        tableHTML += '<tr>';
        Object.values(row).forEach(val => tableHTML += `<td class="border px-2 py-1">${val}</td>`);
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';

    document.getElementById('result').innerHTML = tableHTML;
});

document.getElementById('createTableBtn').addEventListener('click', () => {
    const header = choices.getValue(true);
    // 將 JSON 轉成字串後存入 localStorage
    localStorage.setItem('header', JSON.stringify(header));
    const chinese = choices.getValue(); //ex [{value: label}, ..]
    localStorage.setItem('chinese', JSON.stringify(chinese));
    // 在新分頁開啟 report.html
    window.open('report.html', '_blank');
});
