const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// 连接 SQLite 数据库
const db = new sqlite3.Database('data/hotels.db');

// 查询所有数据
db.all('SELECT * FROM hotels', (err, rows) => {
    if (err) {
        console.error('查询失败:', err);
        return;
    }

    let filters = {}
    provinces = new Set();
    brands = new Set();
    models = new Set();
    // 转换数据结构，与之前的 JSON 格式一致
    const data = rows.map(row => {
        if (row.province) {
            if (row.province.includes("省")) {
                provinces.add(row.province.slice(0, -1));
            } else {
                provinces.add(row.province);
            }
        }
        if (row.brand_name) {
            brands.add(row.brand_name);
        }
        if (row.tv_model) {
            models.add(row.tv_model);
        }
        return ({
            hotelName: row.hotel_name,
            brand: row.brand_name,    // 品牌名称
            subbrand: row.subbrand_name,
            model: row.tv_model,       // 电视机型号
            coordinates: `${row.longitude},${row.latitude}`, // 经纬度
            supply: row.tv_sales,     // 销售数量
            province: row.province,
            city: row.city,
            location: row.location,
        })
    });

    filters = {'provinces': ['全国'].concat(Array.from(provinces)), 
               'brands': ['所有品牌'].concat(Array.from(brands)), 
               'models': ['所有型号'].concat(Array.from(models))}
    fs.writeFileSync('data/filters.json', JSON.stringify(filters, null, 2));
    console.log('已生成 filters.json');

    // 保存为 data.json
    fs.writeFileSync('data/data.json', JSON.stringify(data, null, 2));
    console.log('已生成 data.json');
    db.close();
});