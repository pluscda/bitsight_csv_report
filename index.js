import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// 取得當前檔案的目錄路徑 (ES modules中的__dirname替代方案)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const arr = ['Severe', 'Material', 'Moderate'];


// 轉成小寫陣列
const lowerArr = arr.map(item => item.toLowerCase());
const app = express();
const PORT = process.env.PORT || 3000;

// 中介軟體設定
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 設定靜態檔案目錄 - 修改這裡
app.use(express.static(path.join(__dirname, 'public')));

// 設定multer用於檔案上傳
const upload = multer({ 
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('只接受CSV檔案'), false);
        }
    }
});

// 健康檢查API
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: '服務運行正常',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// CSV檔案上傳API
app.post('/upload-csv', upload.single('csvFile'), async (req, res) => {
    try {

        const selectedRiskVector = req.body.riskVector;

        const results = [];
        const filePath = req.file.path;

        // 讀取並解析CSV檔案
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => {
                  //results.push(data)
                  const canAdd = lowerArr.includes(data["Finding Severity"].toLowerCase()) && data["Risk Vector"] == selectedRiskVector;
                  if(canAdd) results.push(data)
                })
                .on('end', () => {
                    resolve();
                })
                .on('error', (error) => {
                    reject(error);
                });
        });

        // 刪除上傳的暫存檔案
        fs.unlinkSync(filePath);

        // 回傳結果
        res.json({
            success: true,
            message: `成功處理CSV檔案共 ${results.length} 筆資料`,
            totalRecords: results.length,
            data: results
        });

    } catch (error) {
        console.error('處理CSV檔案時發生錯誤:', error);
        
        // 如果檔案存在，清理暫存檔案
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            error: '處理CSV檔案時發生錯誤',
            message: error.message
        });
    }
});

// 錯誤處理中介軟體
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            error: '檔案上傳錯誤',
            message: error.message
        });
    }
    
    res.status(500).json({
        error: '伺服器內部錯誤',
        message: error.message
    });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器運行在 http://localhost:${PORT}`);
   
});


