// 初始化地图和饼状图
const mapChart = echarts.init(document.getElementById('map'));
const chart = echarts.init(document.getElementById('chart'));
// const pieChart = echarts.init(document.getElementById('pie'));
let currentMap = 'china';

// 加载 SQLite 数据（用 Node.js 预处理生成 JSON）
function loadData() {
    fetch('data/data.json')
        .then(res => {
            if (!res.ok) throw new Error('加载 data.json 失败');
            return res.json();
        })
        .then(data => {
            window.projectData = data;  // 全局存储
            updateAll(data);
        })
        .catch(err => {
            alert(`加载 data.json 失败: ${err.message}`);
            // 备用方案：嵌入默认数据（可选）
            window.projectData = [/* 示例数据 */];
            updateAll(window.projectData);
        });
}

function loadFilters() {
    fetch('filters.json').then(res => {
        if (!res.ok) {
            throw new Error('failed to load data.json!')
        }
        return res.json()
    })
    .then(data => {
        window.filtersData = data;
        initFilters(data);
    })
    .catch(err => {
        alert('loadFilters failed with exception: ', err);
        window.filtersData = {'brands': [], 'provinces': [], 'models': []}
        initFilters(window.filtersData);
    })
}

// 初始化筛选器
function initFilters(data) {
    const brandFilter = document.getElementById('brandFilter');
    brandFilter.innerHTML = data['brands'].map(b => `<option>${b}</option>`).join('') 

    const provinceFilter = document.getElementById('provinceFilter');
    provinceFilter.innerHTML = data['provinces'].map(b => `<option>${b}</option>`).join('')

    const modelFilter = document.getElementById('modelFilter');
    modelFilter.innerHTML = data['models'].map(b => `<option>${b}</option>`).join('')
}

function fillBrandList(brands) {
    const brandList = document.getElementById('brand-list');
    let selectedItem = null; // 跟踪当前选中的 item
    brandList.innerHTML = ''; // 清空现有内容
    for (const brand of brands) {
        const item = document.createElement('div');
        item.className = 'brand-item';
        item.textContent = brand;

        // 点击事件
        item.addEventListener('click', function() {
            // 如果已经有选中项且不是当前点击的项，取消前一个选中
            if (selectedItem && selectedItem !== this) {
                selectedItem.classList.remove('selected');
            }

            // 切换当前项的选中状态
            this.classList.toggle('selected');

            // 更新 selectedItem
            if (this.classList.contains('selected')) {
                selectedItem = this; // 当前项被选中
            } else {
                selectedItem = null; // 取消选中后清空
            }

            console.log(`当前选中: ${selectedItem ? selectedItem.textContent : '无'}`);

            // document.getElementById('brandFilter').value = selectedItem.textContent;
            // console.log(`textContent: ${selectedItem.textContent} value: ${document.getElementById('brandFilter').value}`)
            filteredByBrand(selectedItem.textContent);
        });
        brandList.appendChild(item);
    }
}

// 更新地图（保持不变，但从数据库数据中读取）
function updateMap(filteredData) {
    let geo = {
        map: currentMap,
        roam: false,
        itemStyle: { areaColor: '#2a5298', borderColor: '#ffffff' }
    }
    if (currentMap !== 'china') {
        geo = { ...geo, map:'china', center: getRandomElementAt(filteredData).coordinates.split(','), zoom: 1.5 }
    }

    mapChart.setOption({
        backgroundColor: '#1e3c72',
        geo: geo,
        series: [{
            type: 'scatter',
            coordinateSystem: 'geo',
            data: filteredData.map(item => ({
                name: item.hotelName,
                value: item.coordinates.split(',').map(Number).concat(item.supply)
            })),
            symbol: 'image://./resources/images/star.png',
            symbolSize: 16,
            animation: false
        }]
    }, {
        notMerge: true
    });
}

function getRandomElementAt(arr) {
    if (arr < 1) {
        return;
    }
    const length = arr.length;
    const randomIndex = Math.floor(Math.random() * length);
    return arr[randomIndex];
}

// 更新统计（保持不变）
function updateStats(filteredData) {
    document.getElementById('hotelCount').textContent = filteredData.length + '家';
    document.getElementById('supplyCount').textContent = filteredData.reduce((sum, item) => sum + item.supply, 0) + '台';
}

function isNumeric(str) {
    if (typeof str !== "string") return false; // 确保输入是字符串
    return !isNaN(Number(str)) && str.trim() !== "";
}

