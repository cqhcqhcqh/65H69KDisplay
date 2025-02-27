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
            roam: true,
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

// 更新饼状图（按 tv_model 统计）
function updateChart(filteredData) {
    const modelData = filteredData.reduce((acc, item) => {
        acc[item.model] = (acc[item.model] || 0) + item.supply; // 按电视机型号统计
        return acc;
    }, {});
    chart.setOption({
        title: { text: '尺寸占比', left: 'center', textStyle: { fontSize: 24 } },
        series: [{ type: 'pie', radius: '50%', data: Object.entries(modelData).map(([name, value]) => ({ name, value })), label: { fontSize: 18 } }]
    });
}

// 更新索引信息（品牌布局和尺寸数量）
function updateIndex(filteredData) {
    const selectedBrand = document.getElementById('brandFilter').value;
    const selectedModel = document.getElementById('modelFilter').value;

    if (selectedBrand) {
        const brandData = filteredData.filter(item => item.brand === selectedBrand);
        const provinces = [...new Set(brandData.map(item => item.province))].join(', ');
        document.getElementById('brandIndex').textContent = `${brandData.length} 个项目，分布: ${provinces || '无'}`;
    } else {
        document.getElementById('brandIndex').textContent = '未选择品牌';
    }

    if (selectedModel) {
        const modelData = filteredData.filter(item => item.model === selectedModel);
        document.getElementById('modelIndex').textContent = `${modelData.reduce((sum, item) => sum + item.supply, 0)} 台`;
    } else {
        document.getElementById('modelIndex').textContent = '未选择尺寸';
    }
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
        document.getElementById('provinceFilter').value = regionName;
        if (!currentMap) {
            alert(`${regionName} 没有对应的地图`)
            return
        }
        updateAll(window.projectData)
    }
});

// 绑定筛选事件（保持不变）
document.getElementById('brandFilter').addEventListener('change', () => updateAll(window.projectData));
document.getElementById('modelFilter').addEventListener('change', () => updateAll(window.projectData));
document.getElementById('provinceFilter').addEventListener('change', () => onChooseProvince());

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

initApp()