// 初始化地图和饼状图
const mapChart = echarts.init(document.getElementById('map'));
const chart = echarts.init(document.getElementById('chart'));
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

// 更新地图（保持不变，但从数据库数据中读取）
function updateMap(filteredData) {
    mapChart.setOption({
        backgroundColor: '#1e3c72',
        geo: {
            map: currentMap,
            roam: false,
            itemStyle: { areaColor: '#2a5298', borderColor: '#ffffff' }
            // silent: true
        },
        series: [{
            type: 'scatter',
            coordinateSystem: 'geo',
            data: filteredData.slice(0, 50).map(item => ({
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

// 更新统计（保持不变）
function updateStats(filteredData) {
    document.getElementById('hotelCount').textContent = filteredData.length;
    document.getElementById('supplyCount').textContent = filteredData.reduce((sum, item) => sum + item.supply, 0);
}

function updateChart(filteredData) {
    // 按 tv_model 统计供货数
    const sizeData = filteredData.reduce((acc, item) => {
        const sizeName = item.model.slice(0, 2) + '寸'
        acc[sizeName] = (acc[sizeName] || 0) + item.supply;
        return acc;
    }, {});

    // 计算总数以计算百分比
    const totalSupply = Object.values(sizeData).reduce((sum, value) => sum + value, 0);

    // 转换为 ECharts 数据格式并计算百分比
    const chartData = Object.entries(sizeData).map(([name, value]) => ({
        name,
        value,
        percent: totalSupply > 0 ? ((value / totalSupply) * 100).toFixed(1) : 0 // 计算百分比，保留2位小数
    }));

    chart.setOption({
        title: { 
            text: '尺寸占比', 
            left: 'center', 
            textStyle: { fontSize: 24 } 
        },
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b} : {c} ({d}%)' // 工具提示显示名称、值和百分比
        },
        series: [{
            name: '尺寸占比',
            type: 'pie',                // 使用饼图
            radius: ['40%', '70%'],     // 设置为环形图，内半径40%，外半径70%
            avoidLabelOverlap: true,    // 避免标签重叠
            label: {
                show: true,             // 显示标签
                formatter: '{b}: {d}%', // 显示名称和百分比
                fontSize: 12            // 标签字体大小，适配多类别
            },
            labelLine: {
                show: true,             // 显示标签连接线
                length: 20,             // 连接线长度
                length2: 30             // 第二段连接线长度
            },
            data: chartData,           // 使用计算后的数据
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
    const selectedModel = document.getElementById('modelFilter').value;

    let brandData = filteredData;
    if (selectedBrand !== '所有品牌') {
        brandData = filteredData.filter(item => item.brand === selectedBrand);
    }
    const provinces = [...new Set(brandData.map(item => item.province))].join(', ');
    document.getElementById('brandIndex').textContent = `${brandData.length} 个项目，分布: ${provinces || '无'}`;

    let modelData = filteredData;
    if (selectedModel !== '所有型号') {
        modelData = filteredData.filter(item => item.model === selectedModel);
    }
    document.getElementById('modelIndex').textContent = `${modelData.reduce((sum, item) => sum + item.supply, 0)} 台`;
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
function chineseProvince2MapProvince(p) {
    const map_key = window.mapData.chineseProvince2MapProvince[p];
    return map_key;
}

function onChooseProvince() {
    const selectedProvince = document.getElementById('provinceFilter').value;
    currentMap = chineseProvince2MapProvince(selectedProvince);
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
document.getElementById('resetMap').addEventListener('click', () => {
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
    initFilters(filters)
    window.projectData = saleRecords;
    updateAll(saleRecords);
}
initLocalApp()