function updateChart(filteredData) {
    // 按 tv_model 统计供货数
    const sizeData = filteredData.reduce((acc, item) => {
        const size = item.model.slice(0, 2);
        if (isNumeric(size)) {
            const sizeName = size + '寸'
            acc[sizeName] = (acc[sizeName] || 0) + item.supply;
        }
        return acc
    }, {});

    // 计算总数以计算百分比
    const totalSupply = Object.values(sizeData).reduce((sum, value) => sum + value, 0);

    // 转换为 ECharts 数据格式并计算百分比
    const chartData = Object.entries(sizeData).map(([name, value]) => ({
        name,
        value,
        percent: totalSupply > 0 ? ((value / totalSupply) * 100).toFixed(1) : 0 // 计算百分比，保留2位小数
    }));

    const processedData = chartData.map(item => {
        const total = chartData.reduce((sum, d) => sum + d.value, 0);
        const percent = (item.value / total) * 100;
        return {
            ...item,
            label: {
                show: true,
                position: percent < 5 ? 'outside' : 'inside',
                formatter: '{b}({d}%)'
            }
        };
    });

    chart.clear();
    chart.setOption({
        title: { 
            text: '尺寸占比', 
            left: 'center', 
            textStyle: { fontSize: 24 } 
        },
        tooltip: {
            trigger: 'item',
            // formatter: '{a} <br/>{b} ({d}%)' // 显示名称、值和百分比
        },
        series: [{
            name: '尺寸占比',
            type: 'pie',                // 修改为饼状图
            radius: '80%',             // 饼图的半径，可以调整大小
            center: ['50%', '50%'],    // 饼图中心位置
            data: processedData,           // 数据保持不变
            labelLine: {
                show: true,            // 显示连接线（仅对外部标签生效）
                length: 18,            // 连接线第一段长度
                length2: 18            // 连接线第二段长度
            },
            itemStyle: {
                color: function(params) {
                    const colors = [
                        '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
                        '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#b5b867'
                    ];
                    return colors[params.dataIndex % colors.length];
                }
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,    // 高亮时添加阴影
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    });
}

// 更新索引信息（品牌布局和尺寸数量）
function updateIndex(filteredData) {
    const selectedBrand = document.getElementById('brandFilter').value;
    // const selectedModel = document.getElementById('modelFilter').value;

    let brandData = filteredData;
    if (selectedBrand !== '所有品牌' && selectedBrand !== '') {
        brandData = filteredData.filter(item => item.brand === selectedBrand);
    }
    const brands = [...new Set(brandData.map(item => item.brand))].join(', ');
    document.getElementById('brandIndex').textContent = brands;

    // let modelData = filteredData;
    // if (selectedModel !== '所有型号') {
    //     modelData = filteredData.filter(item => item.model === selectedModel);
    // }
    // document.getElementById('modelIndex').textContent = `${modelData.reduce((sum, item) => sum + item.supply, 0)} 台`;
}

// 更新所有视图
function updateAll(data) {
    const selectedBrand = document.getElementById('brandFilter').value;
    const selectedModel = document.getElementById('modelFilter').value;
    const selectedProvince = document.getElementById('provinceFilter').value;
    let filtered = data;

    // 按品牌和尺寸筛选
    if (selectedBrand || selectedModel || selectedProvince) {
        filtered = data.filter(item =>
            (selectedBrand === '所有品牌' || item.brand === selectedBrand) &&
            (selectedModel === '所有型号' || item.model === selectedModel) &&
            (selectedProvince == '全国' || item.province.includes(selectedProvince))
        );
    }

    if (currentMap !== 'china') {
        // 按地图层级过滤
        filtered = filtered.filter(item => chineseProvince2MapProvince(item.province) === currentMap);
    }
    
    if (filtered.length < 1) {
        alert(`暂无销售记录`);
        return
    }

    try {
        updateMap(filtered);
        updateStats(filtered);
        updateChart(filtered);
        updateIndex(filtered);
    } catch (e) {
        alert(`updateAll: ${e}`)
        throw e
    }
}

function filteredByBrand(selectedBrand) {
    let filtered = window.projectData;
    if (selectedBrand ) {
        filtered = filtered.filter(item =>
            (selectedBrand === '所有品牌' || item.brand === selectedBrand)
        );
    }

    if (currentMap !== 'china') {
        // 按地图层级过滤
        filtered = filtered.filter(item => chineseProvince2MapProvince(item.province) === currentMap);
    }

    if (filtered.length < 1) {
        alert(`暂无销售记录`);
        return
    }

    try {
        updateMap(filtered);
        updateStats(filtered);
        updateChart(filtered);
        updateIndex(filtered);
    } catch (e) {
        alert(`updateAll: ${e}`)
        throw e
    }
}
// function chineseProvince2MapProvince(p) {
//     const map_key = window.mapData.chineseProvince2MapProvince[p];
//     return map_key;
// }
function chineseProvince2MapProvince(p) {
    const key_map = p.includes('省') ? p.slice(0, -1) : p
    return key_map;;
}

function onChooseProvince() {
    const selectedProvince = document.getElementById('provinceFilter').value;
    if (selectedProvince == '全国') {
        currentMap = 'china';
    } else {
        currentMap = chineseProvince2MapProvince(selectedProvince);
    }
    updateAll(window.projectData)
}

// 点击地图切换层级（保持不变）
mapChart.on('click', params => {
    if (params.componentType === 'geo') {
        const regionName = params.name;
        currentMap = chineseProvince2MapProvince(regionName);
        if (!currentMap) {
            alert(`${regionName} 没有对应的地图`)
            return
        }
        document.getElementById('provinceFilter').value = regionName;
        updateAll(window.projectData)
    }
});

// 绑定筛选事件（保持不变）
document.getElementById('brandFilter').addEventListener('change', () => updateAll(window.projectData));
document.getElementById('modelFilter').addEventListener('change', () => updateAll(window.projectData));
document.getElementById('provinceFilter').addEventListener('change', () => onChooseProvince());
// 返回全国视图
document.getElementById('title').addEventListener('click', () => {
    currentMap = 'china';
    document.getElementById('provinceFilter').value = '全国'
    updateAll(window.projectData);
});

async function initApp() {
    const builtinFilters = await fetch('data/filters.json')
    if (!builtinFilters.ok) {
        throw new Error('failed to load filters.json');
    }
    const allFilters = await builtinFilters.json()
    initFilters(allFilters)
    await window.loadMapData (allFilters['provinces'].slice(1))

    // 初始化（预加载数据）
    loadData(data => {
        updateAll(data);
    });
}

async function initLocalApp() {
    fillBrandList(filters['brands'].slice(1))
    window.projectData = saleRecords;
    updateAll(saleRecords);
}
initLocalApp()